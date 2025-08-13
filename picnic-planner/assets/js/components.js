/**
 * PicnicPro UI Components and Utilities
 * Reusable components and helper functions
 */

/**
 * Component Registry for dynamic UI elements
 */
class ComponentRegistry {
    constructor() {
        this.components = new Map();
        this.instances = new Map();
    }

    /**
     * Register a component
     */
    register(name, componentClass) {
        this.components.set(name, componentClass);
    }

    /**
     * Create component instance
     */
    create(name, element, options = {}) {
        const ComponentClass = this.components.get(name);
        if (!ComponentClass) {
            throw new Error(`Component '${name}' not found`);
        }
        
        const instance = new ComponentClass(element, options);
        this.instances.set(element, instance);
        return instance;
    }

    /**
     * Get component instance
     */
    getInstance(element) {
        return this.instances.get(element);
    }

    /**
     * Destroy component instance
     */
    destroy(element) {
        const instance = this.instances.get(element);
        if (instance && instance.destroy) {
            instance.destroy();
        }
        this.instances.delete(element);
    }
}

/**
 * Drag and Drop Component for item assignment
 */
class DragDropComponent {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            draggableSelector: '.draggable',
            dropzoneSelector: '.dropzone',
            dragClass: 'dragging',
            overClass: 'drag-over',
            ...options
        };
        
        this.init();
    }

    init() {
        // Enable dragging on draggable elements
        this.element.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.element.addEventListener('dragend', this.handleDragEnd.bind(this));
        
        // Enable dropping on dropzones
        this.element.addEventListener('dragover', this.handleDragOver.bind(this));
        this.element.addEventListener('dragenter', this.handleDragEnter.bind(this));
        this.element.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.element.addEventListener('drop', this.handleDrop.bind(this));
    }

    handleDragStart(e) {
        const draggable = e.target.closest(this.options.draggableSelector);
        if (!draggable) return;
        
        draggable.classList.add(this.options.dragClass);
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', draggable.outerHTML);
        e.dataTransfer.setData('text/plain', draggable.dataset.id || '');
    }

    handleDragEnd(e) {
        const draggable = e.target.closest(this.options.draggableSelector);
        if (!draggable) return;
        
        draggable.classList.remove(this.options.dragClass);
    }

    handleDragOver(e) {
        const dropzone = e.target.closest(this.options.dropzoneSelector);
        if (!dropzone) return;
        
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    }

    handleDragEnter(e) {
        const dropzone = e.target.closest(this.options.dropzoneSelector);
        if (!dropzone) return;
        
        dropzone.classList.add(this.options.overClass);
    }

    handleDragLeave(e) {
        const dropzone = e.target.closest(this.options.dropzoneSelector);
        if (!dropzone) return;
        
        // Only remove class if leaving the dropzone completely
        if (!dropzone.contains(e.relatedTarget)) {
            dropzone.classList.remove(this.options.overClass);
        }
    }

    handleDrop(e) {
        const dropzone = e.target.closest(this.options.dropzoneSelector);
        if (!dropzone) return;
        
        e.preventDefault();
        dropzone.classList.remove(this.options.overClass);
        
        const draggedId = e.dataTransfer.getData('text/plain');
        const dropzoneId = dropzone.dataset.id;
        
        // Emit custom event
        this.element.dispatchEvent(new CustomEvent('item-dropped', {
            detail: {
                draggedId,
                dropzoneId,
                dropzone,
                originalEvent: e
            }
        }));
    }

    destroy() {
        // Remove event listeners
        this.element.removeEventListener('dragstart', this.handleDragStart);
        this.element.removeEventListener('dragend', this.handleDragEnd);
        this.element.removeEventListener('dragover', this.handleDragOver);
        this.element.removeEventListener('dragenter', this.handleDragEnter);
        this.element.removeEventListener('dragleave', this.handleDragLeave);
        this.element.removeEventListener('drop', this.handleDrop);
    }
}

/**
 * Auto-suggest Component for location input
 */
