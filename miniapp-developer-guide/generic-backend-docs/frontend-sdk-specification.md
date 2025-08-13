# Olamo Frontend SDK Specification

**Document Version**: 1.0.0  
**Last Updated**: August 13, 2025  
**Status**: Draft  

## Overview
A comprehensive JavaScript SDK that provides a unified interface for Olamo miniapps to interact with the generic backend service, with full version compatibility and security features.

## Version Information
- **Current SDK Version**: 2.3.1
- **Supported API Versions**: v1, v2
- **Minimum Backend Version**: 1.5.0
- **Maximum Backend Version**: 3.0.0

## Core Components

### 1. OlamoSDK Class Structure

```javascript
class OlamoSDK {
  constructor(options = {}) {
    this.version = '2.3.1';
    this.apiVersion = options.apiVersion || 'v2';
    this.auth = null;
    this.api = null;
    this.ws = null;
    this.storage = null;
    this.events = null;
    this.ui = null;
    this.initialized = false;
    this.compatibility = {
      minBackend: '1.5.0',
      maxBackend: '3.0.0',
      apiVersions: ['v2', 'v1']
    };
  }
  
  async init() {
    // Check version compatibility
    await this.checkCompatibility();
    
    // Initialize all modules
    await this.initAuth();
    await this.initAPI();
    await this.initWebSocket();
    await this.initStorage();
    return this;
  }
  
  async checkCompatibility() {
    const serverInfo = await this.getServerInfo();
    if (!this.isCompatible(serverInfo)) {
      throw new Error(`Version incompatibility: SDK ${this.version} requires backend ${this.compatibility.minBackend}-${this.compatibility.maxBackend}, got ${serverInfo.version}`);
    }
    this.negotiatedVersion = serverInfo.negotiatedVersion;
    this.serverCapabilities = serverInfo.capabilities;
  }
}
```

## API Endpoint Reference

### Actual Implementation Paths

**IMPORTANT**: The backend implementation uses these exact paths:

```javascript
const API_ENDPOINTS = {
  // Authentication
  AUTH_VERIFY: '/auth/verify',                    // POST - Verify JWT token
  AUTH_REFRESH: '/auth/refresh',                  // POST - Refresh token
  AUTH_USER: '/auth/user',                        // GET - Get user info
  
  // Collections Management
  LIST_COLLECTIONS: '/api/collections',           // GET - List all collections
  CREATE_COLLECTION: '/api/collections',          // POST - Create collection
  GET_COLLECTION: '/api/collections/{name}',      // GET - Get collection info
  DELETE_COLLECTION: '/api/collections/{name}',   // DELETE - Delete collection
  
  // Documents CRUD (Clean RESTful paths)
  LIST_DOCUMENTS: '/api/{collection}',            // GET - List documents
  CREATE_DOCUMENT: '/api/{collection}',           // POST - Create document
  GET_DOCUMENT: '/api/{collection}/{id}',         // GET - Get document
  UPDATE_DOCUMENT: '/api/{collection}/{id}',      // PUT - Update document
  PATCH_DOCUMENT: '/api/{collection}/{id}',       // PATCH - Partial update
  DELETE_DOCUMENT: '/api/{collection}/{id}',      // DELETE - Delete document
  
  // Batch Operations
  BATCH_OPERATIONS: '/api/batch',                 // POST - Batch operations
  
  // Advanced Queries
  QUERY: '/api/{collection}/query',               // POST - Advanced query
  SEARCH: '/api/{collection}/search',             // POST - Full-text search
  AGGREGATE: '/api/{collection}/aggregate',       // POST - Aggregations
  DISTINCT: '/api/{collection}/distinct/{field}', // GET - Distinct values
  
  // User Preferences
  GET_PREFERENCES: '/api/preferences',            // GET - Get all preferences
  UPDATE_PREFERENCES: '/api/preferences',         // PUT - Update preferences
  SET_PREFERENCE: '/api/preferences',             // POST - Set single preference
  GET_PREFERENCE: '/api/preferences/{key}',       // GET - Get single preference
  DELETE_PREFERENCE: '/api/preferences/{key}',    // DELETE - Delete preference
  RESET_PREFERENCES: '/api/preferences',          // DELETE with confirm=true
  LIST_NAMESPACES: '/api/preferences/namespaces', // GET - List namespaces
  
  // File Operations
  UPLOAD_FILE: '/api/files',                      // POST - Upload file
  DOWNLOAD_FILE: '/api/files/{id}',               // GET - Download file
  GET_FILE_URL: '/api/files/{id}/url',           // GET - Get signed URL
  DELETE_FILE: '/api/files/{id}',                // DELETE - Delete file
  LIST_FILES: '/api/files',                       // GET - List user's files
  
  // WebSocket
  WEBSOCKET: '/ws',                               // WebSocket connection
  WEBSOCKET_STATS: '/ws/stats',                   // GET - Connection stats
};
```

