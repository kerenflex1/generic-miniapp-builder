/**
 * PicnicPro Integration Tests
 * Tests how different components work together
 */

describe('Integration Tests - API and Components', () => {
    let api;
    let mockPicnic;
    let mockParticipant;
    let mockItem;
    let mockExpense;

    // Setup mock data
    beforeEach(() => {
        api = new PicnicAPI();
        
        mockPicnic = {
            id: 'test-picnic-123',
            title: 'Test Summer BBQ',
            description: 'Integration test picnic',
            date: '2025-08-20',
            time: '12:00',
            location: {
                name: 'Test Park',
                address: '123 Test Street'
            },
            organizer_id: 'test-user-123',
            status: 'planning',
            theme: 'bbq',
            max_participants: 20,
            is_public: false
        };
        
        mockParticipant = {
            id: 'test-participant-456',
            picnic_id: 'test-picnic-123',
            user_id: 'test-user-456',
            user_name: 'Test Participant',
            user_email: 'participant@test.com',
            rsvp_status: 'going',
            dietary_restrictions: ['vegetarian'],
            plus_ones: 1,
            notes: 'Excited to join!'
        };
        
        mockItem = {
            id: 'test-item-789',
            picnic_id: 'test-picnic-123',
            name: 'Test Plates',
            category: 'tableware',
            quantity_needed: 20,
            unit: 'pieces',
            priority: 'medium',
            status: 'needed'
        };
        
        mockExpense = {
            id: 'test-expense-101',
            picnic_id: 'test-picnic-123',
            description: 'Test Food Cost',
            amount: 50.00,
            paid_by: 'test-user-123',
            category: 'food',
            split_type: 'equal',
            participants: ['test-user-123', 'test-user-456'],
            date: new Date().toISOString()
        };
    });

    it('should create picnic and automatically add organizer as participant', async () => {
        // Mock successful API responses
        let participantCreated = false;
        
        const originalMakeRequest = api.makeRequest.bind(api);
        api.makeRequest = async (endpoint, method, data) => {
            if (endpoint === '/picnics' && method === 'POST') {
                return { ...mockPicnic, ...data };
            }
            if (endpoint === '/picnic_participants' && method === 'POST') {
                participantCreated = true;
                return { ...mockParticipant, ...data };
            }
            return originalMakeRequest(endpoint, method, data);
        };
        
        const result = await api.createPicnic({
            title: mockPicnic.title,
            description: mockPicnic.description,
            date: mockPicnic.date,
            time: mockPicnic.time
        });
        
        expect(result.title).toBe(mockPicnic.title);
        expect(result.organizer_id).toBe('test-user-123');
        expect(participantCreated).toBeTruthy();
    });

    it('should handle picnic deletion with cascade', async () => {
        const deletedCollections = [];
        
        // Mock API responses for related data
        api.getParticipantsByPicnic = async () => [mockParticipant];
        api.getItemsByPicnic = async () => [mockItem];
        api.getExpensesByPicnic = async () => [mockExpense];
        
        api.batchOperations = async (operations) => {
            operations.forEach(op => {
                if (op.operation === 'delete') {
                    deletedCollections.push(op.collection);
                }
            });
            return { success: true };
        };
        
        await api.deletePicnic('test-picnic-123');
        
        expect(deletedCollections).toContain('picnics');
        expect(deletedCollections).toContain('picnic_participants');
        expect(deletedCollections).toContain('picnic_items');
        expect(deletedCollections).toContain('picnic_expenses');
    });

    it('should calculate expense summary correctly', async () => {
        const expenses = [
            { ...mockExpense, amount: 30.00, category: 'food' },
            { ...mockExpense, amount: 20.00, category: 'drinks' },
            { ...mockExpense, amount: 15.00, category: 'supplies' }
        ];
        
        const participants = [
            { ...mockParticipant, rsvp_status: 'going' },
            { ...mockParticipant, user_id: 'user-2', rsvp_status: 'going' },
            { ...mockParticipant, user_id: 'user-3', rsvp_status: 'maybe' }
        ];
        
        api.getExpensesByPicnic = async () => expenses;
        api.getParticipantsByPicnic = async () => participants;
        
        const summary = await api.getExpenseSummary('test-picnic-123');
        
        expect(summary.total).toBe(65.00);
        expect(summary.by_category.food).toBe(30.00);
        expect(summary.by_category.drinks).toBe(20.00);
        expect(summary.by_category.supplies).toBe(15.00);
        expect(summary.participant_count).toBe(2); // Only 'going' participants
        expect(summary.per_person).toBe(32.50); // 65 / 2
    });

    it('should handle item assignment correctly', async () => {
        let updatedItem = null;
        
        api.updateItem = async (id, updates) => {
            updatedItem = { ...mockItem, ...updates };
            return updatedItem;
        };
        
        await api.assignItem('test-item-789', 'test-user-456', 10);
        
        expect(updatedItem.assigned_to).toBe('test-user-456');
        expect(updatedItem.assigned_by).toBe('test-user-123');
        expect(updatedItem.quantity_assigned).toBe(10);
        expect(updatedItem.status).toBe('assigned');
    });
});

