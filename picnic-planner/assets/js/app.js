/**
 * PicnicPro - Main Application Logic
 * Manages UI interactions, state, and real-time collaboration
 */

class PicnicApp {
    constructor() {
        this.currentView = 'dashboard';
        this.currentPicnic = null;
        this.currentUser = null;
        this.picnics = [];
        this.participants = [];
        this.items = [];
        this.expenses = [];
        this.filters = {
            search: '',
            status: 'all'
        };
        this.theme = localStorage.getItem('picnic-theme') || 'auto';
        this.notifications = [];
        this.api = window.picnicAPI;
        this.isLoading = false;
        this.retryAttempts = 3;
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            this.showLoading('Initializing PicnicPro...');
            
            // Initialize API
            await this.api.initialize();
            
            // Get current user info
            this.currentUser = {
                id: this.api.getCurrentUserId(),
                name: this.api.getCurrentUserName(),
                email: this.api.getCurrentUserEmail()
            };
            
            // Setup theme
            this.initializeTheme();
            
            // Setup event listeners
            this.setupEventListeners();
            
            // Setup real-time collaboration
            this.setupRealTimeFeatures();
            
            // Load initial data
            await this.loadDashboardData();
            
            // Update UI
            this.updateUserProfile();
            this.hideLoading();
            
            console.log('PicnicApp initialized successfully');
            this.showToast('Welcome to PicnicPro!', 'success');
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.hideLoading();
            this.showToast('Failed to initialize app. Please refresh and try again.', 'error');
        }
    }

    /**
     * Setup theme handling
     */
    initializeTheme() {
        const applyTheme = (theme) => {
            if (theme === 'auto') {
                const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
                document.documentElement.setAttribute('data-theme', mediaQuery.matches ? 'dark' : 'light');
                
                mediaQuery.addEventListener('change', (e) => {
                    if (this.theme === 'auto') {
                        document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
                    }
                });
            } else {
                document.documentElement.setAttribute('data-theme', theme);
            }
        };

        applyTheme(this.theme);
    }

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Navigation
        document.getElementById('bottomNav').addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem) {
                const view = navItem.dataset.view;
                this.switchView(view);
            }
        });

        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Search and filter
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.filters.search = e.target.value;
            this.debounce(() => this.filterPicnics(), 500);
        });

        document.getElementById('filterSelect').addEventListener('change', (e) => {
            this.filters.status = e.target.value;
            this.filterPicnics();
        });

        // Form submissions
        document.getElementById('createForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.createPicnic();
        });

        document.getElementById('rsvpForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.submitRSVP();
        });

        document.getElementById('addItemForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addItem();
        });

        // Modal close on backdrop click
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target.id);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
            if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.switchView('create');
            }
        });

        // Handle online/offline
        window.addEventListener('online', () => {
            this.showToast('Back online! Syncing data...', 'success');
            this.loadDashboardData();
        });

        window.addEventListener('offline', () => {
            this.showToast('You are offline. Some features may be limited.', 'warning');
        });
    }

    /**
     * Setup real-time collaboration features
     */
    setupRealTimeFeatures() {
        // Subscribe to picnic updates
        this.api.subscribe(this.api.collections.picnics, (event) => {
            this.handlePicnicUpdate(event);
        });

        // Subscribe to participant updates
        this.api.subscribe(this.api.collections.participants, (event) => {
            this.handleParticipantUpdate(event);
        });

        // Subscribe to item updates
        this.api.subscribe(this.api.collections.items, (event) => {
            this.handleItemUpdate(event);
        });

        // Subscribe to expense updates
        this.api.subscribe(this.api.collections.expenses, (event) => {
            this.handleExpenseUpdate(event);
        });

        // Handle WebSocket connection events
        this.api.on('ws:connected', () => {
            this.showToast('Real-time collaboration enabled', 'info');
        });

        this.api.on('ws:disconnected', () => {
            this.showToast('Real-time features temporarily unavailable', 'warning');
        });
    }

    /**
     * Handle real-time picnic updates
     */
    handlePicnicUpdate(event) {
        const { type, data, id } = event;
        
        switch (type) {
            case 'document_created':
                this.picnics.unshift(data);
                this.updateDashboard();
                if (data.organizer_id !== this.currentUser.id) {
                    this.showToast(`New picnic created: ${data.title}`, 'info');
                }
                break;
                
            case 'document_updated':
                const picnicIndex = this.picnics.findIndex(p => p.id === id);
                if (picnicIndex !== -1) {
                    this.picnics[picnicIndex] = { ...this.picnics[picnicIndex], ...data };
                    this.updateDashboard();
                    if (this.currentPicnic && this.currentPicnic.id === id) {
                        this.currentPicnic = this.picnics[picnicIndex];
                        this.updatePicnicDetail();
                    }
                }
                break;
                
            case 'document_deleted':
                this.picnics = this.picnics.filter(p => p.id !== id);
                this.updateDashboard();
                if (this.currentPicnic && this.currentPicnic.id === id) {
                    this.switchView('dashboard');
                    this.showToast('This picnic has been deleted', 'info');
                }
                break;
        }
    }

    /**
     * Handle real-time participant updates
     */
    handleParticipantUpdate(event) {
        const { type, data, id } = event;
        
        switch (type) {
            case 'document_created':
                this.participants.push(data);
                if (this.currentPicnic && data.picnic_id === this.currentPicnic.id) {
                    this.updateParticipantsList();
                    if (data.user_id !== this.currentUser.id) {
                        this.showToast(`${data.user_name} joined the picnic!`, 'success');
                    }
                }
                break;
                
            case 'document_updated':
                const participantIndex = this.participants.findIndex(p => p.id === id);
                if (participantIndex !== -1) {
                    this.participants[participantIndex] = { ...this.participants[participantIndex], ...data };
                    if (this.currentPicnic && data.picnic_id === this.currentPicnic.id) {
                        this.updateParticipantsList();
                    }
                }
                break;
        }
    }

    /**
     * Handle real-time item updates
     */
    handleItemUpdate(event) {
        const { type, data, id } = event;
        
        switch (type) {
            case 'document_created':
                this.items.push(data);
                if (this.currentPicnic && data.picnic_id === this.currentPicnic.id) {
                    this.updateItemsList();
                }
                break;
                
            case 'document_updated':
                const itemIndex = this.items.findIndex(i => i.id === id);
                if (itemIndex !== -1) {
                    this.items[itemIndex] = { ...this.items[itemIndex], ...data };
                    if (this.currentPicnic && data.picnic_id === this.currentPicnic.id) {
                        this.updateItemsList();
                        if (data.assigned_to && data.assigned_to !== this.currentUser.id) {
                            this.showToast(`${data.name} was assigned to someone!`, 'info');
                        }
                    }
                }
                break;
        }
    }

    /**
     * Handle real-time expense updates
     */
    handleExpenseUpdate(event) {
        const { type, data, id } = event;
        
        switch (type) {
            case 'document_created':
                this.expenses.push(data);
                if (this.currentPicnic && data.picnic_id === this.currentPicnic.id) {
                    this.updateExpensesList();
                    if (data.paid_by !== this.currentUser.id) {
                        this.showToast(`New expense added: ${data.description}`, 'info');
                    }
                }
                break;
                
            case 'document_updated':
                const expenseIndex = this.expenses.findIndex(e => e.id === id);
                if (expenseIndex !== -1) {
                    this.expenses[expenseIndex] = { ...this.expenses[expenseIndex], ...data };
                    if (this.currentPicnic && data.picnic_id === this.currentPicnic.id) {
                        this.updateExpensesList();
                    }
                }
                break;
        }
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        try {
            this.showLoading('Loading your picnics...');
            
            // Load picnics
            const picnicsResponse = await this.api.listPicnics({ limit: 50 });
            this.picnics = picnicsResponse.documents || [];
            
            // Update dashboard
            this.updateDashboard();
            this.updateStats();
            
        } catch (error) {
            console.error('Failed to load dashboard data:', error);
            this.showToast('Failed to load picnics. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Update dashboard view
     */
    updateDashboard() {
        const picnicGrid = document.getElementById('picnicGrid');
        const emptyState = document.getElementById('emptyState');
        
        if (this.picnics.length === 0) {
            picnicGrid.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            picnicGrid.style.display = 'grid';
            emptyState.style.display = 'none';
            
            // Filter picnics
            const filteredPicnics = this.getFilteredPicnics();
            
            // Render picnic cards
            picnicGrid.innerHTML = '';
            filteredPicnics.forEach(picnic => {
                const cardElement = this.createPicnicCard(picnic);
                picnicGrid.appendChild(cardElement);
            });
        }
    }

    /**
     * Get filtered picnics based on current filters
     */
    getFilteredPicnics() {
        let filtered = [...this.picnics];
        
        // Search filter
        if (this.filters.search) {
            const search = this.filters.search.toLowerCase();
            filtered = filtered.filter(picnic => 
                picnic.title.toLowerCase().includes(search) ||
                picnic.description.toLowerCase().includes(search) ||
                picnic.location?.name?.toLowerCase().includes(search)
            );
        }
        
        // Status filter
        if (this.filters.status !== 'all') {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            
            switch (this.filters.status) {
                case 'upcoming':
                    filtered = filtered.filter(picnic => picnic.date >= today);
                    break;
                case 'planning':
                    filtered = filtered.filter(picnic => picnic.status === 'planning');
                    break;
                case 'past':
                    filtered = filtered.filter(picnic => picnic.date < today);
                    break;
            }
        }
        
        // Sort by date
        filtered.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        return filtered;
    }

    /**
     * Create picnic card element
     */
    createPicnicCard(picnic) {
        const template = document.getElementById('picnicCardTemplate');
        const card = template.content.cloneNode(true);
        
        // Set data attributes
        const cardElement = card.querySelector('.picnic-card');
        cardElement.dataset.id = picnic.id;
        
        // Theme icon
        const themeIcons = {
            bbq: '🔥',
            family: '👨‍👩‍👧‍👦',
            sports: '⚽',
            casual: '🧺',
            birthday: '🎂',
            company: '🏢'
        };
        card.querySelector('.card-theme-icon').textContent = themeIcons[picnic.theme] || '🧺';
        
        // Date
        const date = new Date(picnic.date);
        card.querySelector('.date-day').textContent = date.getDate();
        card.querySelector('.date-month').textContent = date.toLocaleDateString('en', { month: 'short' });
        
        // Content
        card.querySelector('.card-title').textContent = picnic.title;
        card.querySelector('.card-description').textContent = picnic.description || 'No description';
        card.querySelector('.location-text').textContent = picnic.location?.name || 'Location TBD';
        
        // Stats (placeholder for now)
        const stats = card.querySelectorAll('.stat-text');
        stats[0].textContent = '0'; // participants
        stats[1].textContent = '0'; // items
        stats[2].textContent = '$0'; // expenses
        
        return card;
    }

    /**
     * Update stats in dashboard
     */
    async updateStats() {
        try {
            const now = new Date();
            const today = now.toISOString().split('T')[0];
            
            // Count upcoming picnics
            const upcomingCount = this.picnics.filter(p => p.date >= today).length;
            document.getElementById('upcomingCount').textContent = upcomingCount;
            
            // Get total participants and expenses (simplified for now)
            document.getElementById('participantCount').textContent = '0';
            document.getElementById('expenseTotal').textContent = '$0';
            
        } catch (error) {
            console.error('Failed to update stats:', error);
        }
    }

    /**
     * Switch between views
     */
    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.toggle('active', item.dataset.view === viewName);
        });
        
        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.toggle('active', view.id === `${viewName}View`);
        });
        
        this.currentView = viewName;
        
        // Load view-specific data
        switch (viewName) {
            case 'create':
                this.initializeCreateForm();
                break;
            case 'my-events':
                this.loadMyEvents();
                break;
            case 'expenses':
                this.loadExpenses();
                break;
        }
    }

    /**
     * Initialize create form
     */
    initializeCreateForm() {
        const form = document.getElementById('createForm');
        form.reset();
        
        // Set default date to tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        document.getElementById('picnicDate').value = tomorrow.toISOString().split('T')[0];
        
        // Set default time
        document.getElementById('picnicTime').value = '12:00';
    }

    /**
     * Create new picnic
     */
    async createPicnic() {
        try {
            this.showLoading('Creating your picnic...');
            
            const formData = new FormData(document.getElementById('createForm'));
            const picnicData = {
                title: formData.get('title'),
                description: formData.get('description'),
                date: formData.get('date'),
                time: formData.get('time'),
                location: {
                    name: formData.get('locationName'),
                    address: formData.get('locationAddress')
                },
                theme: formData.get('theme'),
                max_participants: parseInt(formData.get('maxParticipants')),
                is_public: formData.get('isPublic') === 'true',
                weather_contingency: formData.get('weatherContingency'),
                status: 'planning'
            };
            
            const result = await this.api.createPicnic(picnicData);
            
            this.showToast('Picnic created successfully!', 'success');
            this.switchView('dashboard');
            await this.loadDashboardData();
            
        } catch (error) {
            console.error('Failed to create picnic:', error);
            this.showToast('Failed to create picnic. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * View picnic details
     */
    async viewPicnic(button) {
        try {
            const card = button.closest('.picnic-card');
            const picnicId = card.dataset.id;
            
            this.showLoading('Loading picnic details...');
            
            // Load picnic data
            this.currentPicnic = await this.api.getPicnic(picnicId);
            this.participants = await this.api.getParticipantsByPicnic(picnicId);
            this.items = await this.api.getItemsByPicnic(picnicId);
            this.expenses = await this.api.getExpensesByPicnic(picnicId);
            
            // Render picnic detail
            this.renderPicnicDetail();
            this.switchView('picnic-detail');
            
        } catch (error) {
            console.error('Failed to load picnic:', error);
            this.showToast('Failed to load picnic details.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Render picnic detail view
     */
    renderPicnicDetail() {
        const content = document.getElementById('picnicDetailContent');
        
        const themeIcons = {
            bbq: '🔥',
            family: '👨‍👩‍👧‍👦',
            sports: '⚽',
            casual: '🧺',
            birthday: '🎂',
            company: '🏢'
        };
        
        const date = new Date(this.currentPicnic.date + 'T' + this.currentPicnic.time);
        
        content.innerHTML = `
            <div class="picnic-detail-header">
                <div class="detail-theme-icon">${themeIcons[this.currentPicnic.theme] || '🧺'}</div>
                <div class="detail-info">
                    <h1>${this.currentPicnic.title}</h1>
                    <p class="detail-description">${this.currentPicnic.description || 'No description'}</p>
                    <div class="detail-meta">
                        <div class="meta-item">
                            <span class="meta-icon">📅</span>
                            <span>${date.toLocaleDateString('en', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-icon">⏰</span>
                            <span>${date.toLocaleTimeString('en', { hour: 'numeric', minute: '2-digit' })}</span>
                        </div>
                        <div class="meta-item">
                            <span class="meta-icon">📍</span>
                            <span>${this.currentPicnic.location?.name || 'Location TBD'}</span>
                        </div>
                    </div>
                </div>
                <div class="detail-actions">
                    <button class="btn btn-primary" onclick="app.openRsvpModal()">RSVP</button>
                </div>
            </div>
            
            <div class="detail-sections">
                <div class="detail-section">
                    <h3>👥 Participants (<span id="participantCount">${this.participants.length}</span>)</h3>
                    <div id="participantsList" class="participants-list"></div>
                </div>
                
                <div class="detail-section">
                    <div class="section-header">
                        <h3>📋 Items Needed (<span id="itemsCount">${this.items.length}</span>)</h3>
                        <button class="btn btn-sm btn-primary" onclick="app.openAddItemModal()">Add Item</button>
                    </div>
                    <div id="itemsList" class="items-list"></div>
                </div>
                
                <div class="detail-section">
                    <div class="section-header">
                        <h3>💰 Expenses (<span id="expensesCount">${this.expenses.length}</span>)</h3>
                        <button class="btn btn-sm btn-secondary" onclick="app.openAddExpenseModal()">Add Expense</button>
                    </div>
                    <div id="expensesList" class="expenses-list"></div>
                </div>
            </div>
        `;
        
        this.updateParticipantsList();
        this.updateItemsList();
        this.updateExpensesList();
    }

    /**
     * Update participants list
     */
    updateParticipantsList() {
        const list = document.getElementById('participantsList');
        if (!list) return;
        
        const going = this.participants.filter(p => p.rsvp_status === 'going');
        const maybe = this.participants.filter(p => p.rsvp_status === 'maybe');
        const notGoing = this.participants.filter(p => p.rsvp_status === 'not_going');
        
        list.innerHTML = `
            <div class="participants-section">
                <h4>✅ Going (${going.length})</h4>
                <div class="participants-grid">
                    ${going.map(p => `
                        <div class="participant-card">
                            <div class="participant-avatar">${p.user_name.charAt(0)}</div>
                            <div class="participant-info">
                                <div class="participant-name">${p.user_name}</div>
                                ${p.plus_ones > 0 ? `<div class="participant-plus">+${p.plus_ones}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            ${maybe.length > 0 ? `
                <div class="participants-section">
                    <h4>❓ Maybe (${maybe.length})</h4>
                    <div class="participants-grid">
                        ${maybe.map(p => `
                            <div class="participant-card">
                                <div class="participant-avatar">${p.user_name.charAt(0)}</div>
                                <div class="participant-info">
                                    <div class="participant-name">${p.user_name}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            ` : ''}
        `;
    }

    /**
     * Update items list
     */
    updateItemsList() {
        const list = document.getElementById('itemsList');
        if (!list) return;
        
        const categories = {
            food: { icon: '🍔', name: 'Food' },
            drinks: { icon: '🥤', name: 'Drinks' },
            tableware: { icon: '🍽️', name: 'Tableware' },
            games: { icon: '🎲', name: 'Games & Entertainment' },
            equipment: { icon: '🏕️', name: 'Equipment' },
            other: { icon: '📦', name: 'Other' }
        };
        
        const itemsByCategory = {};
        this.items.forEach(item => {
            if (!itemsByCategory[item.category]) {
                itemsByCategory[item.category] = [];
            }
            itemsByCategory[item.category].push(item);
        });
        
        list.innerHTML = Object.entries(itemsByCategory).map(([category, items]) => `
            <div class="items-category">
                <h4>${categories[category].icon} ${categories[category].name}</h4>
                <div class="items-grid">
                    ${items.map(item => `
                        <div class="item-card" data-id="${item.id}">
                            <div class="item-header">
                                <div class="item-priority ${item.priority}"></div>
                            </div>
                            <div class="item-content">
                                <h5>${item.name}</h5>
                                <div class="item-quantity">
                                    <span class="quantity-needed">${item.quantity_assigned}</span> / 
                                    <span class="quantity-assigned">${item.quantity_needed}</span> ${item.unit || ''}
                                </div>
                                ${item.assigned_to ? `
                                    <div class="item-assignee">Assigned to: ${this.getParticipantName(item.assigned_to)}</div>
                                ` : `
                                    <div class="item-assignee">Not assigned</div>
                                `}
                            </div>
                            <div class="item-actions">
                                ${!item.assigned_to || item.quantity_assigned < item.quantity_needed ? `
                                    <button class="btn btn-sm btn-primary" onclick="app.assignToMe('${item.id}')">
                                        ${item.assigned_to ? 'Help with this' : 'I\'ll bring this'}
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
    }

    /**
     * Update expenses list
     */
    updateExpensesList() {
        const list = document.getElementById('expensesList');
        if (!list) return;
        
        if (this.expenses.length === 0) {
            list.innerHTML = `
                <div class="empty-expenses">
                    <p>No expenses yet. Start by adding receipts and costs!</p>
                </div>
            `;
            return;
        }
        
        const total = this.expenses.reduce((sum, exp) => sum + exp.amount, 0);
        
        list.innerHTML = `
            <div class="expenses-summary">
                <div class="expense-total">Total: $${total.toFixed(2)}</div>
                <div class="expense-per-person">Per person: $${(total / Math.max(this.participants.filter(p => p.rsvp_status === 'going').length, 1)).toFixed(2)}</div>
            </div>
            
            <div class="expenses-list">
                ${this.expenses.map(expense => `
                    <div class="expense-item">
                        <div class="expense-info">
                            <div class="expense-description">${expense.description}</div>
                            <div class="expense-meta">
                                Paid by ${this.getParticipantName(expense.paid_by)} • ${new Date(expense.date).toLocaleDateString()}
                            </div>
                        </div>
                        <div class="expense-amount">$${expense.amount.toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    /**
     * Get participant name by ID
     */
    getParticipantName(userId) {
        const participant = this.participants.find(p => p.user_id === userId);
        return participant ? participant.user_name : 'Unknown';
    }

    /**
     * Open RSVP modal
     */
    openRsvpModal() {
        // Check if user already RSVP'd
        const existingRsvp = this.participants.find(p => p.user_id === this.currentUser.id);
        
        if (existingRsvp) {
            // Pre-fill form with existing RSVP
            document.querySelector(`input[name="rsvp"][value="${existingRsvp.rsvp_status}"]`).checked = true;
            document.getElementById('plusOnes').value = existingRsvp.plus_ones || 0;
            document.getElementById('rsvpNotes').value = existingRsvp.notes || '';
            
            // Check dietary restrictions
            const restrictions = existingRsvp.dietary_restrictions || [];
            restrictions.forEach(restriction => {
                const checkbox = document.querySelector(`input[type="checkbox"][value="${restriction}"]`);
                if (checkbox) checkbox.checked = true;
            });
        }
        
        this.openModal('rsvpModal');
    }

    /**
     * Submit RSVP
     */
    async submitRSVP() {
        try {
            this.showLoading('Saving your RSVP...');
            
            const formData = new FormData(document.getElementById('rsvpForm'));
            const rsvpStatus = formData.get('rsvp');
            const plusOnes = parseInt(formData.get('plusOnes')) || 0;
            const notes = formData.get('notes');
            
            // Get dietary restrictions
            const dietaryRestrictions = Array.from(
                document.querySelectorAll('input[type="checkbox"][value]:checked')
            ).map(cb => cb.value);
            
            const rsvpData = {
                picnic_id: this.currentPicnic.id,
                user_id: this.currentUser.id,
                user_name: this.currentUser.name,
                user_email: this.currentUser.email,
                rsvp_status: rsvpStatus,
                dietary_restrictions: dietaryRestrictions,
                plus_ones: plusOnes,
                notes: notes,
                rsvp_date: new Date().toISOString()
            };
            
            // Check if existing RSVP
            const existingRsvp = this.participants.find(p => p.user_id === this.currentUser.id);
            
            if (existingRsvp) {
                await this.api.updateParticipant(existingRsvp.id, rsvpData);
            } else {
                await this.api.createParticipant(rsvpData);
            }
            
            this.closeModal('rsvpModal');
            this.showToast('RSVP saved successfully!', 'success');
            
            // Reload participants
            this.participants = await this.api.getParticipantsByPicnic(this.currentPicnic.id);
            this.updateParticipantsList();
            
        } catch (error) {
            console.error('Failed to save RSVP:', error);
            this.showToast('Failed to save RSVP. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Open add item modal
     */
    openAddItemModal() {
        document.getElementById('addItemForm').reset();
        this.openModal('addItemModal');
    }

    /**
     * Add new item
     */
    async addItem() {
        try {
            this.showLoading('Adding item...');
            
            const formData = new FormData(document.getElementById('addItemForm'));
            const itemData = {
                picnic_id: this.currentPicnic.id,
                name: formData.get('name'),
                category: formData.get('category'),
                quantity_needed: parseInt(formData.get('quantity')),
                unit: formData.get('unit'),
                priority: formData.get('priority'),
                estimated_cost: parseFloat(formData.get('estimatedCost')) || 0,
                notes: formData.get('notes')
            };
            
            await this.api.createItem(itemData);
            
            this.closeModal('addItemModal');
            this.showToast('Item added successfully!', 'success');
            
            // Reload items
            this.items = await this.api.getItemsByPicnic(this.currentPicnic.id);
            this.updateItemsList();
            
        } catch (error) {
            console.error('Failed to add item:', error);
            this.showToast('Failed to add item. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    /**
     * Assign item to current user
     */
    async assignToMe(itemId) {
        try {
            const item = this.items.find(i => i.id === itemId);
            if (!item) return;
            
            const remainingQuantity = item.quantity_needed - (item.quantity_assigned || 0);
            const quantityToAssign = remainingQuantity;
            
            await this.api.assignItem(itemId, this.currentUser.id, quantityToAssign);
            
            this.showToast(`You've been assigned "${item.name}"!`, 'success');
            
            // Reload items
            this.items = await this.api.getItemsByPicnic(this.currentPicnic.id);
            this.updateItemsList();
            
        } catch (error) {
            console.error('Failed to assign item:', error);
            this.showToast('Failed to assign item. Please try again.', 'error');
        }
    }

    /**
     * Filter picnics based on current filters
     */
    filterPicnics() {
        this.updateDashboard();
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const themes = ['light', 'dark', 'auto'];
        const currentIndex = themes.indexOf(this.theme);
        this.theme = themes[(currentIndex + 1) % themes.length];
        
        localStorage.setItem('picnic-theme', this.theme);
        this.initializeTheme();
        
        this.showToast(`Theme switched to ${this.theme}`, 'info');
    }

    /**
     * Update user profile display
     */
    updateUserProfile() {
        document.getElementById('userName').textContent = this.currentUser.name;
    }

    /**
     * Load my events
     */
    async loadMyEvents() {
        // Implementation for my events view
        console.log('Loading my events...');
    }

    /**
     * Load expenses
     */
    async loadExpenses() {
        // Implementation for expenses view
        console.log('Loading expenses...');
    }

    // Utility Methods

    /**
     * Show loading overlay
     */
    showLoading(message = 'Loading...') {
        const overlay = document.getElementById('loadingOverlay');
        overlay.querySelector('p').textContent = message;
        overlay.classList.add('show');
        this.isLoading = true;
    }

    /**
     * Hide loading overlay
     */
    hideLoading() {
        document.getElementById('loadingOverlay').classList.remove('show');
        this.isLoading = false;
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 4000) {
        const container = document.getElementById('toastContainer');
        const toast = document.createElement('div');
        const toastId = 'toast-' + Date.now();
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        toast.className = `toast ${type}`;
        toast.id = toastId;
        toast.innerHTML = `
            <div class="toast-icon">${icons[type] || 'ℹ️'}</div>
            <div class="toast-content">
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close" onclick="app.closeToast('${toastId}')">&times;</button>
        `;
        
        container.appendChild(toast);
        
        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);
        
        // Auto-hide toast
        setTimeout(() => {
            this.closeToast(toastId);
        }, duration);
    }

    /**
     * Close toast
     */
    closeToast(toastId) {
        const toast = document.getElementById(toastId);
        if (toast) {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }
    }

    /**
     * Open modal
     */
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }

    /**
     * Close all modals
     */
    closeAllModals() {
        document.querySelectorAll('.modal.show').forEach(modal => {
            modal.classList.remove('show');
        });
        document.body.style.overflow = '';
    }

    /**
     * Debounce function calls
     */
    debounce(func, wait) {
        clearTimeout(this.debounceTimer);
        this.debounceTimer = setTimeout(func, wait);
    }

    /**
     * Cleanup when app is destroyed
     */
    destroy() {
        if (this.api) {
            this.api.destroy();
        }
    }
}

// Global functions for HTML event handlers
window.app = null;

window.switchView = (view) => window.app?.switchView(view);
window.viewPicnic = (button) => window.app?.viewPicnic(button);
window.openRsvpModal = (button) => {
    if (button) {
        const card = button.closest('.picnic-card');
        const picnicId = card.dataset.id;
        // Set current picnic for RSVP
        window.app.currentPicnic = window.app.picnics.find(p => p.id === picnicId);
    }
    window.app?.openRsvpModal();
};
window.closeModal = (modalId) => window.app?.closeModal(modalId);
window.hideError = () => {
    document.getElementById('errorMessage').style.display = 'none';
};

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    try {
        window.app = new PicnicApp();
        await window.app.initialize();
    } catch (error) {
        console.error('Failed to initialize PicnicApp:', error);
        document.body.innerHTML = `
            <div style="padding: 2rem; text-align: center; color: #E74C3C;">
                <h2>Failed to load PicnicPro</h2>
                <p>Please refresh the page and try again.</p>
                <button onclick="location.reload()" style="padding: 0.5rem 1rem; margin-top: 1rem;">Refresh</button>
            </div>
        `;
    }
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.app) {
        window.app.destroy();
    }
});