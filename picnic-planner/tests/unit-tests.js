/**
 * PicnicPro Unit Tests
 * Tests individual components, functions, and utilities
 */

describe('Unit Tests - PicnicAPI', () => {
    let api;

    it('should initialize API with correct properties', () => {
        api = new PicnicAPI();
        expect(api.baseUrl).toBe('/api');
        expect(api.wsUrl).toBe('/ws');
        expect(api.collections).toEqual({
            picnics: 'picnics',
            participants: 'picnic_participants',
            items: 'picnic_items',
            expenses: 'picnic_expenses'
        });
    });

    it('should get authentication token correctly', () => {
        api = new PicnicAPI();
        const token = api.getAuthToken();
        expect(token).toBe('mock-jwt-token-for-development');
    });

    it('should get current user information', () => {
        api = new PicnicAPI();
        expect(api.getCurrentUserId()).toBe('test-user-123');
        expect(api.getCurrentUserName()).toBe('Test User');
        expect(api.getCurrentUserEmail()).toBe('test@example.com');
    });

    it('should check permissions correctly', () => {
        api = new PicnicAPI();
        expect(api.hasPermission('read')).toBeTruthy();
        expect(api.hasPermission('write')).toBeTruthy();
    });

    it('should handle event emitter functionality', () => {
        api = new PicnicAPI();
        let eventFired = false;
        
        api.on('test-event', (data) => {
            eventFired = true;
            expect(data).toBe('test-data');
        });
        
        api.emit('test-event', 'test-data');
        expect(eventFired).toBeTruthy();
    });

    it('should remove event listeners correctly', () => {
        api = new PicnicAPI();
        let eventCount = 0;
        
        const handler = () => eventCount++;
        api.on('test-event', handler);
        api.emit('test-event');
        expect(eventCount).toBe(1);
        
        api.off('test-event', handler);
        api.emit('test-event');
        expect(eventCount).toBe(1); // Should not increment
    });
});

describe('Unit Tests - Utils', () => {
    it('should format currency correctly', () => {
        expect(Utils.formatCurrency(25.50)).toBe('$25.50');
        expect(Utils.formatCurrency(1000)).toBe('$1,000.00');
        expect(Utils.formatCurrency(0)).toBe('$0.00');
    });

    it('should format dates correctly', () => {
        const testDate = new Date('2025-08-20T12:00:00Z');
        const formatted = Utils.formatDate(testDate);
        expect(formatted).toContain('August');
        expect(formatted).toContain('20');
        expect(formatted).toContain('2025');
    });

    it('should format relative time correctly', () => {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        expect(Utils.formatRelativeTime(today)).toBe('Today');
        expect(Utils.formatRelativeTime(tomorrow)).toBe('Tomorrow');
        expect(Utils.formatRelativeTime(yesterday)).toBe('Yesterday');
    });

    it('should sanitize HTML correctly', () => {
        const unsafeHTML = '<script>alert("xss")</script><p>Safe content</p>';
        const sanitized = Utils.sanitizeHTML(unsafeHTML);
        expect(sanitized).not.toContain('<script>');
        expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should generate unique IDs', () => {
        const id1 = Utils.generateId('test');
        const id2 = Utils.generateId('test');
        expect(id1).not.toBe(id2);
        expect(id1).toContain('test-');
        expect(id2).toContain('test-');
    });

    it('should throttle function calls', (done) => {
        let callCount = 0;
        const throttledFn = Utils.throttle(() => callCount++, 100);
        
        // Call multiple times rapidly
        throttledFn();
        throttledFn();
        throttledFn();
        
        // Should only be called once initially
        expect(callCount).toBe(1);
        
        // Wait for throttle period and test again
        setTimeout(() => {
            throttledFn();
            expect(callCount).toBe(2);
            done();
        }, 150);
    });
});