## Module Specifications

### 1. Authentication Module (OlamoAuth)

```javascript
class OlamoAuth {
  constructor() {
    this.user = null;
    this.token = null;
    this.groupId = null;
    this.permissions = [];
    this.tokenExpiry = null;
    this.refreshToken = null;
    this.sessionId = null;
    this.securityContext = null;
  }

  // Core methods
  async initialize()                    // Extract and validate JWT from URL
  getUser()                             // Get current user object
  getUserId()                           // Get user ID
  getDisplayName()                      // Get display name
  getGroupId()                          // Get group ID
  getToken()                            // Get JWT token
  getAuthHeader()                       // Get Authorization header
  
  // Enhanced Security Methods
  async validateToken()                 // Validate token signature and expiry
  async refreshToken()                  // Refresh expired token (works without valid access token)
  async revokeToken()                   // Revoke refresh token (requires valid access token)
  getTokenExpiry()                      // Get token expiration time
  isTokenExpired()                      // Check if token is expired
  getSessionId()                        // Get current session ID
  getTrustLevel()                       // Get security trust level
  
  // Permission checks
  hasPermission(permission)             // Check specific permission
  isAdmin()                             // Check if user is admin
  isMember()                            // Check if user is member
  canCreate(collection)                 // Check create permission
  canRead(collection, doc)              // Check read permission  
  canUpdate(collection, doc)            // Check update permission
  canDelete(collection, doc)            // Check delete permission
  
  // Events
  onAuthStateChanged(callback)          // Listen to auth changes
  onTokenRefresh(callback)              // Listen to token refresh
  onTokenExpire(callback)               // Listen to token expiration
  onSecurityEvent(callback)             // Listen to security events
}
```

### 2. Data API Module (OlamoDataAPI)

```javascript
class OlamoDataAPI {
  constructor(auth) {
    this.auth = auth;
    this.cache = new Map();
    this.pending = new Map();
  }

  // CRUD Operations (use /collections/{collection}/documents paths)
  async create(collection, data, options = {})
  async get(collection, id, options = {})
  async update(collection, id, data, options = {})
  async patch(collection, id, data, options = {})
  async delete(collection, id, options = {})
  async list(collection, options = {})
  
  // Batch Operations
  async batchCreate(collection, items)
  async batchUpdate(collection, updates)
  async batchDelete(collection, ids)
  
  // Query Operations
  async query(collection, queryObj)              // POST to /collections/{collection}/query
  async search(collection, searchParams = {})    // POST to /api/{collection}/search with JSON body
  async aggregate(collection, aggregations)       // POST to /collections/{collection}/aggregate
  async distinct(collection, field, filters)      // GET /collections/{collection}/distinct/{field}
  
  // Preferences (with namespace support)
  async getPreferences(namespace = null, keys = null)
  async setPreference(key, value, namespace = null)
  async updatePreferences(data, namespace = null)
  async deletePreference(key, namespace = null)
  async resetPreferences(namespace = null)
  async listPreferenceNamespaces()
  
  // File Operations
  async uploadFile(file, metadata = {}, isPublic = false)
  async downloadFile(fileId)
  async getFileUrl(fileId, expiration = 3600)
  async deleteFile(fileId)
  async listFiles(page = 1, limit = 20)
  
  // Collection Management
  async listCollections(includeStats = false)
  async createCollection(name, options = {})
  async getCollectionInfo(name, includeStats = false)
  async deleteCollection(name)
  
  // Caching
  enableCache(collection, ttl = 60000)
  clearCache(collection = null)
  getCached(collection, id)
  
  // Optimistic Updates
  optimisticCreate(collection, data)
  optimisticUpdate(collection, id, data)
  optimisticDelete(collection, id)
  rollback(operationId)
}
```

