/**
 * PicnicPro API Integration Layer
 * Handles all communication with the Olamo generic backend
 * Follows the generic backend specification v2.0.0
 */

class PicnicAPI {
    constructor() {
        this.baseUrl = '/api';
        this.wsUrl = '/ws';
        this.auth = null;
        this.ws = null;
        this.collections = {
            picnics: 'picnics',
            participants: 'picnic_participants', 
            items: 'picnic_items',
            expenses: 'picnic_expenses'
        };
        this.retryAttempts = 3;
        this.retryDelay = 1000;
        this.wsReconnectAttempts = 0;
        this.maxWsReconnectAttempts = 10;
        this.wsReconnectDelay = 1000;
        this.subscriptions = new Map();
        this.eventHandlers = new Map();
    }

    /**
     * Initialize the API client with authentication
     */
    async initialize() {
        try {
            // Get authentication from Olamo platform
            this.auth = this.getAuthToken();
            
            // Initialize collections
            await this.initializeCollections();
            
            // Connect WebSocket for real-time updates
            await this.connectWebSocket();
            
            console.log('PicnicAPI initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize PicnicAPI:', error);
            throw new Error('Failed to connect to backend services');
        }
    }

    /**
     * Get authentication token from Olamo platform
     */
    getAuthToken() {
        if (window.olamoAuth && window.olamoAuth.getToken) {
            return window.olamoAuth.getToken();
        }
        
        // Fallback for development/testing
        if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
            return 'mock-jwt-token-for-development';
        }
        