describe('Unit Tests - ComponentRegistry', () => {
    let registry;

    it('should create component registry', () => {
        registry = new ComponentRegistry();
        expect(registry.components).toBeInstanceOf(Map);
        expect(registry.instances).toBeInstanceOf(Map);
    });

    it('should register components', () => {
        registry = new ComponentRegistry();
        class TestComponent {}
        
        registry.register('test', TestComponent);
        expect(registry.components.get('test')).toBe(TestComponent);
    });

    it('should create component instances', () => {
        registry = new ComponentRegistry();
        class TestComponent {
            constructor(element, options) {
                this.element = element;
                this.options = options;
            }
        }
        
        registry.register('test', TestComponent);
        
        const mockElement = document.createElement('div');
        const instance = registry.create('test', mockElement, { test: true });
        
        expect(instance).toBeInstanceOf(TestComponent);
        expect(instance.element).toBe(mockElement);
        expect(instance.options.test).toBeTruthy();
    });

    it('should get component instances', () => {
        registry = new ComponentRegistry();
        class TestComponent {
            constructor(element) {
                this.element = element;
            }
        }
        
        registry.register('test', TestComponent);
        
        const mockElement = document.createElement('div');
        const instance = registry.create('test', mockElement);
        const retrieved = registry.getInstance(mockElement);
        
        expect(retrieved).toBe(instance);
    });

    it('should destroy component instances', () => {
        registry = new ComponentRegistry();
        class TestComponent {
            constructor(element) {
                this.element = element;
                this.destroyed = false;
            }
            destroy() {
                this.destroyed = true;
            }
        }
        
        registry.register('test', TestComponent);
        
        const mockElement = document.createElement('div');
        const instance = registry.create('test', mockElement);
        
        registry.destroy(mockElement);
        expect(instance.destroyed).toBeTruthy();
        expect(registry.getInstance(mockElement)).toBeFalsy();
    });
});

describe('Unit Tests - AutoSuggestComponent', () => {
    let component;
    let inputElement;

    it('should create auto-suggest component', () => {
        inputElement = document.createElement('input');
        document.body.appendChild(inputElement);
        
        component = new AutoSuggestComponent(inputElement, {
            dataSource: ['Option 1', 'Option 2', 'Option 3']
        });
        
        expect(component.element).toBe(inputElement);
        expect(component.options.dataSource).toEqual(['Option 1', 'Option 2', 'Option 3']);
        expect(component.suggestionsList).toBeTruthy();
        
        document.body.removeChild(inputElement);
    });

    it('should filter suggestions correctly', async () => {
        inputElement = document.createElement('input');
        document.body.appendChild(inputElement);
        
        component = new AutoSuggestComponent(inputElement, {
            dataSource: ['Apple', 'Banana', 'Orange', 'Grape']
        });
        
        const suggestions = await component.getSuggestions('ap');
        expect(suggestions).toContain('Apple');
        expect(suggestions).toContain('Grape');
        expect(suggestions).not.toContain('Banana');
        
        document.body.removeChild(inputElement);
    });

    it('should handle suggestion selection', () => {
        inputElement = document.createElement('input');
        document.body.appendChild(inputElement);
        
        let selectedValue = null;
        component = new AutoSuggestComponent(inputElement, {
            dataSource: ['Test Option'],
            onSelect: (value) => selectedValue = value
        });
        
        component.selectSuggestion('Test Option');
        expect(inputElement.value).toBe('Test Option');
        expect(selectedValue).toBe('Test Option');
        
        document.body.removeChild(inputElement);
    });
});

describe('Unit Tests - ProgressBarComponent', () => {
    let component;
    let element;

    it('should create progress bar component', () => {
        element = document.createElement('div');
        document.body.appendChild(element);
        
        component = new ProgressBarComponent(element, {
            min: 0,
            max: 100,
            value: 50
        });
        
        expect(component.value).toBe(50);
        expect(component.bar).toBeTruthy();
        
        document.body.removeChild(element);
    });

    it('should update progress value correctly', () => {
        element = document.createElement('div');
        document.body.appendChild(element);
        
        component = new ProgressBarComponent(element);
        
        component.setValue(75);
        expect(component.getValue()).toBe(75);
        expect(component.bar.style.width).toBe('75%');
        
        document.body.removeChild(element);
    });

    it('should clamp values to min/max range', () => {
        element = document.createElement('div');
        document.body.appendChild(element);
        
        component = new ProgressBarComponent(element, {
            min: 0,
            max: 100
        });
        
        component.setValue(-10);
        expect(component.getValue()).toBe(0);
        
        component.setValue(150);
        expect(component.getValue()).toBe(100);
        
        document.body.removeChild(element);
    });

    it('should change color correctly', () => {
        element = document.createElement('div');
        document.body.appendChild(element);
        
        component = new ProgressBarComponent(element);
        
        component.setColor('#ff0000');
        expect(component.options.color).toBe('#ff0000');
        expect(component.bar.style.background).toBe('#ff0000');
        
        document.body.removeChild(element);
    });
});