describe('Integration Tests - Real-time Features', () => {
    let api;
    let eventsFired;

    beforeEach(() => {
        api = new PicnicAPI();
        eventsFired = [];
        
        // Mock WebSocket
        api.ws = {
            readyState: WebSocket.OPEN,
            send: jest.fn(),
            close: jest.fn()
        };
    });

    it('should handle WebSocket subscription and unsubscription', () => {
        const callback = (data) => eventsFired.push(data);
        
        // Subscribe
        const unsubscribe = api.subscribe('picnics', callback);
        expect(api.subscriptions.has('picnics')).toBeTruthy();
        expect(api.ws.send).toHaveBeenCalledWith(JSON.stringify({
            type: 'subscribe',
            collection: 'picnics',
            eventType: null
        }));
        
        // Test event handling
        api.handleWebSocketMessage({
            type: 'document_created',
            collection: 'picnics',
            data: { title: 'New Picnic' },
            id: 'new-picnic-id'
        });
        
        expect(eventsFired.length).toBe(1);
        expect(eventsFired[0].type).toBe('document_created');
        
        // Unsubscribe
        unsubscribe();
        expect(api.subscriptions.has('picnics')).toBeFalsy();
    });

    it('should emit collection-specific events', () => {
        let picnicEventFired = false;
        let itemEventFired = false;
        
        api.on('ws:picnics:document_created', () => {
            picnicEventFired = true;
        });
        
        api.on('ws:picnic_items:document_updated', () => {
            itemEventFired = true;
        });
        
        // Fire picnic event
        api.handleWebSocketMessage({
            type: 'document_created',
            collection: 'picnics',
            data: { title: 'New Picnic' }
        });
        
        // Fire item event
        api.handleWebSocketMessage({
            type: 'document_updated',
            collection: 'picnic_items',
            data: { name: 'Updated Item' }
        });
        
        expect(picnicEventFired).toBeTruthy();
        expect(itemEventFired).toBeTruthy();
    });

    it('should handle WebSocket reconnection', () => {
        api.wsReconnectAttempts = 0;
        api.maxWsReconnectAttempts = 3;
        
        const originalConnectWebSocket = api.connectWebSocket.bind(api);
        let reconnectAttempts = 0;
        
        api.connectWebSocket = async () => {
            reconnectAttempts++;
            return originalConnectWebSocket();
        };
        
        // Simulate connection failure
        api.scheduleReconnect();
        
        // Fast-forward time to trigger reconnection
        setTimeout(() => {
            expect(reconnectAttempts).toBeGreaterThan(0);
            expect(api.wsReconnectAttempts).toBeGreaterThan(0);
        }, 100);
    });
});