### 3. WebSocket Module (OlamoWebSocket)

```javascript
class OlamoWebSocket {
  constructor(auth) {
    this.auth = auth;
    this.ws = null;
    this.subscriptions = new Map();
    this.reconnectAttempts = 0;
    this.messageQueue = [];
  }

  // Connection Management
  connect()
  disconnect()
  reconnect()
  isConnected()
  
  // Subscriptions
  subscribe(collection, callback, options = {})
  unsubscribe(collection)
  unsubscribeAll()
  
  // Messaging
  send(message)
  broadcast(event, data)
  
  // Presence & Typing
  updatePresence(status)
  startTyping(context)
  stopTyping(context)
  
  // Events
  on(event, callback)
  off(event, callback)
  once(event, callback)
  
  // Internal
  handleMessage(message)
  handleReconnect()
  processQueue()
}
```

### 4. Local Storage Module (OlamoStorage)

```javascript
class OlamoStorage {
  constructor(options = {}) {
    this.prefix = options.prefix || 'olamo_';
    this.storage = options.storage || localStorage;
  }

  // Basic Operations
  set(key, value, ttl = null)
  get(key, defaultValue = null)
  remove(key)
  clear(prefix = null)
  
  // Advanced Operations
  has(key)
  keys(pattern = null)
  values(pattern = null)
  entries(pattern = null)
  
  // Batch Operations
  setMany(items)
  getMany(keys)
  removeMany(keys)
  
  // TTL Management
  setWithExpiry(key, value, ttl)
  getWithExpiry(key)
  cleanExpired()
  
  // Size Management
  getSize()
  getSizeOf(key)
  prune(maxSize)
}
```

### 5. Event System (OlamoEvents)

```javascript
class OlamoEvents {
  constructor() {
    this.events = new Map();
    this.wildcards = new Map();
  }

  // Event Management
  on(event, callback, options = {})
  off(event, callback)
  once(event, callback)
  emit(event, data)
  
  // Wildcard Support
  onAny(callback)
  offAny(callback)
  
  // Namespaced Events
  namespace(ns)
  
  // Event Filtering
  filter(predicate)
  
  // Async Events
  emitAsync(event, data)
  waitFor(event, timeout = 5000)
  
  // Event History
  enableHistory(maxSize = 100)
  getHistory(event = null)
  clearHistory()
}
```

### 6. UI Helper Module (OlamoUI)

```javascript
class OlamoUI {
  constructor() {
    this.notifications = [];
    this.modals = [];
    this.toasts = [];
  }

  // Loading States
  showLoading(message = null)
  hideLoading()
  setLoadingMessage(message)
  
  // Error Handling
  showError(message, options = {})
  showSuccess(message, options = {})
  showWarning(message, options = {})
  showInfo(message, options = {})
  
  // Notifications
  notify(title, body, options = {})
  clearNotifications()
  
  // Toasts
  toast(message, type = 'info', duration = 3000)
  
  // Modals
  confirm(message, options = {})
  prompt(message, defaultValue = '', options = {})
  alert(message, options = {})
  
  // Forms
  validateForm(formElement)
  serializeForm(formElement)
  resetForm(formElement)
  
  // Utilities
  formatDate(date, format = 'relative')
  formatNumber(number, options = {})
  sanitizeHTML(html)
  escapeHTML(text)
}
```

## Usage Examples

### 1. Basic Initialization