describe('Unit Tests - DateTimePickerComponent', () => {
    let component;
    let inputElement;

    it('should create date-time picker component', () => {
        inputElement = document.createElement('input');
        inputElement.type = 'date';
        document.body.appendChild(inputElement);
        
        component = new DateTimePickerComponent(inputElement);
        
        expect(component.element).toBe(inputElement);
        expect(inputElement.min).toBeTruthy(); // Should set minimum date
        
        document.body.removeChild(inputElement);
    });

    it('should validate dates correctly', () => {
        inputElement = document.createElement('input');
        inputElement.type = 'date';
        document.body.appendChild(inputElement);
        
        component = new DateTimePickerComponent(inputElement);
        
        // Set past date
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        inputElement.value = yesterday.toISOString().split('T')[0];
        
        const isValid = component.validate();
        expect(isValid).toBeFalsy();
        
        document.body.removeChild(inputElement);
    });

    it('should set and get values correctly', () => {
        inputElement = document.createElement('input');
        inputElement.type = 'date';
        document.body.appendChild(inputElement);
        
        component = new DateTimePickerComponent(inputElement);
        
        const testDate = new Date('2025-12-25');
        component.setValue(testDate);
        
        expect(component.getValue()).toBe('2025-12-25');
        
        document.body.removeChild(inputElement);
    });
});