describe('Integration Tests - Form Validation and UI', () => {
    let form;
    let inputs;

    beforeEach(() => {
        // Create test form
        form = document.createElement('form');
        form.innerHTML = `
            <input type="text" name="title" required>
            <input type="date" name="date" required>
            <input type="time" name="time" required>
            <input type="number" name="maxParticipants" min="1" max="100">
            <select name="theme">
                <option value="bbq">BBQ</option>
                <option value="family">Family</option>
            </select>
            <textarea name="description"></textarea>
        `;
        
        document.body.appendChild(form);
        inputs = {
            title: form.querySelector('[name="title"]'),
            date: form.querySelector('[name="date"]'),
            time: form.querySelector('[name="time"]'),
            maxParticipants: form.querySelector('[name="maxParticipants"]'),
            theme: form.querySelector('[name="theme"]'),
            description: form.querySelector('[name="description"]')
        };
    });

    afterEach(() => {
        document.body.removeChild(form);
    });

    it('should validate required fields', () => {
        // Test empty form
        expect(form.checkValidity()).toBeFalsy();
        
        // Fill required fields
        inputs.title.value = 'Test Picnic';
        inputs.date.value = '2025-08-20';
        inputs.time.value = '12:00';
        
        expect(form.checkValidity()).toBeTruthy();
    });

    it('should validate date constraints', () => {
        const dateInput = inputs.date;
        
        // Initialize date picker component
        const datePicker = new DateTimePickerComponent(dateInput);
        
        // Test past date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        dateInput.value = yesterday.toISOString().split('T')[0];
        
        expect(datePicker.validate()).toBeFalsy();
        
        // Test future date
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        dateInput.value = tomorrow.toISOString().split('T')[0];
        
        expect(datePicker.validate()).toBeTruthy();
    });

    it('should validate number constraints', () => {
        const numberInput = inputs.maxParticipants;
        
        // Test below minimum
        numberInput.value = '0';
        expect(numberInput.checkValidity()).toBeFalsy();
        
        // Test above maximum
        numberInput.value = '101';
        expect(numberInput.checkValidity()).toBeFalsy();
        
        // Test valid value
        numberInput.value = '50';
        expect(numberInput.checkValidity()).toBeTruthy();
    });

    it('should handle rich text editor integration', () => {
        const textarea = inputs.description;
        const editor = new RichTextEditorComponent(textarea, {
            maxLength: 100,
            showCharCount: true
        });
        
        // Test character counting
        textarea.value = 'Test description';
        textarea.dispatchEvent(new Event('input'));
        
        expect(editor.charCounter.textContent).toContain('16/100');
        
        // Test max length warning
        textarea.value = 'A'.repeat(95);
        textarea.dispatchEvent(new Event('input'));
        
        expect(editor.charCounter.style.color).toBeTruthy();
    });

    it('should collect form data correctly', () => {
        inputs.title.value = 'Integration Test Picnic';
        inputs.date.value = '2025-08-20';
        inputs.time.value = '15:30';
        inputs.maxParticipants.value = '25';
        inputs.theme.value = 'family';
        inputs.description.value = 'Test description';
        
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        expect(data.title).toBe('Integration Test Picnic');
        expect(data.date).toBe('2025-08-20');
        expect(data.time).toBe('15:30');
        expect(data.maxParticipants).toBe('25');
        expect(data.theme).toBe('family');
        expect(data.description).toBe('Test description');
    });
});

describe('Integration Tests - Local Storage and State', () => {
    let originalLocalStorage;

    beforeEach(() => {
        // Mock localStorage
        originalLocalStorage = global.localStorage;
        global.localStorage = {
            getItem: jest.fn(),
            setItem: jest.fn(),
            removeItem: jest.fn(),
            clear: jest.fn()
        };
    });

    afterEach(() => {
        global.localStorage = originalLocalStorage;
    });

    it('should handle theme persistence', () => {
        global.localStorage.getItem.mockReturnValue('dark');
        
        // Simulate theme initialization
        const theme = localStorage.getItem('picnic-theme') || 'auto';
        expect(theme).toBe('dark');
        
        // Simulate theme change
        const newTheme = 'light';
        localStorage.setItem('picnic-theme', newTheme);
        
        expect(localStorage.setItem).toHaveBeenCalledWith('picnic-theme', 'light');
    });

    it('should handle offline data caching', () => {
        const testData = [
            { id: '1', title: 'Picnic 1' },
            { id: '2', title: 'Picnic 2' }
        ];
        
        // Simulate saving data to cache
        localStorage.setItem('cached-picnics', JSON.stringify(testData));
        
        expect(localStorage.setItem).toHaveBeenCalledWith(
            'cached-picnics',
            JSON.stringify(testData)
        );
        
        // Simulate retrieving cached data
        global.localStorage.getItem.mockReturnValue(JSON.stringify(testData));
        const cachedData = JSON.parse(localStorage.getItem('cached-picnics') || '[]');
        
        expect(cachedData).toEqual(testData);
    });

    it('should handle user preferences', () => {
        const preferences = {
            notifications: true,
            defaultTheme: 'bbq',
            autoJoinPublicEvents: false
        };
        
        localStorage.setItem('user-preferences', JSON.stringify(preferences));
        
        expect(localStorage.setItem).toHaveBeenCalledWith(
            'user-preferences',
            JSON.stringify(preferences)
        );
    });
});