```javascript
// Initialize SDK
const olamo = new OlamoSDK();
await olamo.init();

// Access modules
const { auth, api, ws, storage, events, ui } = olamo;
```

### 2. CRUD Operations

```javascript
// Create a document (POST /collections/todos/documents)
const todo = await api.create('todos', {
  text: 'Buy groceries',
  completed: false
});

// Read a document (GET /collections/todos/documents/{id})
const doc = await api.get('todos', todo.id);

// Update a document (PUT /collections/todos/documents/{id})
await api.update('todos', todo.id, {
  completed: true
});

// Delete a document (DELETE /collections/todos/documents/{id})
await api.delete('todos', todo.id);

// List documents (GET /collections/todos/documents)
const result = await api.list('todos', {
  page: 1,
  limit: 20,
  sort: 'createdAt',
  order: 'desc',
  filter: 'status:active'  // Simple filter format
});
// Returns: { documents: [...], total: N, page: 1, limit: 20, hasNext: bool, hasPrev: bool }

// Batch operations (POST /collections/batch)
const batchResult = await api.batch([
  { operation: 'create', collection: 'todos', data: { text: 'Task 1' } },
  { operation: 'update', collection: 'todos', id: 'abc', data: { completed: true } },
  { operation: 'delete', collection: 'todos', id: 'xyz' }
]);
```

### 3. Real-time Subscriptions

```javascript
// Connect WebSocket (ws://host/ws?token={jwt})
ws.connect();

// Subscribe to collection changes
ws.subscribe('messages', (event) => {
  switch(event.type) {
    case 'document_created':
      addMessage(event.document);
      break;
    case 'document_updated':
      updateMessage(event.document);
      break;
    case 'document_deleted':
      removeMessage(event.id);
      break;
  }
}, 
// Optional filters for subscription
{
  status: 'active',
  userId: currentUser.id
});

// Room support
ws.joinRoom('room-123');
ws.sendToRoom('room-123', { message: 'Hello room!' });
ws.leaveRoom('room-123');

// Typing indicators
ws.send({ type: 'typing_start', context: 'chat' });
setTimeout(() => ws.send({ type: 'typing_stop', context: 'chat' }), 2000);

// Presence
ws.send({ type: 'presence', status: 'online', metadata: { activity: 'chatting' } });

// Direct document operations via WebSocket
ws.send({
  type: 'create',
  collection: 'messages',
  data: { text: 'Hello!', timestamp: new Date().toISOString() }
});

ws.send({
  type: 'update',
  collection: 'messages',
  id: 'msg-123',
  data: { edited: true, editedAt: new Date().toISOString() }
});

ws.send({
  type: 'delete',
  collection: 'messages',
  id: 'msg-123'
});
```

### 4. Advanced Queries

```javascript
// Advanced query with filters (POST /collections/posts/query)
const results = await api.query('posts', {
  filters: [
    { field: 'status', operator: '==', value: 'published' },
    { field: 'createdAt', operator: '>=', value: '2025-01-01' }
  ],
  or_filters: [  // Optional OR conditions
    [
      { field: 'category', operator: '==', value: 'tech' },
      { field: 'featured', operator: '==', value: true }
    ]
  ],
  sort: [{ field: 'createdAt', order: 'desc' }],
  page: 1,
  limit: 10,
  projection: {  // Optional field filtering
    include: ['title', 'content', 'author']
  }
});
// Returns: { results: [...], total: N, page: 1, limit: 10, hasNext: bool, aggregations: {...} }

// Full-text search (POST /api/posts/search with JSON body)
const searchResults = await api.search('posts', {
  q: 'javascript',                   // Search query (required)
  fields: ['title', 'content'],      // Fields to search (optional)
  fuzzy: false,                      // Fuzzy matching (optional)
  page: 1,                           // Page number (optional)
  limit: 20                          // Results per page (optional)
});

// Aggregation (POST /collections/orders/aggregate)
const stats = await api.aggregate('orders', [
  { type: 'count', alias: 'total_orders' },
  { type: 'sum', field: 'amount', alias: 'total_revenue' },
  { type: 'avg', field: 'amount', alias: 'average_order' },
  { type: 'group', field: 'category', alias: 'by_category' }
], 
// Optional filters
[
  { field: 'status', operator: '==', value: 'completed' }
]);

// Get distinct values (GET /collections/products/distinct/category)
const categories = await api.distinct('products', 'category', 'status:active');
```

