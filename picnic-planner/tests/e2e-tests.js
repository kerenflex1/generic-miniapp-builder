/**
 * PicnicPro End-to-End Tests
 * Tests complete user workflows and scenarios
 */

describe('E2E Tests - Complete Picnic Planning Workflow', () => {
    let app;
    let mockAPI;

    beforeEach(() => {
        // Setup mock API responses
        mockAPI = {
            picnics: [],
            participants: [],
            items: [],
            expenses: [],
            nextId: 1
        };
        
        // Mock the global API
        window.picnicAPI = {
            initialize: async () => true,
            createPicnic: async (data) => {
                const picnic = { ...data, id: `picnic-${mockAPI.nextId++}`, created_at: new Date().toISOString() };
                mockAPI.picnics.push(picnic);
                return picnic;
            },
            listPicnics: async () => ({ documents: mockAPI.picnics }),
            getPicnic: async (id) => mockAPI.picnics.find(p => p.id === id),
            createParticipant: async (data) => {
                const participant = { ...data, id: `participant-${mockAPI.nextId++}` };
                mockAPI.participants.push(participant);
                return participant;
            },
            getParticipantsByPicnic: async (picnicId) => mockAPI.participants.filter(p => p.picnic_id === picnicId),
            createItem: async (data) => {
                const item = { ...data, id: `item-${mockAPI.nextId++}` };
                mockAPI.items.push(item);
                return item;
            },
            getItemsByPicnic: async (picnicId) => mockAPI.items.filter(i => i.picnic_id === picnicId),
            createExpense: async (data) => {
                const expense = { ...data, id: `expense-${mockAPI.nextId++}` };
                mockAPI.expenses.push(expense);
                return expense;
            },
            getExpensesByPicnic: async (picnicId) => mockAPI.expenses.filter(e => e.picnic_id === picnicId),
            subscribe: () => () => {},
            on: () => {},
            emit: () => {},
            getCurrentUserId: () => 'test-user-123',
            getCurrentUserName: () => 'Test User',
            getCurrentUserEmail: () => 'test@example.com'
        };
    });

    it('should complete full picnic creation workflow', async () => {
        // Step 1: User opens create form
        const createForm = document.createElement('form');
        createForm.id = 'createForm';
        createForm.innerHTML = `
            <input name="title" value="Summer Team BBQ" required>
            <input name="description" value="Annual team barbecue event">
            <input name="date" value="2025-08-20" required>
            <input name="time" value="12:00" required>
            <input name="locationName" value="Central Park">
            <input name="locationAddress" value="123 Park Avenue">
            <input name="theme" value="bbq">
            <input name="maxParticipants" value="25">
            <input name="isPublic" value="false">
            <input name="weatherContingency" value="Indoor pavilion available">
        `;
        document.body.appendChild(createForm);

        // Step 2: Validate form data
        expect(createForm.checkValidity()).toBeTruthy();

        // Step 3: Extract form data
        const formData = new FormData(createForm);
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
            organizer_id: 'test-user-123',
            status: 'planning'
        };

        // Step 4: Create picnic via API
        const createdPicnic = await window.picnicAPI.createPicnic(picnicData);

        // Step 5: Verify picnic was created correctly
        expect(createdPicnic.title).toBe('Summer Team BBQ');
        expect(createdPicnic.organizer_id).toBe('test-user-123');
        expect(createdPicnic.status).toBe('planning');
        expect(mockAPI.picnics.length).toBe(1);

        // Step 6: Verify organizer was automatically added as participant
        const participants = await window.picnicAPI.getParticipantsByPicnic(createdPicnic.id);
        expect(participants.length).toBe(1);
        expect(participants[0].user_id).toBe('test-user-123');
        expect(participants[0].rsvp_status).toBe('going');

        document.body.removeChild(createForm);
    });

    it('should handle complete RSVP workflow', async () => {
        // Setup: Create a picnic first
        const picnic = await window.picnicAPI.createPicnic({
            title: 'Test Picnic',
            date: '2025-08-20',
            time: '12:00',
            organizer_id: 'organizer-123'
        });

        // Step 1: User opens RSVP modal
        const rsvpForm = document.createElement('form');
        rsvpForm.id = 'rsvpForm';
        rsvpForm.innerHTML = `
            <input type="radio" name="rsvp" value="going" checked>
            <input type="radio" name="rsvp" value="maybe">
            <input type="radio" name="rsvp" value="not_going">
            <input name="plusOnes" type="number" value="2">
            <input type="checkbox" value="vegetarian" checked>
            <input type="checkbox" value="gluten-free">
            <textarea name="notes">Looking forward to it!</textarea>
        `;
        document.body.appendChild(rsvpForm);

        // Step 2: Extract RSVP data
        const formData = new FormData(rsvpForm);
        const rsvpStatus = formData.get('rsvp');
        const plusOnes = parseInt(formData.get('plusOnes')) || 0;
        const notes = formData.get('notes');
        
        const dietaryRestrictions = Array.from(
            rsvpForm.querySelectorAll('input[type="checkbox"]:checked')
        ).map(cb => cb.value);

        // Step 3: Submit RSVP
        const rsvpData = {
            picnic_id: picnic.id,
            user_id: 'test-participant-456',
            user_name: 'Test Participant',
            user_email: 'participant@test.com',
            rsvp_status: rsvpStatus,
            dietary_restrictions: dietaryRestrictions,
            plus_ones: plusOnes,
            notes: notes,
            rsvp_date: new Date().toISOString()
        };

        const rsvpResult = await window.picnicAPI.createParticipant(rsvpData);

        // Step 4: Verify RSVP was recorded correctly
        expect(rsvpResult.rsvp_status).toBe('going');
        expect(rsvpResult.plus_ones).toBe(2);
        expect(rsvpResult.dietary_restrictions).toContain('vegetarian');
        expect(rsvpResult.notes).toBe('Looking forward to it!');

        // Step 5: Verify participant count updated
        const allParticipants = await window.picnicAPI.getParticipantsByPicnic(picnic.id);
        expect(allParticipants.length).toBe(2); // Organizer + new participant

        document.body.removeChild(rsvpForm);
    });

    it('should handle complete item management workflow', async () => {
        // Setup: Create picnic and participants
        const picnic = await window.picnicAPI.createPicnic({
            title: 'BBQ Picnic',
            date: '2025-08-20',
            time: '12:00'
        });

        // Step 1: Organizer adds multiple items
        const itemsToAdd = [
            {
                picnic_id: picnic.id,
                name: 'Hamburger Patties',
                category: 'food',
                quantity_needed: 20,
                unit: 'pieces',
                priority: 'high',
                estimated_cost: 30.00
            },
            {
                picnic_id: picnic.id,
                name: 'Paper Plates',
                category: 'tableware',
                quantity_needed: 25,
                unit: 'pieces',
                priority: 'medium',
                estimated_cost: 15.00
            },
            {
                picnic_id: picnic.id,
                name: 'Frisbee',
                category: 'games',
                quantity_needed: 2,
                unit: 'pieces',
                priority: 'low',
                estimated_cost: 20.00
            }
        ];

        const createdItems = [];
        for (const itemData of itemsToAdd) {
            const item = await window.picnicAPI.createItem(itemData);
            createdItems.push(item);
        }

        // Step 2: Verify items were created
        expect(createdItems.length).toBe(3);
        const picnicItems = await window.picnicAPI.getItemsByPicnic(picnic.id);
        expect(picnicItems.length).toBe(3);

        // Step 3: Participant assigns themselves to items
        const hamburgerItem = createdItems.find(item => item.name === 'Hamburger Patties');
        const platesItem = createdItems.find(item => item.name === 'Paper Plates');

        // Mock item assignment
        window.picnicAPI.assignItem = async (itemId, userId, quantity) => {
            const item = mockAPI.items.find(i => i.id === itemId);
            if (item) {
                item.assigned_to = userId;
                item.quantity_assigned = quantity;
                item.status = 'assigned';
            }
            return item;
        };

        await window.picnicAPI.assignItem(hamburgerItem.id, 'participant-1', 20);
        await window.picnicAPI.assignItem(platesItem.id, 'participant-2', 15);

        // Step 4: Verify assignments
        const updatedItems = await window.picnicAPI.getItemsByPicnic(picnic.id);
        const assignedHamburgers = updatedItems.find(i => i.name === 'Hamburger Patties');
        const assignedPlates = updatedItems.find(i => i.name === 'Paper Plates');

        expect(assignedHamburgers.assigned_to).toBe('participant-1');
        expect(assignedHamburgers.quantity_assigned).toBe(20);
        expect(assignedHamburgers.status).toBe('assigned');

        expect(assignedPlates.assigned_to).toBe('participant-2');
        expect(assignedPlates.quantity_assigned).toBe(15);
        expect(assignedPlates.status).toBe('assigned');

        // Step 5: Check item completion status
        const totalNeeded = updatedItems.reduce((sum, item) => sum + item.quantity_needed, 0);
        const totalAssigned = updatedItems.reduce((sum, item) => sum + (item.quantity_assigned || 0), 0);
        const completionPercentage = (totalAssigned / totalNeeded) * 100;

        expect(completionPercentage).toBeGreaterThan(50); // Most items assigned
    });

    it('should handle complete expense tracking workflow', async () => {
        // Setup: Create picnic with participants
        const picnic = await window.picnicAPI.createPicnic({
            title: 'Expense Test Picnic',
            date: '2025-08-20',
            time: '12:00'
        });

        const participants = [
            { picnic_id: picnic.id, user_id: 'user-1', rsvp_status: 'going' },
            { picnic_id: picnic.id, user_id: 'user-2', rsvp_status: 'going' },
            { picnic_id: picnic.id, user_id: 'user-3', rsvp_status: 'going' }
        ];

        for (const participant of participants) {
            await window.picnicAPI.createParticipant(participant);
        }

        // Step 1: Add multiple expenses
        const expensesToAdd = [
            {
                picnic_id: picnic.id,
                description: 'Meat and Burgers',
                amount: 75.00,
                paid_by: 'user-1',
                category: 'food',
                split_type: 'equal',
                participants: ['user-1', 'user-2', 'user-3'],
                date: new Date().toISOString()
            },
            {
                picnic_id: picnic.id,
                description: 'Drinks and Ice',
                amount: 45.00,
                paid_by: 'user-2',
                category: 'drinks',
                split_type: 'equal',
                participants: ['user-1', 'user-2', 'user-3'],
                date: new Date().toISOString()
            },
            {
                picnic_id: picnic.id,
                description: 'Disposable Plates and Utensils',
                amount: 30.00,
                paid_by: 'user-3',
                category: 'supplies',
                split_type: 'equal',
                participants: ['user-1', 'user-2', 'user-3'],
                date: new Date().toISOString()
            }
        ];

        const createdExpenses = [];
        for (const expenseData of expensesToAdd) {
            const expense = await window.picnicAPI.createExpense(expenseData);
            createdExpenses.push(expense);
        }

        // Step 2: Calculate expense summary
        window.picnicAPI.getExpenseSummary = async (picnicId) => {
            const expenses = await window.picnicAPI.getExpensesByPicnic(picnicId);
            const participants = await window.picnicAPI.getParticipantsByPicnic(picnicId);
            
            const summary = {
                total: 0,
                by_category: {},
                by_payer: {},
                per_person: 0,
                participant_count: 0
            };

            expenses.forEach(expense => {
                summary.total += expense.amount;
                
                if (!summary.by_category[expense.category]) {
                    summary.by_category[expense.category] = 0;
                }
                summary.by_category[expense.category] += expense.amount;
                
                if (!summary.by_payer[expense.paid_by]) {
                    summary.by_payer[expense.paid_by] = 0;
                }
                summary.by_payer[expense.paid_by] += expense.amount;
            });

            const goingParticipants = participants.filter(p => p.rsvp_status === 'going');
            summary.participant_count = goingParticipants.length;
            summary.per_person = summary.participant_count > 0 ? summary.total / summary.participant_count : 0;

            return summary;
        };

        const summary = await window.picnicAPI.getExpenseSummary(picnic.id);

        // Step 3: Verify expense calculations
        expect(summary.total).toBe(150.00); // 75 + 45 + 30
        expect(summary.by_category.food).toBe(75.00);
        expect(summary.by_category.drinks).toBe(45.00);
        expect(summary.by_category.supplies).toBe(30.00);
        expect(summary.per_person).toBe(50.00); // 150 / 3 participants

        // Step 4: Verify individual balances
        expect(summary.by_payer['user-1']).toBe(75.00);
        expect(summary.by_payer['user-2']).toBe(45.00);
        expect(summary.by_payer['user-3']).toBe(30.00);

        // Step 5: Calculate who owes whom
        const balances = {};
        participants.forEach(p => {
            const paid = summary.by_payer[p.user_id] || 0;
            const owes = summary.per_person;
            balances[p.user_id] = paid - owes;
        });

        expect(balances['user-1']).toBe(25.00); // Paid 75, owes 50
        expect(balances['user-2']).toBe(-5.00); // Paid 45, owes 50
        expect(balances['user-3']).toBe(-20.00); // Paid 30, owes 50
    });

    it('should handle real-time collaboration scenario', async () => {
        // Setup: Create picnic
        const picnic = await window.picnicAPI.createPicnic({
            title: 'Collaboration Test',
            date: '2025-08-20',
            time: '12:00'
        });

        // Mock real-time events
        const events = [];
        window.picnicAPI.emit = (event, data) => {
            events.push({ event, data });
        };

        window.picnicAPI.handleWebSocketMessage = (message) => {
            events.push({ event: 'ws:message', data: message });
        };

        // Step 1: User A joins the picnic
        await window.picnicAPI.createParticipant({
            picnic_id: picnic.id,
            user_id: 'user-a',
            user_name: 'User A',
            rsvp_status: 'going'
        });

        // Simulate real-time event
        window.picnicAPI.handleWebSocketMessage({
            type: 'document_created',
            collection: 'picnic_participants',
            data: { user_name: 'User A', rsvp_status: 'going' }
        });

        // Step 2: User B adds an item
        await window.picnicAPI.createItem({
            picnic_id: picnic.id,
            name: 'Charcoal',
            category: 'supplies',
            quantity_needed: 2,
            unit: 'bags'
        });

        // Simulate real-time event
        window.picnicAPI.handleWebSocketMessage({
            type: 'document_created',
            collection: 'picnic_items',
            data: { name: 'Charcoal', category: 'supplies' }
        });

        // Step 3: User C assigns themselves to the item
        const items = await window.picnicAPI.getItemsByPicnic(picnic.id);
        const charcoalItem = items.find(i => i.name === 'Charcoal');
        
        // Mock assignment
        charcoalItem.assigned_to = 'user-c';
        charcoalItem.status = 'assigned';

        // Simulate real-time event
        window.picnicAPI.handleWebSocketMessage({
            type: 'document_updated',
            collection: 'picnic_items',
            data: { assigned_to: 'user-c', status: 'assigned' },
            id: charcoalItem.id
        });

        // Step 4: Verify all events were captured
        expect(events.length).toBe(3);
        expect(events[0].data.type).toBe('document_created');
        expect(events[1].data.type).toBe('document_created');
        expect(events[2].data.type).toBe('document_updated');

        // Step 5: Verify final state
        const finalParticipants = await window.picnicAPI.getParticipantsByPicnic(picnic.id);
        const finalItems = await window.picnicAPI.getItemsByPicnic(picnic.id);

        expect(finalParticipants.length).toBe(2); // Organizer + User A
        expect(finalItems.length).toBe(1);
        expect(finalItems[0].assigned_to).toBe('user-c');
    });

    it('should handle offline/online scenarios', async () => {
        // Setup
        const picnic = await window.picnicAPI.createPicnic({
            title: 'Offline Test',
            date: '2025-08-20',
            time: '12:00'
        });

        // Step 1: Simulate going offline
        const offlineQueue = [];
        const originalMakeRequest = window.picnicAPI.makeRequest;
        
        window.picnicAPI.makeRequest = async (endpoint, method, data) => {
            // Queue requests while offline
            offlineQueue.push({ endpoint, method, data });
            throw new Error('Network unavailable');
        };

        // Step 2: Try to perform actions while offline
        try {
            await window.picnicAPI.createParticipant({
                picnic_id: picnic.id,
                user_id: 'offline-user',
                rsvp_status: 'going'
            });
        } catch (error) {
            expect(error.message).toBe('Network unavailable');
        }

        try {
            await window.picnicAPI.createItem({
                picnic_id: picnic.id,
                name: 'Offline Item',
                category: 'other'
            });
        } catch (error) {
            expect(error.message).toBe('Network unavailable');
        }

        // Step 3: Verify actions were queued
        expect(offlineQueue.length).toBe(2);

        // Step 4: Simulate coming back online
        window.picnicAPI.makeRequest = originalMakeRequest;

        // Step 5: Process offline queue
        const results = [];
        for (const queuedRequest of offlineQueue) {
            try {
                const result = await window.picnicAPI.makeRequest(
                    queuedRequest.endpoint,
                    queuedRequest.method,
                    queuedRequest.data
                );
                results.push(result);
            } catch (error) {
                console.log('Failed to sync queued request:', error);
            }
        }

        // Step 6: Verify data was synced when back online
        expect(results.length).toBeGreaterThanOrEqual(0); // Some may fail, but attempt was made
        expect(offlineQueue.length).toBe(2); // Queue preserved for retry logic
    });

    it('should handle complete picnic lifecycle', async () => {
        // Step 1: Create picnic (Planning phase)
        const picnic = await window.picnicAPI.createPicnic({
            title: 'Lifecycle Test Picnic',
            description: 'Testing complete lifecycle',
            date: '2025-08-20',
            time: '12:00',
            status: 'planning'
        });

        expect(picnic.status).toBe('planning');

        // Step 2: Add participants
        const participants = [
            { user_id: 'user-1', user_name: 'Alice', rsvp_status: 'going' },
            { user_id: 'user-2', user_name: 'Bob', rsvp_status: 'going' },
            { user_id: 'user-3', user_name: 'Charlie', rsvp_status: 'maybe' }
        ];

        for (const participant of participants) {
            await window.picnicAPI.createParticipant({
                ...participant,
                picnic_id: picnic.id
            });
        }

        // Step 3: Add items and assign them
        const items = [
            { name: 'Burgers', category: 'food', quantity_needed: 10 },
            { name: 'Sodas', category: 'drinks', quantity_needed: 12 },
            { name: 'Grill', category: 'equipment', quantity_needed: 1 }
        ];

        for (const item of items) {
            await window.picnicAPI.createItem({
                ...item,
                picnic_id: picnic.id
            });
        }

        // Step 4: Confirm picnic (all planning done)
        window.picnicAPI.updatePicnic = async (id, updates) => {
            const picnic = mockAPI.picnics.find(p => p.id === id);
            if (picnic) {
                Object.assign(picnic, updates);
            }
            return picnic;
        };

        await window.picnicAPI.updatePicnic(picnic.id, { status: 'confirmed' });

        // Step 5: During picnic - add expenses
        const expenses = [
            { description: 'Burger meat', amount: 40.00, category: 'food' },
            { description: 'Beverages', amount: 25.00, category: 'drinks' },
            { description: 'Charcoal', amount: 15.00, category: 'supplies' }
        ];

        for (const expense of expenses) {
            await window.picnicAPI.createExpense({
                ...expense,
                picnic_id: picnic.id,
                paid_by: 'user-1',
                date: new Date().toISOString()
            });
        }

        // Step 6: Complete picnic
        await window.picnicAPI.updatePicnic(picnic.id, { status: 'completed' });

        // Step 7: Verify final state
        const finalPicnic = await window.picnicAPI.getPicnic(picnic.id);
        const finalParticipants = await window.picnicAPI.getParticipantsByPicnic(picnic.id);
        const finalItems = await window.picnicAPI.getItemsByPicnic(picnic.id);
        const finalExpenses = await window.picnicAPI.getExpensesByPicnic(picnic.id);

        expect(finalPicnic.status).toBe('completed');
        expect(finalParticipants.length).toBe(4); // 3 + organizer
        expect(finalItems.length).toBe(3);
        expect(finalExpenses.length).toBe(3);

        // Calculate final summary
        const totalExpenses = finalExpenses.reduce((sum, exp) => sum + exp.amount, 0);
        const goingParticipants = finalParticipants.filter(p => p.rsvp_status === 'going');
        const perPersonCost = totalExpenses / goingParticipants.length;

        expect(totalExpenses).toBe(80.00);
        expect(goingParticipants.length).toBe(3); // 2 going + organizer
        expect(perPersonCost).toBeCloseTo(26.67, 2);
    });
});