        throw new Error('No authentication token available');
    }

    /**
     * Initialize required collections with schemas
     */
    async initializeCollections() {
        const collectionConfigs = [
            {
                name: this.collections.picnics,
                description: 'Picnic events and gatherings',
                schema: {
                    type: 'object',
                    properties: {
                        title: { type: 'string', required: true, maxLength: 200 },
                        description: { type: 'string', maxLength: 1000 },
                        date: { type: 'string', format: 'date', required: true },
                        time: { type: 'string', pattern: '^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$', required: true },
                        location: {
                            type: 'object',
                            properties: {
                                name: { type: 'string', maxLength: 200 },
                                address: { type: 'string', maxLength: 500 },
                                coordinates: {
                                    type: 'object',
                                    properties: {
                                        lat: { type: 'number', minimum: -90, maximum: 90 },
                                        lng: { type: 'number', minimum: -180, maximum: 180 }
                                    }
                                }
                            }
                        },
                        organizer_id: { type: 'string', required: true },
                        status: { type: 'string', enum: ['planning', 'confirmed', 'cancelled', 'completed'], default: 'planning' },
                        max_participants: { type: 'number', minimum: 1, maximum: 1000, default: 50 },
                        is_public: { type: 'boolean', default: false },
                        theme: { type: 'string', enum: ['bbq', 'family', 'sports', 'casual', 'birthday', 'company'], default: 'casual' },
                        weather_contingency: { type: 'string', maxLength: 500 },
                        contact_info: { type: 'string', maxLength: 200 }
                    }
                },
                permissions: {
                    read: ['member', 'admin'],
                    write: ['member', 'admin'],
                    delete: ['admin']
                }
            },
            {
                name: this.collections.participants,
                description: 'Picnic participants and RSVP data',
                schema: {
                    type: 'object',
                    properties: {
                        picnic_id: { type: 'string', required: true },
                        user_id: { type: 'string', required: true },
                        user_name: { type: 'string', required: true, maxLength: 100 },
                        user_email: { type: 'string', format: 'email' },
                        rsvp_status: { type: 'string', enum: ['going', 'not_going', 'maybe', 'pending'], default: 'pending' },
                        dietary_restrictions: { type: 'array', items: { type: 'string' } },
                        plus_ones: { type: 'number', minimum: 0, maximum: 10, default: 0 },
                        notes: { type: 'string', maxLength: 500 },
                        rsvp_date: { type: 'string', format: 'date-time' }
                    }
                },
                permissions: {
                    read: ['member', 'admin'],
                    write: ['member', 'admin'],
                    delete: ['admin']
                }
            },
            {
                name: this.collections.items,
                description: 'Items needed for picnics',
                schema: {
                    type: 'object',
                    properties: {
                        picnic_id: { type: 'string', required: true },
                        name: { type: 'string', required: true, maxLength: 200 },
                        category: { type: 'string', enum: ['food', 'drinks', 'tableware', 'games', 'equipment', 'other'], required: true },
                        quantity_needed: { type: 'number', minimum: 1, required: true },
                        unit: { type: 'string', maxLength: 50 },
                        assigned_to: { type: 'string' },
                        assigned_by: { type: 'string' },
                        quantity_assigned: { type: 'number', minimum: 0, default: 0 },
                        status: { type: 'string', enum: ['needed', 'assigned', 'confirmed', 'completed'], default: 'needed' },
                        estimated_cost: { type: 'number', minimum: 0 },
                        notes: { type: 'string', maxLength: 500 },
                        priority: { type: 'string', enum: ['high', 'medium', 'low'], default: 'medium' }
                    }
                },
                permissions: {
                    read: ['member', 'admin'],
                    write: ['member', 'admin'],
                    delete: ['member', 'admin']
                }
            },
            {
                name: this.collections.expenses,
                description: 'Expense tracking for picnics',
                schema: {
                    type: 'object',
                    properties: {
                        picnic_id: { type: 'string', required: true },
                        description: { type: 'string', required: true, maxLength: 200 },
                        amount: { type: 'number', minimum: 0, required: true },
                        paid_by: { type: 'string', required: true },
                        category: { type: 'string', enum: ['food', 'drinks', 'supplies', 'transportation', 'other'], default: 'other' },
                        split_type: { type: 'string', enum: ['equal', 'by_consumption', 'custom', 'organizer_pays'], default: 'equal' },
                        participants: { type: 'array', items: { type: 'string' } },
                        per_person_amount: { type: 'number', minimum: 0 },
                        payment_method: { type: 'string', enum: ['cash', 'card', 'digital', 'other'], default: 'cash' },
                        receipt_url: { type: 'string' },
                        date: { type: 'string', format: 'date-time', required: true }
                    }
                },
                permissions: {
                    read: ['member', 'admin'],
                    write: ['member', 'admin'],
                    delete: ['member', 'admin']
                }
            }
        ];

        // Create collections if they don't exist
        for (const config of collectionConfigs) {
            try {
                // Check if collection exists
                await this.getCollectionInfo(config.name);
                console.log(`Collection ${config.name} already exists`);
            } catch (error) {
                if (error.message.includes('404') || error.message.includes('not found')) {
                    // Collection doesn't exist, create it
                    await this.createCollection(config);
                    console.log(`Created collection: ${config.name}`);
                } else {
                    console.error(`Error checking collection ${config.name}:`, error);
                }
            }
        }
    }

    /**
     * Make authenticated HTTP request with retry logic
     */
    async makeRequest(endpoint, method = 'GET', data = null, retryCount = 0) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.auth}`,
                'Content-Type': 'application/json',
                'X-Miniapp-Id': 'picnic-planner'
            }
        };

        if (data && (method === 'POST' || method === 'PUT' || method === 'PATCH')) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(url, options);
            
            // Handle authentication errors
            if (response.status === 401) {
                await this.handleAuthError();
                if (retryCount < this.retryAttempts) {
                    return this.makeRequest(endpoint, method, data, retryCount + 1);
                }
            }

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
            }

            return await response.json();
        } catch (error) {
            // Retry on network errors
            if (retryCount < this.retryAttempts && (error.name === 'TypeError' || error.message.includes('fetch'))) {
                await new Promise(resolve => setTimeout(resolve, this.retryDelay * (retryCount + 1)));
                return this.makeRequest(endpoint, method, data, retryCount + 1);
            }
            throw error;
        }
    }

    /**
     * Handle authentication errors (token refresh)
     */
    async handleAuthError() {
        try {
            if (window.olamoAuth && window.olamoAuth.refreshToken) {
                this.auth = await window.olamoAuth.refreshToken();
                console.log('Token refreshed successfully');
            }
        } catch (error) {
            console.error('Failed to refresh token:', error);
            throw new Error('Authentication failed. Please login again.');
        }
    }

    // Collection Management Methods
    
    /**
     * Create a new collection
     */
    async createCollection(config) {
        return this.makeRequest('/collections', 'POST', config);
    }

    /**
     * Get collection information
     */
    async getCollectionInfo(name) {
        return this.makeRequest(`/collections/${name}`, 'GET');
    }

    /**
     * List all collections
     */
    async listCollections() {
        return this.makeRequest('/collections', 'GET');
    }

    // Picnic Management Methods

    /**
     * Create a new picnic event
     */
    async createPicnic(picnicData) {
        const data = {
            ...picnicData,
            organizer_id: this.getCurrentUserId(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        
        const response = await this.makeRequest(`/${this.collections.picnics}`, 'POST', data);
        
        // Automatically add organizer as participant
        if (response.id) {
            await this.createParticipant({
                picnic_id: response.id,
                user_id: this.getCurrentUserId(),
                user_name: this.getCurrentUserName(),
                user_email: this.getCurrentUserEmail(),
                rsvp_status: 'going',
                rsvp_date: new Date().toISOString()
            });
        }
        
        return response;
    }

    /**
     * Get picnic by ID
     */
    async getPicnic(id) {
        return this.makeRequest(`/${this.collections.picnics}/${id}`, 'GET');
    }

    /**
     * Update picnic
     */
    async updatePicnic(id, updates) {
        const data = {
            ...updates,
            updated_at: new Date().toISOString()
        };
        return this.makeRequest(`/${this.collections.picnics}/${id}`, 'PUT', data);
    }

    /**
     * Delete picnic
     */
    async deletePicnic(id) {
        // Use batch operation to delete picnic and all related data
        const operations = [
            { operation: 'delete', collection: this.collections.picnics, id },
            // Delete participants
            ...(await this.getParticipantsByPicnic(id)).map(p => ({
                operation: 'delete', collection: this.collections.participants, id: p.id
            })),
            // Delete items
            ...(await this.getItemsByPicnic(id)).map(i => ({
                operation: 'delete', collection: this.collections.items, id: i.id
            })),
            // Delete expenses
            ...(await this.getExpensesByPicnic(id)).map(e => ({
                operation: 'delete', collection: this.collections.expenses, id: e.id
            }))
        ];
        
        return this.batchOperations(operations);
    }

    /**
     * List picnics with filtering and pagination
     */
    async listPicnics(options = {}) {
        const { page = 1, limit = 20, filter, sort = 'date', order = 'asc' } = options;
        
        let endpoint = `/${this.collections.picnics}?page=${page}&limit=${limit}&sort=${sort}&order=${order}`;
        
        if (filter) {
            endpoint += `&filter=${encodeURIComponent(filter)}`;
        }
        
        return this.makeRequest(endpoint, 'GET');
    }

    /**
     * Search picnics
     */
    async searchPicnics(query, options = {}) {
        const searchData = {
            q: query,
            fields: ['title', 'description', 'location.name'],
            ...options
        };
        
        return this.makeRequest(`/${this.collections.picnics}/search`, 'POST', searchData);
    }

    // Participant Management Methods

    /**
     * Create participant/RSVP
     */
    async createParticipant(participantData) {
        const data = {
            ...participantData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        return this.makeRequest(`/${this.collections.participants}`, 'POST', data);
    }

    /**
     * Update participant RSVP
     */
    async updateParticipant(id, updates) {
        const data = {
            ...updates,
            updated_at: new Date().toISOString()
        };
        return this.makeRequest(`/${this.collections.participants}/${id}`, 'PUT', data);
    }

    /**
     * Get participants for a picnic
     */
    async getParticipantsByPicnic(picnicId) {
        const response = await this.makeRequest(
            `/${this.collections.participants}/query`, 
            'POST', 
            {
                filters: [
                    { field: 'picnic_id', operator: '==', value: picnicId }
                ]
            }
        );
        return response.results || [];
    }

    /**
     * Get participant by user and picnic
     */
    async getParticipant(picnicId, userId) {
        const response = await this.makeRequest(
            `/${this.collections.participants}/query`, 
            'POST', 
            {
                filters: [
                    { field: 'picnic_id', operator: '==', value: picnicId },
                    { field: 'user_id', operator: '==', value: userId }
                ],
                limit: 1
            }
        );
        return response.results?.[0] || null;
    }

    // Item Management Methods

    /**
     * Create picnic item
     */
    async createItem(itemData) {
        const data = {
            ...itemData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        return this.makeRequest(`/${this.collections.items}`, 'POST', data);
    }

    /**
     * Update item
     */
    async updateItem(id, updates) {
        const data = {
            ...updates,
            updated_at: new Date().toISOString()
        };
        return this.makeRequest(`/${this.collections.items}/${id}`, 'PUT', data);
    }

    /**
     * Delete item
     */
    async deleteItem(id) {
        return this.makeRequest(`/${this.collections.items}/${id}`, 'DELETE');
    }

    /**
     * Get items for a picnic
     */
    async getItemsByPicnic(picnicId) {
        const response = await this.makeRequest(
            `/${this.collections.items}/query`, 
            'POST', 
            {
                filters: [
                    { field: 'picnic_id', operator: '==', value: picnicId }
                ],
                sort: [{ field: 'priority', order: 'desc' }, { field: 'created_at', order: 'asc' }]
            }
        );
        return response.results || [];
    }

    /**
     * Assign item to user
     */
    async assignItem(itemId, userId, quantity) {
        return this.updateItem(itemId, {
            assigned_to: userId,
            assigned_by: this.getCurrentUserId(),
            quantity_assigned: quantity,
            status: 'assigned'
        });
    }

    // Expense Management Methods

    /**
     * Create expense
     */
    async createExpense(expenseData) {
        const data = {
            ...expenseData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        return this.makeRequest(`/${this.collections.expenses}`, 'POST', data);
    }

    /**
     * Update expense
     */
    async updateExpense(id, updates) {
        const data = {
            ...updates,
            updated_at: new Date().toISOString()
        };
        return this.makeRequest(`/${this.collections.expenses}/${id}`, 'PUT', data);
    }

    /**
     * Delete expense
     */
    async deleteExpense(id) {
        return this.makeRequest(`/${this.collections.expenses}/${id}`, 'DELETE');
    }

    /**
     * Get expenses for a picnic
     */
    async getExpensesByPicnic(picnicId) {
        const response = await this.makeRequest(
            `/${this.collections.expenses}/query`, 
            'POST', 
            {
                filters: [
                    { field: 'picnic_id', operator: '==', value: picnicId }
                ],
                sort: [{ field: 'date', order: 'desc' }]
            }
        );
        return response.results || [];
    }

    /**
     * Calculate expense summary for a picnic
     */
    async getExpenseSummary(picnicId) {
        const expenses = await this.getExpensesByPicnic(picnicId);
        
        const summary = {
            total: 0,
            by_category: {},
            by_payer: {},
            per_person: 0,
            participant_count: 0
        };

        // Calculate totals
        expenses.forEach(expense => {
            summary.total += expense.amount;
            
            // By category
            if (!summary.by_category[expense.category]) {
                summary.by_category[expense.category] = 0;
            }
            summary.by_category[expense.category] += expense.amount;
            
            // By payer
            if (!summary.by_payer[expense.paid_by]) {
                summary.by_payer[expense.paid_by] = 0;
            }
            summary.by_payer[expense.paid_by] += expense.amount;
        });

        // Calculate per person amount
        const participants = await this.getParticipantsByPicnic(picnicId);
        const goingParticipants = participants.filter(p => p.rsvp_status === 'going');
        summary.participant_count = goingParticipants.length;
        summary.per_person = summary.participant_count > 0 ? summary.total / summary.participant_count : 0;

        return summary;
    }

    // Batch Operations

    /**
     * Execute batch operations
     */
    async batchOperations(operations) {
        return this.makeRequest('/batch', 'POST', { operations });
    }

    // WebSocket Methods

    /**
     * Connect to WebSocket for real-time updates
     */
    async connectWebSocket() {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            return;
        }

        try {
            const wsUrl = `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}${this.wsUrl}?token=${this.auth}`;
            this.ws = new WebSocket(wsUrl);

            this.ws.onopen = () => {
                console.log('WebSocket connected');
                this.wsReconnectAttempts = 0;
                this.emit('ws:connected');
            };

            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    this.handleWebSocketMessage(message);
                } catch (error) {
                    console.error('Failed to parse WebSocket message:', error);
                }
            };

            this.ws.onclose = (event) => {
                console.log('WebSocket disconnected:', event.code, event.reason);
                this.emit('ws:disconnected');
                this.scheduleReconnect();
            };

            this.ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                this.emit('ws:error', error);
            };

        } catch (error) {
            console.error('Failed to connect WebSocket:', error);
            this.scheduleReconnect();
        }
    }

    /**
     * Handle incoming WebSocket messages
     */
    handleWebSocketMessage(message) {
        const { type, collection, data, id } = message;
        
        // Emit generic event
        this.emit(`ws:${type}`, { collection, data, id });
        
        // Emit collection-specific events
        if (collection) {
            this.emit(`ws:${collection}:${type}`, { data, id });
        }
        
        // Handle subscriptions
        this.subscriptions.forEach((callback, subscriptionKey) => {
            const [subCollection, subType] = subscriptionKey.split(':');
            if (collection === subCollection && (!subType || subType === type)) {
                callback({ type, collection, data, id });
            }
        });
    }

    /**
     * Subscribe to collection changes
     */
    subscribe(collection, callback, eventType = null) {
        const key = eventType ? `${collection}:${eventType}` : collection;
        this.subscriptions.set(key, callback);
        
        // Send subscription message
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'subscribe',
                collection,
                eventType
            }));
        }
        
        return () => this.unsubscribe(collection, eventType);
    }

    /**
     * Unsubscribe from collection changes
     */
    unsubscribe(collection, eventType = null) {
        const key = eventType ? `${collection}:${eventType}` : collection;
        this.subscriptions.delete(key);
        
        // Send unsubscription message
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify({
                type: 'unsubscribe',
                collection,
                eventType
            }));
        }
    }

    /**
     * Send WebSocket message
     */
    sendWebSocketMessage(message) {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
            this.ws.send(JSON.stringify(message));
        }
    }

    /**
     * Schedule WebSocket reconnection
     */
    scheduleReconnect() {
        if (this.wsReconnectAttempts < this.maxWsReconnectAttempts) {
            const delay = this.wsReconnectDelay * Math.pow(2, this.wsReconnectAttempts);
            setTimeout(() => {
                this.wsReconnectAttempts++;
                this.connectWebSocket();
            }, delay);
        }
    }

    // Event Emitter Methods

    /**
     * Add event listener
     */
    on(event, callback) {
        if (!this.eventHandlers.has(event)) {
            this.eventHandlers.set(event, new Set());
        }
        this.eventHandlers.get(event).add(callback);
    }

    /**
     * Remove event listener
     */
    off(event, callback) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).delete(callback);
        }
    }

    /**
     * Emit event
     */
    emit(event, data) {
        if (this.eventHandlers.has(event)) {
            this.eventHandlers.get(event).forEach(callback => {
                try {
                    callback(data);
                } catch (error) {
                    console.error(`Error in event handler for ${event}:`, error);
                }
            });
        }
    }

    // Utility Methods

    /**
     * Get current user ID
     */
    getCurrentUserId() {
        if (window.olamoAuth && window.olamoAuth.getUserInfo) {
            const userInfo = window.olamoAuth.getUserInfo();
            return userInfo?.user_id || userInfo?.uid || 'mock-user-id';
        }
        return 'mock-user-id';
    }

    /**
     * Get current user name
     */
    getCurrentUserName() {
        if (window.olamoAuth && window.olamoAuth.getUserInfo) {
            const userInfo = window.olamoAuth.getUserInfo();
            return userInfo?.displayName || userInfo?.name || 'Test User';
        }
        return 'Test User';
    }

    /**
     * Get current user email
     */
    getCurrentUserEmail() {
        if (window.olamoAuth && window.olamoAuth.getUserInfo) {
            const userInfo = window.olamoAuth.getUserInfo();
            return userInfo?.email || 'test@example.com';
        }
        return 'test@example.com';
    }

    /**
     * Check if user has permission
     */
    hasPermission(permission) {
        if (window.olamoAuth && window.olamoAuth.hasPermission) {
            return window.olamoAuth.hasPermission(permission);
        }
        return true; // Default to true for development
    }

    /**
     * Cleanup resources
     */
    destroy() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        this.subscriptions.clear();
        this.eventHandlers.clear();
    }
}

// Create global API instance
window.picnicAPI = new PicnicAPI();