### 5. Complete SDK Implementation

```javascript
class OlamoSDK {
  async init() {
    // Initialize auth from URL parameters
    this.auth = new OlamoAuth();
    await this.auth.initialize();  // Extracts JWT from URL
    
    // Initialize API with correct base URL
    this.api = new OlamoDataAPI(this.auth);
    this.api.baseURL = window.location.hostname === 'localhost' 
      ? 'http://localhost:8000' 
      : '';  // Same origin in production
    
    // Initialize WebSocket
    this.ws = new OlamoWebSocket(this.auth);
    this.ws.connect();
    
    // Initialize storage
    this.storage = new OlamoStorage({
      prefix: `olamo_${this.auth.miniappId}_`
    });
    
    return this;
  }
  
  // Helper method for API requests
  async request(path, options = {}) {
    const url = `${this.api.baseURL}${path}`;
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.auth.getToken()}`,
        'Content-Type': 'application/json',
        'X-Miniapp-Id': this.auth.miniappId || '',
        ...options.headers
      }
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new OlamoError({
        status: response.status,
        message: error.detail || error.message,
        code: error.code
      });
    }
    
    return response.json();
  }
}

// Initialize and use
const olamo = new OlamoSDK();
await olamo.init();

// Now use the SDK
const todos = await olamo.api.list('todos');
```

### 6. File Operations

```javascript
// Upload a file (POST /files)
const fileInput = document.getElementById('file');
const file = fileInput.files[0];

const uploaded = await api.uploadFile(file, {
  description: 'Profile photo',
  tags: ['avatar', 'user']
}, true);  // isPublic flag

// Get signed URL (GET /files/{id}/url)
const urlData = await api.getFileUrl(uploaded.id, 3600);  // 1 hour expiration
console.log(urlData.url);  // Use this URL to access the file

// Download file (GET /files/{id})
const blob = await api.downloadFile(uploaded.id);
const downloadUrl = URL.createObjectURL(blob);

// Delete file (DELETE /files/{id})
await api.deleteFile(uploaded.id);

// List user's files (GET /files)
const files = await api.listFiles(1, 20);
```

### 7. Collection Management

```javascript
// List all collections (GET /collections)
const collections = await api.listCollections(true);  // Include stats
// Returns: { collections: [...], total: N, success: true }

// Create a collection (POST /collections)
await api.createCollection('products', {
  description: 'Product catalog',
  schema: {
    name: { type: 'string', required: true },
    price: { type: 'number', min: 0 },
    inStock: { type: 'boolean', default: true }
  },
  indexes: [
    { fields: ['name'], unique: true }
  ],
  permissions: {
    read: ['member', 'admin'],
    write: ['admin'],
    delete: ['admin']
  }
});

// Get collection info (GET /collections/{name})
const info = await api.getCollectionInfo('products', true);  // Include stats

// Delete collection (DELETE /api/collections/{name}?confirm=true)
// Note: Requires admin role or collection owner permission
// This will delete the collection and ALL its documents - use with caution!
try {
  const result = await api.deleteCollection('products');
  console.log(result.message); // "Collection 'products' and N documents deleted successfully"
} catch (error) {
  if (error.status === 403) {
    console.error('Permission denied - only admin or owner can delete');
  } else if (error.status === 400) {
    console.error('Deletion requires confirmation parameter');
  }
}
```

### 8. User Preferences

```javascript
// Get all preferences (GET /preferences)
const prefs = await api.getPreferences();

// Get preferences in namespace (GET /preferences?namespace=ui)
const uiPrefs = await api.getPreferences('ui');

// Set single preference (POST /preferences)
await api.setPreference('theme', 'dark', 'ui');  // With namespace

