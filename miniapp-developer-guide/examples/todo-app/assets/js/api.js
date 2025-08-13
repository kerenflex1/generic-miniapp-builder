/**
 * Olamo API Integration for Todo App
 * Handles all communication with the generic backend
 */

class TodoAPI {
    constructor() {
        this.baseUrl = '/api';
        this.collectionName = 'todos';
        this.token = null;
        this.init();
    }

    /**
     * Initialize the API client
     */
    async init() {
        try {
            // Get authentication token from Olamo platform
            this.token = window.olamoAuth?.getToken() || this.getMockToken();
            
            // Initialize the todos collection if it doesn't exist
            await this.initializeCollection();
        } catch (error) {
            console.error('Failed to initialize API:', error);
            throw new Error('Failed to connect to Olamo backend');
        }
    }

    /**
     * Get mock token for development/testing
     */
    getMockToken() {
        if (window.location.hostname === 'localhost') {
            return 'mock-jwt-token-for-development';
        }
        throw new Error('No authentication token available');
    }

    /**
     * Create the todos collection if it doesn't exist
     */
    async initializeCollection() {
        try {
            // Try to get the collection first
            await this.makeRequest(`/collections/${this.collectionName}`, 'GET');
        } catch (error) {
            if (error.message.includes('404')) {
                // Collection doesn't exist, create it
                await this.createCollection();
            } else {
                throw error;
            }
        }
    }

    /**
     * Create the todos collection with proper schema
     */
    async createCollection() {
        const collectionConfig = {
            name: this.collectionName,
            description: 'Todo items for task management',
            schema: {
                type: 'object',
                properties: {
                    title: {
                        type: 'string',
                        required: true,
                        minLength: 1,
                        maxLength: 200
                    },
                    completed: {
                        type: 'boolean',
                        default: false
                    },
                    created_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    updated_at: {
                        type: 'string',
                        format: 'date-time'
                    },
                    priority: {
                        type: 'string',
                        enum: ['low', 'medium', 'high'],
                        default: 'medium'
                    }
                }
            },
            permissions: {
                read: ['user'],
                write: ['user'],
                delete: ['user']
            }
        };

        return this.makeRequest('/collections', 'POST', collectionConfig);
    }

    /**
     * Make authenticated request to the API
     */
    async makeRequest(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.token}`,
                'Content-Type': 'application/json'
            }
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        return response.json();
    }

    /**
     * Get all todos
     */
    async getTodos() {
        const response = await this.makeRequest(`/collections/${this.collectionName}/documents`);
        return response.documents || [];
    }

    /**
     * Create a new todo
     */
    async createTodo(title, priority = 'medium') {
        const todo = {
            title: title.trim(),
            completed: false,
            priority,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const response = await this.makeRequest(
            `/collections/${this.collectionName}/documents`,
            'POST',
            todo
        );

        return response.document;
    }

    /**
     * Update an existing todo
     */
    async updateTodo(id, updates) {
        const updateData = {
            ...updates,
            updated_at: new Date().toISOString()
        };

        const response = await this.makeRequest(
            `/collections/${this.collectionName}/documents/${id}`,
            'PUT',
            updateData
        );

        return response.document;
    }

    /**
     * Toggle todo completion status
     */
    async toggleTodo(id, completed) {
        return this.updateTodo(id, { completed });
    }

    /**
     * Delete a todo
     */
    async deleteTodo(id) {
        await this.makeRequest(
            `/collections/${this.collectionName}/documents/${id}`,
            'DELETE'
        );
    }

    /**
     * Get todo statistics
     */
    async getTodoStats() {
        const todos = await this.getTodos();
        
        return {
            total: todos.length,
            completed: todos.filter(todo => todo.completed).length,
            pending: todos.filter(todo => !todo.completed).length
        };
    }

    /**
     * Search todos by title
     */
    async searchTodos(query) {
        const response = await this.makeRequest(
            `/collections/${this.collectionName}/search`,
            'POST',
            {
                query: {
                    title: {
                        operator: 'contains',
                        value: query
                    }
                }
            }
        );

        return response.documents || [];
    }

    /**
     * Get filtered todos
     */
    async getFilteredTodos(filter) {
        const todos = await this.getTodos();
        
        switch (filter) {
            case 'completed':
                return todos.filter(todo => todo.completed);
            case 'pending':
                return todos.filter(todo => !todo.completed);
            case 'all':
            default:
                return todos;
        }
    }
}

// Create global API instance
window.todoAPI = new TodoAPI();