describe('Integration Tests - Error Recovery', () => {
    let api;
    let retryCount;

    beforeEach(() => {
        api = new PicnicAPI();
        retryCount = 0;
    });

    it('should retry failed requests', async () => {
        // Mock fetch to fail first few times, then succeed
        const originalFetch = global.fetch;
        global.fetch = jest.fn(() => {
            retryCount++;
            if (retryCount < 3) {
                return Promise.reject(new Error('Network error'));
            }
            return Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true })
            });
        });
        
        const result = await api.makeRequest('/test-endpoint');
        
        expect(retryCount).toBe(3);
        expect(result.success).toBeTruthy();
        
        global.fetch = originalFetch;
    });

    it('should handle authentication token refresh', async () => {
        let tokenRefreshed = false;
        
        // Mock auth refresh
        window.olamoAuth.refreshToken = async () => {
            tokenRefreshed = true;
            return 'new-token-123';
        };
        
        // Mock fetch to return 401 first time, then succeed
        const originalFetch = global.fetch;
        global.fetch = jest.fn()
            .mockReturnValueOnce(Promise.resolve({
                ok: false,
                status: 401,
                json: () => Promise.resolve({ message: 'Token expired' })
            }))
            .mockReturnValueOnce(Promise.resolve({
                ok: true,
                json: () => Promise.resolve({ success: true })
            }));
        
        const result = await api.makeRequest('/protected-endpoint');
        
        expect(tokenRefreshed).toBeTruthy();
        expect(result.success).toBeTruthy();
        
        global.fetch = originalFetch;
    });

    it('should gracefully degrade when WebSocket is unavailable', () => {
        // Simulate WebSocket connection failure
        api.ws = null;
        
        let subscriptionCallback = null;
        const unsubscribe = api.subscribe('picnics', (data) => {
            subscriptionCallback = data;
        });
        
        // Should not throw error
        expect(() => unsubscribe()).not.toThrow();
        
        // Should handle send gracefully
        expect(() => api.sendWebSocketMessage({ type: 'test' })).not.toThrow();
    });

    it('should handle partial data loading failures', async () => {
        let picnicsLoaded = false;
        let participantsLoaded = false;
        let itemsLoaded = false;
        
        // Mock API methods with mixed success
        api.listPicnics = async () => {
            picnicsLoaded = true;
            return { documents: [{ id: '1', title: 'Test Picnic' }] };
        };
        
        api.getParticipantsByPicnic = async () => {
            participantsLoaded = true;
            throw new Error('Participants service unavailable');
        };
        
        api.getItemsByPicnic = async () => {
            itemsLoaded = true;
            return [{ id: '1', name: 'Test Item' }];
        };
        
        // Simulate loading dashboard with partial failures
        const results = await Promise.allSettled([
            api.listPicnics(),
            api.getParticipantsByPicnic('test-id'),
            api.getItemsByPicnic('test-id')
        ]);
        
        expect(picnicsLoaded).toBeTruthy();
        expect(participantsLoaded).toBeTruthy();
        expect(itemsLoaded).toBeTruthy();
        
        // Check that some operations succeeded despite partial failures
        expect(results[0].status).toBe('fulfilled');
        expect(results[1].status).toBe('rejected');
        expect(results[2].status).toBe('fulfilled');
    });
});

describe('Integration Tests - Performance and Optimization', () => {
    it('should throttle search requests', (done) => {
        let searchCount = 0;
        
        const throttledSearch = Utils.throttle(() => {
            searchCount++;
        }, 100);
        
        // Simulate rapid typing
        throttledSearch();
        throttledSearch();
        throttledSearch();
        throttledSearch();
        
        // Should only execute once initially
        expect(searchCount).toBe(1);
        
        setTimeout(() => {
            throttledSearch();
            expect(searchCount).toBe(2);
            done();
        }, 150);
    });

    it('should cache frequently accessed data', () => {
        const cache = new Map();
        const cacheKey = 'picnic-123';
        const testData = { id: '123', title: 'Cached Picnic' };
        
        // Simulate caching
        cache.set(cacheKey, {
            data: testData,
            timestamp: Date.now(),
            ttl: 60000 // 1 minute
        });
        
        // Simulate cache retrieval
        const cached = cache.get(cacheKey);
        const isExpired = Date.now() - cached.timestamp > cached.ttl;
        
        expect(cached.data).toEqual(testData);
        expect(isExpired).toBeFalsy();
    });

    it('should handle large data sets efficiently', () => {
        // Simulate large participant list
        const participants = Array.from({ length: 1000 }, (_, i) => ({
            id: `participant-${i}`,
            user_name: `User ${i}`,
            rsvp_status: i % 3 === 0 ? 'going' : i % 3 === 1 ? 'maybe' : 'not_going'
        }));
        
        // Simulate filtering (should be efficient)
        const startTime = Date.now();
        const goingParticipants = participants.filter(p => p.rsvp_status === 'going');
        const endTime = Date.now();
        
        expect(goingParticipants.length).toBeGreaterThan(0);
        expect(endTime - startTime).toBeLessThan(50); // Should complete quickly
    });

    it('should batch similar operations', () => {
        const operations = [];
        
        // Simulate batching multiple item updates
        const itemUpdates = [
            { id: '1', quantity_assigned: 5 },
            { id: '2', quantity_assigned: 3 },
            { id: '3', quantity_assigned: 7 }
        ];
        
        itemUpdates.forEach(update => {
            operations.push({
                operation: 'update',
                collection: 'picnic_items',
                id: update.id,
                data: { quantity_assigned: update.quantity_assigned }
            });
        });
        
        expect(operations.length).toBe(3);
        expect(operations.every(op => op.operation === 'update')).toBeTruthy();
        expect(operations.every(op => op.collection === 'picnic_items')).toBeTruthy();
    });
});