// Update multiple preferences (PUT /preferences)
await api.updatePreferences({
  theme: 'dark',
  language: 'en',
  itemsPerPage: 50
}, 'ui', true);  // namespace, merge flag

// Get single preference (GET /preferences/{key})
const theme = await api.getPreference('theme', 'ui', 'light');  // With default

// Delete preference (DELETE /preferences/{key})
await api.deletePreference('theme', 'ui');

// Reset all preferences (DELETE /preferences?confirm=true)
await api.resetPreferences('ui');  // Reset namespace

// List namespaces (GET /preferences/namespaces)
const namespaces = await api.listPreferenceNamespaces();
```

## Configuration

### SDK Configuration Object

```javascript
const config = {
  // API Configuration
  api: {
    baseURL: '',  // Auto-detected if not provided
    timeout: 30000,
    retries: 3,
    retryDelay: 1000
  },
  
  // WebSocket Configuration
  websocket: {
    reconnect: true,
    reconnectDelay: 1000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000
  },
  
  // Cache Configuration
  cache: {
    enabled: true,
    ttl: 60000,
    maxSize: 100,
    storage: 'memory'  // 'memory' | 'localStorage' | 'sessionStorage'
  },
  
  // Storage Configuration
  storage: {
    prefix: 'olamo_',
    storage: localStorage,
    encrypt: false
  },
  
  // UI Configuration
  ui: {
    theme: 'auto',  // 'light' | 'dark' | 'auto'
    notifications: true,
    sounds: false,
    animations: true
  },
  
  // Debug Configuration
  debug: {
    enabled: false,
    logLevel: 'error',  // 'error' | 'warn' | 'info' | 'debug'
    logToConsole: true,
    logToServer: false
  }
};

const olamo = new OlamoSDK(config);
```

## TypeScript Support

### Type Definitions

```typescript
// types/olamo-sdk.d.ts

interface OlamoUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
  role: 'admin' | 'member';
  permissions: string[];
}

interface OlamoDocument<T = any> {
  id: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
  data: T;
}

interface OlamoQuery {
  where?: Array<[string, WhereOperator, any]>;
  orderBy?: [string, 'asc' | 'desc'];
  limit?: number;
  offset?: number;
}

interface OlamoSubscription {
  unsubscribe(): void;
}

interface OlamoWebSocketEvent {
  type: string;
  collection?: string;
  data?: any;
  id?: string;
  metadata?: Record<string, any>;
}
```

## Error Handling

### Error Types

```javascript
class OlamoError extends Error {
  constructor(message, code, details) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

// Specific error types
class AuthError extends OlamoError {}
class NetworkError extends OlamoError {}
class ValidationError extends OlamoError {}
class PermissionError extends OlamoError {}
class NotFoundError extends OlamoError {}
```

### Error Handling Example

```javascript
try {
  await api.create('posts', data);
} catch (error) {
  if (error instanceof ValidationError) {
    ui.showError('Invalid data: ' + error.message);
  } else if (error instanceof PermissionError) {
    ui.showError('You do not have permission to create posts');
  } else if (error instanceof NetworkError) {
    ui.showError('Network error. Please try again.');
    // Retry logic
  } else {
    ui.showError('An unexpected error occurred');
    console.error(error);
  }
}
```

## Performance Optimizations

1. **Request Batching** - Combine multiple requests
2. **Debouncing** - Prevent excessive API calls
3. **Caching** - Store frequently accessed data
4. **Lazy Loading** - Load data on demand
5. **Virtual Scrolling** - For large lists
6. **Optimistic UI** - Update UI before server response
7. **Connection Pooling** - Reuse WebSocket connections

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari 14+, Chrome Mobile)

## Bundle Size

- Core SDK: ~25KB minified + gzipped
- With all modules: ~45KB minified + gzipped
- Tree-shakeable for smaller bundles

## CDN Distribution

```html
<!-- Development -->
<script src="https://cdn.olamo.app/sdk/latest/olamo-sdk.js"></script>

<!-- Production -->
<script src="https://cdn.olamo.app/sdk/latest/olamo-sdk.min.js"></script>

<!-- Specific version -->
<script src="https://cdn.olamo.app/sdk/1.0.0/olamo-sdk.min.js"></script>
```

## NPM Package

```bash
npm install @olamo/sdk
```

```javascript
import { OlamoSDK } from '@olamo/sdk';
```

## Version Compatibility Implementation

### 1. Version Negotiation

```javascript
class VersionManager {
  constructor(sdk) {
    this.sdk = sdk;
    this.supportedVersions = ['v2', 'v1'];
    this.negotiatedVersion = null;
  }
  