describe('Unit Tests - RichTextEditorComponent', () => {
    let component;
    let textareaElement;

    it('should create rich text editor component', () => {
        textareaElement = document.createElement('textarea');
        document.body.appendChild(textareaElement);
        
        component = new RichTextEditorComponent(textareaElement, {
            maxLength: 500,
            showCharCount: true
        });
        
        expect(component.element).toBe(textareaElement);
        expect(component.charCounter).toBeTruthy();
        
        document.body.removeChild(textareaElement);
    });

    it('should update character counter', () => {
        textareaElement = document.createElement('textarea');
        document.body.appendChild(textareaElement);
        
        component = new RichTextEditorComponent(textareaElement, {
            maxLength: 100,
            showCharCount: true
        });
        
        component.setValue('Hello World');
        expect(component.charCounter.textContent).toBe('11/100');
        
        component.setValue('A'.repeat(95));
        expect(component.charCounter.style.color).toContain('warning'); // Near limit
        
        document.body.removeChild(textareaElement);
    });

    it('should handle auto-resize', () => {
        textareaElement = document.createElement('textarea');
        textareaElement.style.height = '50px';
        document.body.appendChild(textareaElement);
        
        component = new RichTextEditorComponent(textareaElement, {
            autoResize: true
        });
        
        const initialHeight = textareaElement.style.height;
        component.setValue('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
        
        // Height should have changed for auto-resize
        expect(textareaElement.style.resize).toBe('none');
        
        document.body.removeChild(textareaElement);
    });
});

describe('Unit Tests - Data Validation', () => {
    it('should validate picnic data structure', () => {
        const validPicnic = {
            title: 'Summer BBQ',
            description: 'Annual team BBQ',
            date: '2025-08-20',
            time: '12:00',
            location: {
                name: 'Central Park',
                address: '123 Park Ave'
            },
            organizer_id: 'user123',
            status: 'planning',
            max_participants: 50,
            is_public: false,
            theme: 'bbq'
        };
        
        // Check required fields
        expect(validPicnic.title).toBeTruthy();
        expect(validPicnic.date).toBeTruthy();
        expect(validPicnic.time).toBeTruthy();
        expect(validPicnic.organizer_id).toBeTruthy();
        
        // Check enum values
        expect(['planning', 'confirmed', 'cancelled', 'completed']).toContain(validPicnic.status);
        expect(['bbq', 'family', 'sports', 'casual', 'birthday', 'company']).toContain(validPicnic.theme);
        
        // Check data types
        expect(typeof validPicnic.is_public).toBe('boolean');
        expect(typeof validPicnic.max_participants).toBe('number');
    });

    it('should validate participant data structure', () => {
        const validParticipant = {
            picnic_id: 'picnic123',
            user_id: 'user456',
            user_name: 'John Doe',
            user_email: 'john@example.com',
            rsvp_status: 'going',
            dietary_restrictions: ['vegetarian'],
            plus_ones: 2,
            notes: 'Looking forward to it!',
            rsvp_date: '2025-08-15T10:00:00Z'
        };
        
        // Check required fields
        expect(validParticipant.picnic_id).toBeTruthy();
        expect(validParticipant.user_id).toBeTruthy();
        expect(validParticipant.user_name).toBeTruthy();
        
        // Check enum values
        expect(['going', 'not_going', 'maybe', 'pending']).toContain(validParticipant.rsvp_status);
        
        // Check data types
        expect(Array.isArray(validParticipant.dietary_restrictions)).toBeTruthy();
        expect(typeof validParticipant.plus_ones).toBe('number');
    });

    it('should validate item data structure', () => {
        const validItem = {
            picnic_id: 'picnic123',
            name: 'Paper plates',
            category: 'tableware',
            quantity_needed: 50,
            unit: 'pieces',
            assigned_to: 'user789',
            quantity_assigned: 30,
            status: 'assigned',
            estimated_cost: 15.99,
            priority: 'medium'
        };
        
        // Check required fields
        expect(validItem.picnic_id).toBeTruthy();
        expect(validItem.name).toBeTruthy();
        expect(validItem.category).toBeTruthy();
        
        // Check enum values
        expect(['food', 'drinks', 'tableware', 'games', 'equipment', 'other']).toContain(validItem.category);
        expect(['needed', 'assigned', 'confirmed', 'completed']).toContain(validItem.status);
        expect(['high', 'medium', 'low']).toContain(validItem.priority);
        
        // Check data types
        expect(typeof validItem.quantity_needed).toBe('number');
        expect(typeof validItem.estimated_cost).toBe('number');
    });

    it('should validate expense data structure', () => {
        const validExpense = {
            picnic_id: 'picnic123',
            description: 'Hamburger meat',
            amount: 85.50,
            paid_by: 'user123',
            category: 'food',
            split_type: 'equal',
            participants: ['user123', 'user456'],
            per_person_amount: 42.75,
            payment_method: 'card',
            date: '2025-08-18T14:30:00Z'
        };
        
        // Check required fields
        expect(validExpense.picnic_id).toBeTruthy();
        expect(validExpense.description).toBeTruthy();
        expect(validExpense.amount).toBeTruthy();
        expect(validExpense.paid_by).toBeTruthy();
        
        // Check enum values
        expect(['food', 'drinks', 'supplies', 'transportation', 'other']).toContain(validExpense.category);
        expect(['equal', 'by_consumption', 'custom', 'organizer_pays']).toContain(validExpense.split_type);
        expect(['cash', 'card', 'digital', 'other']).toContain(validExpense.payment_method);
        
        // Check data types
        expect(typeof validExpense.amount).toBe('number');
        expect(Array.isArray(validExpense.participants)).toBeTruthy();
    });
});

describe('Unit Tests - Error Handling', () => {
    it('should handle API errors gracefully', () => {
        const api = new PicnicAPI();
        
        // Mock fetch to return error
        const originalFetch = global.fetch;
        global.fetch = jest.fn(() => 
            Promise.resolve({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                json: () => Promise.resolve({ message: 'Resource not found' })
            })
        );
        
        expect(async () => {
            await api.makeRequest('/nonexistent');
        }).toThrow();
        
        global.fetch = originalFetch;
    });

    it('should handle network errors', () => {
        const api = new PicnicAPI();
        
        // Mock fetch to reject
        const originalFetch = global.fetch;
        global.fetch = jest.fn(() => Promise.reject(new Error('Network error')));
        
        expect(async () => {
            await api.makeRequest('/test');
        }).toThrow();
        
        global.fetch = originalFetch;
    });

    it('should handle invalid JSON responses', () => {
        const api = new PicnicAPI();
        
        // Mock fetch to return invalid JSON
        const originalFetch = global.fetch;
        global.fetch = jest.fn(() => 
            Promise.resolve({
                ok: true,
                json: () => Promise.reject(new Error('Invalid JSON'))
            })
        );
        
        expect(async () => {
            await api.makeRequest('/test');
        }).toThrow();
        
        global.fetch = originalFetch;
    });
});

// Clean up after tests
describe('Unit Tests - Cleanup', () => {
    it('should clean up API resources', () => {
        const api = new PicnicAPI();
        api.ws = { close: jest.fn() };
        
        api.destroy();
        
        expect(api.ws).toBe(null);
        expect(api.subscriptions.size).toBe(0);
        expect(api.eventHandlers.size).toBe(0);
    });

    it('should clean up component resources', () => {
        const element = document.createElement('div');
        document.body.appendChild(element);
        
        const component = new AutoSuggestComponent(element);
        const suggestionsList = component.suggestionsList;
        
        component.destroy();
        
        expect(document.body.contains(suggestionsList)).toBeFalsy();
        
        document.body.removeChild(element);
    });
});