class AutoSuggestComponent {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            minLength: 2,
            debounceTime: 300,
            maxResults: 5,
            dataSource: null,
            onSelect: null,
            ...options
        };
        
        this.suggestions = [];
        this.currentIndex = -1;
        this.isOpen = false;
        
        this.init();
    }

    init() {
        this.createSuggestionsList();
        this.element.addEventListener('input', this.debounce(this.handleInput.bind(this), this.options.debounceTime));
        this.element.addEventListener('keydown', this.handleKeydown.bind(this));
        this.element.addEventListener('blur', this.handleBlur.bind(this));
        
        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!this.element.contains(e.target) && !this.suggestionsList.contains(e.target)) {
                this.closeSuggestions();
            }
        });
    }

    createSuggestionsList() {
        this.suggestionsList = document.createElement('div');
        this.suggestionsList.className = 'auto-suggest-list';
        this.suggestionsList.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: var(--bg-card);
            border: 1px solid var(--border-medium);
            border-radius: var(--radius-md);
            box-shadow: var(--shadow-lg);
            max-height: 200px;
            overflow-y: auto;
            z-index: 1000;
            display: none;
        `;
        
        // Insert after the input element
        this.element.parentNode.insertBefore(this.suggestionsList, this.element.nextSibling);
        
        // Make parent position relative if needed
        const parent = this.element.parentNode;
        if (getComputedStyle(parent).position === 'static') {
            parent.style.position = 'relative';
        }
    }

    async handleInput(e) {
        const value = e.target.value.trim();
        
        if (value.length < this.options.minLength) {
            this.closeSuggestions();
            return;
        }

        try {
            const suggestions = await this.getSuggestions(value);
            this.showSuggestions(suggestions);
        } catch (error) {
            console.error('Failed to get suggestions:', error);
            this.closeSuggestions();
        }
    }

    async getSuggestions(query) {
        if (typeof this.options.dataSource === 'function') {
            return await this.options.dataSource(query);
        }
        
        if (Array.isArray(this.options.dataSource)) {
            return this.options.dataSource
                .filter(item => item.toLowerCase().includes(query.toLowerCase()))
                .slice(0, this.options.maxResults);
        }
        
        // Default location suggestions (mock data)
        const defaultLocations = [
            'Central Park, New York',
            'Golden Gate Park, San Francisco',
            'Millennium Park, Chicago',
            'Balboa Park, San Diego',
            'Prospect Park, Brooklyn',
            'Griffith Park, Los Angeles',
            'Washington Square Park, New York',
            'Battery Park, New York',
            'Hyde Park, London',
            'Regent\'s Park, London'
        ];
        
        return defaultLocations
            .filter(location => location.toLowerCase().includes(query.toLowerCase()))
            .slice(0, this.options.maxResults);
    }

    showSuggestions(suggestions) {
        this.suggestions = suggestions;
        this.currentIndex = -1;
        
        if (suggestions.length === 0) {
            this.closeSuggestions();
            return;
        }
        
        this.suggestionsList.innerHTML = suggestions
            .map((suggestion, index) => `
                <div class="auto-suggest-item" data-index="${index}" style="
                    padding: var(--spacing-sm) var(--spacing-md);
                    cursor: pointer;
                    border-bottom: 1px solid var(--border-light);
                    transition: background var(--transition-fast);
                " onmouseover="this.style.background='var(--bg-secondary)'" 
                   onmouseout="this.style.background='transparent'"
                   onclick="window.components.handleSuggestionClick(this)">
                    ${this.formatSuggestion(suggestion)}
                </div>
            `)
            .join('');
        
        this.suggestionsList.style.display = 'block';
        this.isOpen = true;
    }

    formatSuggestion(suggestion) {
        // Override this method to customize suggestion display
        return typeof suggestion === 'string' ? suggestion : suggestion.name || suggestion.toString();
    }

    handleKeydown(e) {
        if (!this.isOpen) return;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.currentIndex = Math.min(this.currentIndex + 1, this.suggestions.length - 1);
                this.highlightSuggestion();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.currentIndex = Math.max(this.currentIndex - 1, -1);
                this.highlightSuggestion();
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.currentIndex >= 0) {
                    this.selectSuggestion(this.suggestions[this.currentIndex]);
                }
                break;
                
            case 'Escape':
                this.closeSuggestions();
                break;
        }
    }

    handleBlur() {
        // Delay closing to allow click events on suggestions
        setTimeout(() => {
            this.closeSuggestions();
        }, 150);
    }

    highlightSuggestion() {
        const items = this.suggestionsList.querySelectorAll('.auto-suggest-item');
        items.forEach((item, index) => {
            item.style.background = index === this.currentIndex ? 'var(--bg-secondary)' : 'transparent';
        });
    }

    selectSuggestion(suggestion) {
        this.element.value = typeof suggestion === 'string' ? suggestion : suggestion.name || suggestion.toString();
        this.closeSuggestions();
        
        if (this.options.onSelect) {
            this.options.onSelect(suggestion);
        }
        
        // Trigger change event
        this.element.dispatchEvent(new Event('change', { bubbles: true }));
    }

    closeSuggestions() {
        this.suggestionsList.style.display = 'none';
        this.isOpen = false;
        this.currentIndex = -1;
    }

    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    destroy() {
        this.suggestionsList.remove();
    }
}

/**
 * Date/Time Picker Component
 */
class DateTimePickerComponent {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            format: 'YYYY-MM-DD',
            minDate: null,
            maxDate: null,
            defaultTime: '12:00',
            ...options
        };
        
        this.init();
    }

    init() {
        // Set default constraints
        if (this.options.minDate) {
            this.element.min = this.options.minDate;
        } else {
            // Default to today
            const today = new Date().toISOString().split('T')[0];
            this.element.min = today;
        }
        
        if (this.options.maxDate) {
            this.element.max = this.options.maxDate;
        }
        
        // Add validation
        this.element.addEventListener('change', this.validate.bind(this));
    }

    validate() {
        const value = new Date(this.element.value);
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        
        if (value < today) {
            this.element.setCustomValidity('Please select a future date');
            this.element.reportValidity();
            return false;
        }
        
        this.element.setCustomValidity('');
        return true;
    }

    getValue() {
        return this.element.value;
    }

    setValue(date) {
        if (date instanceof Date) {
            this.element.value = date.toISOString().split('T')[0];
        } else {
            this.element.value = date;
        }
        this.validate();
    }
}

/**
 * Rich Text Editor Component
 */
class RichTextEditorComponent {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            placeholder: 'Start typing...',
            maxLength: 1000,
            showCharCount: true,
            autoResize: true,
            ...options
        };
        
        this.init();
    }

    init() {
        this.setupTextarea();
        this.createCharCounter();
        
        if (this.options.autoResize) {
            this.setupAutoResize();
        }
    }

    setupTextarea() {
        this.element.placeholder = this.options.placeholder;
        if (this.options.maxLength) {
            this.element.maxLength = this.options.maxLength;
        }
        
        this.element.addEventListener('input', this.handleInput.bind(this));
    }

    createCharCounter() {
        if (!this.options.showCharCount) return;
        
        this.charCounter = document.createElement('div');
        this.charCounter.className = 'char-counter';
        this.charCounter.style.cssText = `
            text-align: right;
            font-size: 0.8rem;
            color: var(--text-muted);
            margin-top: var(--spacing-xs);
        `;
        
        this.element.parentNode.insertBefore(this.charCounter, this.element.nextSibling);
        this.updateCharCounter();
    }

    setupAutoResize() {
        this.element.style.resize = 'none';
        this.element.style.overflow = 'hidden';
        
        this.element.addEventListener('input', () => {
            this.element.style.height = 'auto';
            this.element.style.height = this.element.scrollHeight + 'px';
        });
        
        // Initial resize
        this.element.style.height = this.element.scrollHeight + 'px';
    }

    handleInput() {
        this.updateCharCounter();
        
        // Emit custom event
        this.element.dispatchEvent(new CustomEvent('rich-text-change', {
            detail: {
                value: this.element.value,
                length: this.element.value.length
            }
        }));
    }

    updateCharCounter() {
        if (!this.charCounter) return;
        
        const current = this.element.value.length;
        const max = this.options.maxLength;
        
        if (max) {
            this.charCounter.textContent = `${current}/${max}`;
            if (current > max * 0.9) {
                this.charCounter.style.color = 'var(--warning-color)';
            } else if (current === max) {
                this.charCounter.style.color = 'var(--danger-color)';
            } else {
                this.charCounter.style.color = 'var(--text-muted)';
            }
        } else {
            this.charCounter.textContent = `${current} characters`;
        }
    }

    getValue() {
        return this.element.value;
    }

    setValue(value) {
        this.element.value = value;
        this.handleInput();
    }

    destroy() {
        if (this.charCounter) {
            this.charCounter.remove();
        }
    }
}

/**
 * Progress Bar Component
 */
class ProgressBarComponent {
    constructor(element, options = {}) {
        this.element = element;
        this.options = {
            min: 0,
            max: 100,
            value: 0,
            showLabel: true,
            animated: true,
            color: 'var(--primary-color)',
            ...options
        };
        
        this.init();
    }

    init() {
        this.element.className = 'progress-bar';
        this.element.style.cssText = `
            width: 100%;
            height: 8px;
            background: var(--bg-tertiary);
            border-radius: var(--radius-md);
            overflow: hidden;
            position: relative;
        `;
        
        this.bar = document.createElement('div');
        this.bar.className = 'progress-bar-fill';
        this.bar.style.cssText = `
            height: 100%;
            background: ${this.options.color};
            border-radius: var(--radius-md);
            transition: width 0.3s ease;
            width: 0%;
        `;
        
        if (this.options.animated) {
            this.bar.style.background = `linear-gradient(90deg, 
                ${this.options.color} 0%, 
                ${this.options.color}CC 50%, 
                ${this.options.color} 100%)`;
            this.bar.style.backgroundSize = '200% 100%';
            this.bar.style.animation = 'progress-shine 2s infinite linear';
        }
        
        this.element.appendChild(this.bar);
        
        if (this.options.showLabel) {
            this.createLabel();
        }
        
        this.setValue(this.options.value);
    }

    createLabel() {
        this.label = document.createElement('div');
        this.label.className = 'progress-label';
        this.label.style.cssText = `
            text-align: center;
            font-size: 0.8rem;
            color: var(--text-secondary);
            margin-top: var(--spacing-xs);
        `;
        
        this.element.parentNode.insertBefore(this.label, this.element.nextSibling);
    }

    setValue(value) {
        this.value = Math.max(this.options.min, Math.min(this.options.max, value));
        const percentage = ((this.value - this.options.min) / (this.options.max - this.options.min)) * 100;
        
        this.bar.style.width = `${percentage}%`;
        
        if (this.label) {
            this.label.textContent = `${Math.round(percentage)}%`;
        }
        
        // Emit custom event
        this.element.dispatchEvent(new CustomEvent('progress-change', {
            detail: {
                value: this.value,
                percentage: percentage
            }
        }));
    }

    getValue() {
        return this.value;
    }

    setColor(color) {
        this.options.color = color;
        this.bar.style.background = color;
    }

    destroy() {
        if (this.label) {
            this.label.remove();
        }
    }
}

/**
 * Utility Functions
 */
const Utils = {
    /**
     * Format currency
     */
    formatCurrency(amount, currency = 'USD') {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    /**
     * Format date
     */
    formatDate(date, options = {}) {
        const defaultOptions = {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        
        return new Intl.DateTimeFormat('en-US', { ...defaultOptions, ...options }).format(new Date(date));
    },

    /**
     * Format relative time
     */
    formatRelativeTime(date) {
        const now = new Date();
        const targetDate = new Date(date);
        const diffTime = targetDate.getTime() - now.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Tomorrow';
        if (diffDays === -1) return 'Yesterday';
        if (diffDays > 1 && diffDays <= 7) return `In ${diffDays} days`;
        if (diffDays < -1 && diffDays >= -7) return `${Math.abs(diffDays)} days ago`;
        
        return this.formatDate(date);
    },

    /**
     * Sanitize HTML
     */
    sanitizeHTML(html) {
        const temp = document.createElement('div');
        temp.textContent = html;
        return temp.innerHTML;
    },

    /**
     * Generate unique ID
     */
    generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },

    /**
     * Throttle function calls
     */
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    /**
     * Check if element is in viewport
     */
    isInViewport(element) {
        const rect = element.getBoundingClientRect();
        return (
            rect.top >= 0 &&
            rect.left >= 0 &&
            rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
            rect.right <= (window.innerWidth || document.documentElement.clientWidth)
        );
    },

    /**
     * Smooth scroll to element
     */
    scrollToElement(element, offset = 0) {
        const elementPosition = element.offsetTop;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
    },

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch (err) {
            // Fallback
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            try {
                document.execCommand('copy');
                return true;
            } catch (err) {
                return false;
            } finally {
                document.body.removeChild(textArea);
            }
        }
    }
};

// Initialize component registry
const components = new ComponentRegistry();

// Register components
components.register('drag-drop', DragDropComponent);
components.register('auto-suggest', AutoSuggestComponent);
components.register('date-time-picker', DateTimePickerComponent);
components.register('rich-text-editor', RichTextEditorComponent);
components.register('progress-bar', ProgressBarComponent);

// Global utility functions
window.components = components;
window.Utils = Utils;

// Handle suggestion clicks (global handler for autosuggest)
window.components.handleSuggestionClick = function(element) {
    const index = parseInt(element.dataset.index);
    const input = element.closest('.auto-suggest-list').previousElementSibling;
    const component = components.getInstance(input);
    if (component) {
        component.selectSuggestion(component.suggestions[index]);
    }
};

// Auto-initialize components with data attributes
document.addEventListener('DOMContentLoaded', () => {
    // Initialize auto-suggest on location inputs
    document.querySelectorAll('input[name="locationName"], input[name="locationAddress"]').forEach(input => {
        components.create('auto-suggest', input, {
            minLength: 2,
            maxResults: 5,
            onSelect: (suggestion) => {
                console.log('Location selected:', suggestion);
            }
        });
    });
    
    // Initialize rich text editors on textareas
    document.querySelectorAll('textarea').forEach(textarea => {
        if (!textarea.dataset.noRichText) {
            components.create('rich-text-editor', textarea, {
                maxLength: parseInt(textarea.maxLength) || 1000,
                showCharCount: true,
                autoResize: true
            });
        }
    });
    
    // Initialize date pickers
    document.querySelectorAll('input[type="date"]').forEach(input => {
        components.create('date-time-picker', input);
    });
});

// Add progress bar animation keyframes
const style = document.createElement('style');
style.textContent = `
    @keyframes progress-shine {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
    }
`;
document.head.appendChild(style);