  async negotiate() {
    const response = await fetch('/api/version', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SDK-Version': this.sdk.version
      },
      body: JSON.stringify({
        preferredVersion: 'v2',
        acceptableVersions: this.supportedVersions,
        sdkVersion: this.sdk.version,
        capabilities: this.getClientCapabilities()
      })
    });
    
    const result = await response.json();
    
    if (!result.compatible) {
      throw new VersionError(
        `Incompatible versions: ${result.message}`,
        result.suggestedAction
      );
    }
    
    this.negotiatedVersion = result.negotiatedVersion;
    this.serverCapabilities = result.serverCapabilities;
    this.deprecationWarnings = result.deprecations || [];
    
    this.handleDeprecations();
    
    return result;
  }
  
  handleDeprecations() {
    this.deprecationWarnings.forEach(warning => {
      console.warn(`[DEPRECATION] ${warning.feature} will be removed on ${warning.sunset}. ${warning.migration}`);
    });
  }
}
```

### 2. Backward Compatibility Layer

```javascript
class BackwardCompatibilityAdapter {
  constructor(apiVersion) {
    this.apiVersion = apiVersion;
  }
  
  // Adapt v1 responses to v2 format
  adaptResponse(response, fromVersion, toVersion) {
    if (fromVersion === 'v1' && toVersion === 'v2') {
      return this.v1ToV2(response);
    }
    return response;
  }
  