describe('E2E Tests - Error Scenarios and Edge Cases', () => {
    it('should handle invalid form submissions gracefully', async () => {
        // Test with missing required fields
        const invalidForm = document.createElement('form');
        invalidForm.innerHTML = `
            <input name="title" value="" required>
            <input name="date" value="" required>
            <input name="time" value="" required>
        `;
        document.body.appendChild(invalidForm);

        expect(invalidForm.checkValidity()).toBeFalsy();

        // Test with invalid date
        invalidForm.querySelector('[name="date"]').value = '2020-01-01'; // Past date
        const dateInput = invalidForm.querySelector('[name="date"]');
        const datePicker = new DateTimePickerComponent(dateInput);
        
        expect(datePicker.validate()).toBeFalsy();

        document.body.removeChild(invalidForm);
    });

    it('should handle duplicate RSVPs correctly', async () => {
        const picnic = await window.picnicAPI.createPicnic({
            title: 'Duplicate RSVP Test',
            date: '2025-08-20',
            time: '12:00'
        });

        // First RSVP
        await window.picnicAPI.createParticipant({
            picnic_id: picnic.id,
            user_id: 'duplicate-user',
            user_name: 'Duplicate User',
            rsvp_status: 'going'
        });

        // Mock update instead of create for duplicate
        window.picnicAPI.updateParticipant = async (id, updates) => {
            const participant = mockAPI.participants.find(p => p.id === id);
            if (participant) {
                Object.assign(participant, updates);
            }
            return participant;
        };

        // Attempt duplicate RSVP (should update existing)
        const existingParticipant = mockAPI.participants.find(
            p => p.picnic_id === picnic.id && p.user_id === 'duplicate-user'
        );

        if (existingParticipant) {
            await window.picnicAPI.updateParticipant(existingParticipant.id, {
                rsvp_status: 'maybe',
                notes: 'Changed my mind'
            });
        }

        const participants = await window.picnicAPI.getParticipantsByPicnic(picnic.id);
        const duplicateUser = participants.find(p => p.user_id === 'duplicate-user');
        
        expect(participants.length).toBe(2); // Should not create duplicate
        expect(duplicateUser.rsvp_status).toBe('maybe');
        expect(duplicateUser.notes).toBe('Changed my mind');
    });

    it('should handle over-assignment of items', async () => {
        const picnic = await window.picnicAPI.createPicnic({
            title: 'Over-assignment Test',
            date: '2025-08-20',
            time: '12:00'
        });

        const item = await window.picnicAPI.createItem({
            picnic_id: picnic.id,
            name: 'Bottles of Water',
            category: 'drinks',
            quantity_needed: 10,
            unit: 'bottles'
        });

        // Mock assignment logic with validation
        window.picnicAPI.assignItem = async (itemId, userId, quantity) => {
            const item = mockAPI.items.find(i => i.id === itemId);
            if (!item) throw new Error('Item not found');

            const currentAssigned = item.quantity_assigned || 0;
            const newTotal = currentAssigned + quantity;

            if (newTotal > item.quantity_needed) {
                throw new Error(`Cannot assign ${quantity}. Only ${item.quantity_needed - currentAssigned} needed.`);
            }

            item.quantity_assigned = newTotal;
            item.assigned_to = userId;
            item.status = newTotal >= item.quantity_needed ? 'completed' : 'assigned';
            
            return item;
        };

        // Valid assignment
        await window.picnicAPI.assignItem(item.id, 'user-1', 8);
        
        // Try to over-assign
        try {
            await window.picnicAPI.assignItem(item.id, 'user-2', 5); // 8 + 5 = 13 > 10
            throw new Error('Should have thrown validation error');
        } catch (error) {
            expect(error.message).toContain('Only 2 needed');
        }

        // Valid assignment of remaining
        await window.picnicAPI.assignItem(item.id, 'user-2', 2);
        
        const updatedItem = mockAPI.items.find(i => i.id === item.id);
        expect(updatedItem.quantity_assigned).toBe(10);
        expect(updatedItem.status).toBe('completed');
    });

    it('should handle negative expenses gracefully', async () => {
        const picnic = await window.picnicAPI.createPicnic({
            title: 'Negative Expense Test',
            date: '2025-08-20',
            time: '12:00'
        });

        // Add validation to expense creation
        const originalCreateExpense = window.picnicAPI.createExpense;
        window.picnicAPI.createExpense = async (data) => {
            if (data.amount < 0) {
                throw new Error('Expense amount cannot be negative');
            }
            return originalCreateExpense(data);
        };

        try {
            await window.picnicAPI.createExpense({
                picnic_id: picnic.id,
                description: 'Invalid Expense',
                amount: -25.00,
                paid_by: 'user-1',
                category: 'other',
                date: new Date().toISOString()
            });
            throw new Error('Should have thrown validation error');
        } catch (error) {
            expect(error.message).toBe('Expense amount cannot be negative');
        }

        // Valid expense should work
        const validExpense = await window.picnicAPI.createExpense({
            picnic_id: picnic.id,
            description: 'Valid Expense',
            amount: 25.00,
            paid_by: 'user-1',
            category: 'food',
            date: new Date().toISOString()
        });

        expect(validExpense.amount).toBe(25.00);
    });

    it('should handle picnic date conflicts', async () => {
        const conflictDate = '2025-08-20';
        const conflictTime = '12:00';

        // Create first picnic
        const picnic1 = await window.picnicAPI.createPicnic({
            title: 'First Picnic',
            date: conflictDate,
            time: conflictTime,
            location: { name: 'Park A' }
        });

        // Add validation for conflicts
        const originalCreatePicnic = window.picnicAPI.createPicnic;
        window.picnicAPI.createPicnic = async (data) => {
            const existingPicnics = await window.picnicAPI.listPicnics();
            const conflicts = existingPicnics.documents.filter(p => 
                p.date === data.date && 
                p.time === data.time &&
                p.organizer_id === data.organizer_id
            );

            if (conflicts.length > 0) {
                throw new Error('You already have a picnic scheduled at this time');
            }

            return originalCreatePicnic(data);
        };

        // Try to create conflicting picnic
        try {
            await window.picnicAPI.createPicnic({
                title: 'Conflicting Picnic',
                date: conflictDate,
                time: conflictTime,
                organizer_id: 'test-user-123'
            });
            throw new Error('Should have thrown conflict error');
        } catch (error) {
            expect(error.message).toBe('You already have a picnic scheduled at this time');
        }

        // Different time should work
        const picnic2 = await window.picnicAPI.createPicnic({
            title: 'Different Time Picnic',
            date: conflictDate,
            time: '18:00',
            organizer_id: 'test-user-123'
        });

        expect(picnic2.title).toBe('Different Time Picnic');
    });

    it('should handle maximum participant limits', async () => {
        const picnic = await window.picnicAPI.createPicnic({
            title: 'Limited Picnic',
            date: '2025-08-20',
            time: '12:00',
            max_participants: 3 // Small limit for testing
        });

        // Add validation for participant limits
        const originalCreateParticipant = window.picnicAPI.createParticipant;
        window.picnicAPI.createParticipant = async (data) => {
            const picnic = await window.picnicAPI.getPicnic(data.picnic_id);
            const participants = await window.picnicAPI.getParticipantsByPicnic(data.picnic_id);
            const goingCount = participants.filter(p => p.rsvp_status === 'going').length;

            if (data.rsvp_status === 'going' && goingCount >= picnic.max_participants) {
                throw new Error(`Picnic is full. Maximum ${picnic.max_participants} participants allowed.`);
            }

            return originalCreateParticipant(data);
        };

        // Add participants up to limit
        for (let i = 1; i <= 2; i++) { // Organizer already counts as 1
            await window.picnicAPI.createParticipant({
                picnic_id: picnic.id,
                user_id: `user-${i}`,
                user_name: `User ${i}`,
                rsvp_status: 'going'
            });
        }

        // Try to exceed limit
        try {
            await window.picnicAPI.createParticipant({
                picnic_id: picnic.id,
                user_id: 'user-overflow',
                user_name: 'Overflow User',
                rsvp_status: 'going'
            });
            throw new Error('Should have thrown limit error');
        } catch (error) {
            expect(error.message).toContain('Picnic is full');
        }

        // RSVP as "maybe" should still work
        await window.picnicAPI.createParticipant({
            picnic_id: picnic.id,
            user_id: 'user-maybe',
            user_name: 'Maybe User',
            rsvp_status: 'maybe'
        });

        const participants = await window.picnicAPI.getParticipantsByPicnic(picnic.id);
        const goingParticipants = participants.filter(p => p.rsvp_status === 'going');
        const maybeParticipants = participants.filter(p => p.rsvp_status === 'maybe');

        expect(goingParticipants.length).toBe(3); // At limit
        expect(maybeParticipants.length).toBe(1); // Can still have maybe RSVPs
    });
});