  v1ToV2(response) {
    // v1 format: { data: {...}, success: true }
    // v2 format: { result: {...}, metadata: {...} }
    return {
      result: response.data,
      metadata: {
        success: response.success,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  // Adapt v2 requests to v1 format
  adaptRequest(request, fromVersion, toVersion) {
    if (fromVersion === 'v2' && toVersion === 'v1') {
      return this.v2ToV1Request(request);
    }
    return request;
  }
}
```

### 3. Enhanced Authentication Security Implementation

```javascript
class SecureAuthManager extends OlamoAuth {
  async initialize() {
    const urlParams = new URLSearchParams(window.location.search);
    this.token = urlParams.get('auth');
    
    if (!this.token) {
      throw new AuthError('No authentication token found');
    }
    
    // Validate token structure and signature
    await this.validateToken();
    
    // Extract and verify claims
    const payload = this.parseJWT(this.token);
    
    // Security checks
    this.verifyTokenBinding(payload);
    this.checkTokenExpiry(payload);
    this.validateAudience(payload);
    
    // Store user info
    this.user = payload.user;
    this.groupId = payload.context.groupId;
    this.permissions = payload.context.permissions;
    this.sessionId = payload.context.sessionId;
    this.securityContext = payload.security;
    
    // Setup auto-refresh
    this.setupTokenRefresh();
    
    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
    
    return this.user;
  }
  
  verifyTokenBinding(payload) {
    const currentFingerprint = this.getDeviceFingerprint();
    if (payload.client && payload.client.deviceFingerprint) {
      if (payload.client.deviceFingerprint !== currentFingerprint) {
        throw new SecurityError('Token binding mismatch');
      }
    }
  }
  
  async validateToken() {
    // Verify JWT signature using public key
    const publicKey = await this.getPublicKey();
    const isValid = await this.verifyJWTSignature(this.token, publicKey);
    
    if (!isValid) {
      throw new SecurityError('Invalid token signature');
    }
  }
  
  setupTokenRefresh() {
    const expiryTime = this.getTokenExpiry();
    const now = Date.now();
    const timeUntilExpiry = expiryTime - now;
    
    // Refresh 5 minutes before expiry
    const refreshTime = timeUntilExpiry - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      setTimeout(() => this.refreshToken(), refreshTime);
    }
  }
  
  async refreshToken() {
    try {
      // NOTE: This works even when access token is expired
      const response = await fetch('/auth/refresh', {
        method: 'POST',
        headers: {
          // Can use either header (refresh endpoint doesn't require valid access token)
          'X-Refresh-Token': this.refreshToken,
          // OR: 'Authorization': `Bearer ${this.refreshToken}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        this.token = data.access_token;
        this.refreshToken = data.refresh_token;
        this.tokenExpiry = Date.now() + (data.expires_in * 1000);
        
        // Notify listeners
        this.emit('tokenRefreshed', this.token);
        
        // Setup next refresh
        this.setupTokenRefresh();
        
        return data;
      } else if (response.status === 401) {
        // Refresh token is expired or revoked - need to login again
        this.emit('sessionExpired');
        throw new AuthError('Session expired - please login again');
      }
    } catch (error) {
      this.emit('tokenRefreshFailed', error);
      throw error;
    }
  }
  
  async revokeToken() {
    // Revoke refresh token to logout securely
    try {
      const response = await fetch('/auth/revoke', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.token}`,  // Requires valid access token
          'X-Refresh-Token': this.refreshToken
        }
      });
      
      if (response.ok) {
        this.token = null;
        this.refreshToken = null;
        this.user = null;
        this.emit('tokenRevoked');
        return true;
      }
    } catch (error) {
      console.error('Failed to revoke token:', error);
      return false;
    }
  }
}
```

### 4. Feature Detection and Progressive Enhancement

```javascript
class FeatureDetector {
  constructor(sdk) {
    this.sdk = sdk;
    this.features = new Map();
  }
  
  async detectFeatures() {
    const capabilities = await this.sdk.getServerCapabilities();
    
    // Map capabilities to features
    this.features.set('batchOperations', capabilities.includes('batch'));
    this.features.set('realtimeUpdates', capabilities.includes('websocket'));
    this.features.set('offlineSync', capabilities.includes('offline'));
    this.features.set('fileUpload', capabilities.includes('storage'));
    this.features.set('fullTextSearch', capabilities.includes('search'));
    
    return this.features;
  }
  
  supports(feature) {
    return this.features.get(feature) || false;
  }
  
  require(feature) {
    if (!this.supports(feature)) {
      throw new FeatureError(`Required feature '${feature}' is not available`);
    }
  }
  
  async withFallback(feature, primaryFn, fallbackFn) {
    if (this.supports(feature)) {
      return await primaryFn();
    } else {
      console.warn(`Feature '${feature}' not available, using fallback`);
      return await fallbackFn();
    }
  }
}
```

### 5. Version Migration Helper

```javascript
class MigrationHelper {
  static migrations = {
    '1.0_to_2.0': {
      description: 'Migrate from v1 to v2 API',
      steps: [
        'Update authentication flow',
        'Adapt response parsing',
        'Update WebSocket protocol'
      ],
      auto: true,
      handler: async (sdk) => {
        // Auto-migration logic
        sdk.api.responseAdapter = new BackwardCompatibilityAdapter('v1');
        sdk.ws.protocol = 'v2';
        console.log('Automatically migrated to v2 compatibility mode');
      }
    }
  };
  
  static async migrate(fromVersion, toVersion, sdk) {
    const key = `${fromVersion}_to_${toVersion}`;
    const migration = this.migrations[key];
    
    if (!migration) {
      throw new Error(`No migration path from ${fromVersion} to ${toVersion}`);
    }
    
    if (migration.auto) {
      await migration.handler(sdk);
    } else {
      console.warn(`Manual migration required: ${migration.description}`);
      migration.steps.forEach(step => console.log(`  - ${step}`));
    }
  }
}
```

This SDK specification provides a complete, developer-friendly interface for building Olamo miniapps with comprehensive version support, backward/forward compatibility, and enhanced security features.