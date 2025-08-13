# Generic Backend Service Specification for Olamo Miniapps

**Document Version**: 1.0.0  
**Last Updated**: August 13, 2025  
**Status**: Draft  
**Backend Service Version**: 2.0.0  

## Executive Summary
A universal backend service that provides all common functionality needed by Olamo miniapps, allowing developers to create miniapps using only frontend static files (HTML, CSS, JavaScript).

## Core Architecture

### 1. Service Design Pattern
The generic backend acts as a **Backend-as-a-Service (BaaS)** layer that:
- Handles all authentication and authorization
- Provides RESTful API endpoints for CRUD operations
- Manages WebSocket connections for real-time updates
- Interfaces with Firestore for data persistence
- Serves static frontend files

### 2. Data Model

#### 2.1 Collection Structure
All data is stored in Firestore with automatic scoping:
```
groups/{groupId}/miniapps/{miniappId}/collections/{collectionName}/documents/{docId}
```

#### 2.2 Document Schema
Every document automatically includes:
```json
{
  "id": "uuid",
  "createdAt": "ISO 8601 timestamp",
  "createdBy": "userId",
  "updatedAt": "ISO 8601 timestamp",
  "updatedBy": "userId",
  "groupId": "groupId",
  "miniappId": "miniappId",
  // ... user-defined fields
}
```

## API Specification

### Authentication
All endpoints require JWT Bearer token in Authorization header.

### Core Endpoints

#### 1. Static File Serving
```
GET /                       → frontend/index.html
GET /style.css             → frontend/style.css  
GET /script.js             → frontend/script.js
GET /lib/{filename}        → frontend/lib/{filename}
GET /assets/{filename}     → assets/{filename}
```

#### 2. Health & Auth
```
GET  /health               → {"status": "healthy"}
POST /auth/verify          → Verify token and return user info
POST /auth/refresh         → Refresh expired token (no valid access token needed)
POST /auth/revoke          → Revoke refresh token (requires valid access token)
GET  /auth/user            → Get current user details
```

#### 3. Generic CRUD Operations
```
# Collection operations
GET    /api/collections                     → List all collections
POST   /api/collections                     → Create collection (with body)
GET    /api/collections/{name}              → Get collection info
DELETE /api/collections/{name}?confirm=true → Delete collection (requires confirmation)

# Document operations  
GET    /api/{collection}                    → List documents (with pagination)
POST   /api/{collection}                    → Create document
GET    /api/{collection}/{id}               → Get document
PUT    /api/{collection}/{id}               → Update document
PATCH  /api/{collection}/{id}               → Partial update
DELETE /api/{collection}/{id}               → Delete document

# Batch operations (cross-collection)
POST   /api/batch                           → Batch operations (create/update/delete)

# Query operations
POST   /api/{collection}/query              → Advanced query with filters
```

#### 4. Real-time Operations
```
WebSocket /ws?token={jwt}                   → Real-time updates

# WebSocket message types:

## Collection Operations
- subscribe: {type: "subscribe", collection: "messages", filters: {...}}
- unsubscribe: {type: "unsubscribe", collection: "messages"}
- create: {type: "create", collection: "messages", data: {...}}
- update: {type: "update", collection: "messages", id: "...", data: {...}}
- delete: {type: "delete", collection: "messages", id: "..."}

## Presence & Activity
- presence: {type: "presence", status: "online|away|offline", metadata: {...}}
- typing_start: {type: "typing_start", context: "chat-room-1"}
- typing_stop: {type: "typing_stop", context: "chat-room-1"}

## Room Management
- join_room: {type: "join_room", room_id: "room-123"}
- leave_room: {type: "leave_room", room_id: "room-123"}
- room_message: {type: "room_message", room_id: "room-123", data: {...}}
```

#### 5. Special Features
```
# User preferences (per miniapp)
GET    /api/preferences                     → Get user preferences
PUT    /api/preferences                     → Update preferences

# File operations (GCS bucket)
POST   /api/files                           → Upload file
GET    /api/files                           → List user's files
GET    /api/files/{id}                      → Download file
GET    /api/files/{id}/url                  → Get signed URL
DELETE /api/files/{id}                      → Delete file

# Search
POST   /api/{collection}/search             → Full-text search (JSON body)
```

### Query Parameters

#### Pagination
```
?page=1&limit=20&sort=createdAt&order=desc
```

#### Filtering
```
?filter[field]=value&filter[field.gte]=100
```

#### Field selection
```
?fields=id,name,createdAt
```

## WebSocket Protocol

### Connection
```javascript
ws://host/ws?token={jwt_token}
```

### Message Format
```json
{
  "type": "event_type",
  "collection": "collection_name",
  "data": {},
  "metadata": {
    "userId": "...",
    "timestamp": "...",
    "groupId": "..."
  }
}
```

### Event Types
- `connected`: Connection established
- `document_created`: New document created
- `document_updated`: Document updated
- `document_deleted`: Document deleted
- `presence_update`: User presence changed
- `typing_start`: User started typing
- `typing_stop`: User stopped typing
- `room_join`: User joined room
- `room_leave`: User left room
- `room_message`: Message sent to room
- `error`: Error occurred

### Presence and Typing Examples

```javascript
// Update presence status
ws.send(JSON.stringify({
  type: 'presence',
  status: 'online',  // or 'away', 'offline'
  metadata: {
    activity: 'editing document',
    location: 'editor'
  }
}));

// Start typing indicator
ws.send(JSON.stringify({
  type: 'typing_start',
  context: 'chat-room-1'  // Context for typing indicator
}));

// Stop typing indicator (send after user stops typing)
ws.send(JSON.stringify({
  type: 'typing_stop',
  context: 'chat-room-1'
}));

// You'll receive these events from other users:
// {type: 'presence_update', user_id: 'user-123', presence: {status: 'online', ...}}
// {type: 'typing_start', user_id: 'user-456', context: 'chat-room-1'}
// {type: 'typing_stop', user_id: 'user-456', context: 'chat-room-1'}
```

## Permission Model

### Role-Based Access Control (RBAC)
```yaml
roles:
  admin:
    - create_any
    - read_any
    - update_any
    - delete_any
    - manage_collection
  
  member:
    - create_own
    - read_any
    - update_own
    - delete_own
```

### Document-Level Permissions
Documents can include permission fields:
```json
{
  "_permissions": {
    "read": ["public"],
    "write": ["owner", "admin"],
    "delete": ["owner", "admin"]
  }
}
```

## Frontend JavaScript SDK

### Core API Client
```javascript
class OlamoDataAPI {
  constructor(auth) {
    this.auth = auth;
    this.baseURL = '';
    this.ws = null;
  }

  // CRUD operations
  async create(collection, data) {}
  async read(collection, id) {}
  async update(collection, id, data) {}
  async delete(collection, id) {}
  async list(collection, options = {}) {}
  async query(collection, filters = {}) {}
  
  // Real-time
  subscribe(collection, callback) {}
  unsubscribe(collection) {}
  
  // Special
  async uploadFile(file) {}
  async updatePresence(status) {}
  async sendTyping(typing) {}
}
```

## Configuration via miniapp.json

```json
{
  "backend": {
    "type": "generic",
    "collections": [
      {
        "name": "messages",
        "schema": {
          "text": "string",
          "attachments": "array"
        },
        "permissions": {
          "create": ["member", "admin"],
          "read": ["member", "admin"],
          "update": ["owner", "admin"],
          "delete": ["owner", "admin"]
        },
        "realtime": true,
        "searchable": ["text"]
      },
      {
        "name": "settings",
        "singleton": true,
        "permissions": {
          "read": ["member", "admin"],
          "update": ["admin"]
        }
      }
    ],
    "features": {
      "fileUpload": true,
      "presence": true,
      "typing": true,
      "search": true
    }
  }
}
```

## Benefits

### For Developers
1. **No backend code needed** - Just HTML/CSS/JS
2. **Automatic data persistence** - Firestore integration built-in
3. **Real-time by default** - WebSocket support included
4. **Authentication handled** - JWT verification automatic
5. **Standardized API** - Consistent across all miniapps

### For Platform
1. **Reduced deployment complexity** - One backend serves many apps
2. **Better resource utilization** - Shared infrastructure
3. **Consistent security** - Centralized auth and permissions
4. **Easier maintenance** - Update once, benefit all apps
5. **Performance optimization** - Caching, connection pooling

## Migration Path

Existing miniapps can be migrated by:
1. Moving custom endpoints to frontend logic
2. Using generic CRUD instead of custom endpoints
3. Adapting to standardized WebSocket events
4. Updating frontend to use the new SDK

## Implementation Requirements

### Backend Service (Python/FastAPI)
- FastAPI framework
- JWT authentication
- Firestore integration
- WebSocket support
- CORS handling
- File upload to GCS
- Rate limiting
- Request validation

### Frontend SDK (JavaScript)
- Zero dependencies
- Promise-based API
- Automatic retries
- Offline queue
- Optimistic updates
- TypeScript definitions

## Security Considerations

1. **Input validation** - All inputs sanitized
2. **Rate limiting** - Per-user and per-IP
3. **SQL injection prevention** - Parameterized queries
4. **XSS protection** - Output encoding
5. **CORS policy** - Strict origin checking
6. **File upload restrictions** - Type and size limits
7. **JWT expiration** - Short-lived tokens
8. **Audit logging** - All operations logged

## Performance Optimizations

1. **Caching** - Redis for frequently accessed data
2. **Connection pooling** - Reuse database connections
3. **Pagination** - Default limits on list operations
4. **Lazy loading** - Load data on demand
5. **CDN for static files** - Serve from edge locations
6. **WebSocket multiplexing** - Single connection per user
7. **Database indexes** - On commonly queried fields

## Monitoring & Observability

1. **Health checks** - Liveness and readiness probes
2. **Metrics** - Request count, latency, errors
3. **Logging** - Structured JSON logs
4. **Tracing** - Distributed tracing support
5. **Alerts** - Error rate and latency alerts

## File Operations

### File Upload and Management

Files are managed as a RESTful resource with comprehensive operations:

```javascript
// Upload a file (POST /api/files)
const formData = new FormData();
formData.append('file', fileInput.files[0]);
formData.append('metadata', JSON.stringify({
  description: 'User avatar',
  tags: ['profile', 'avatar']
}));
formData.append('public', 'true');

const response = await fetch('/api/files', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
});

const uploaded = await response.json();
// Response:
{
  "id": "file-123",
  "filename": "avatar.jpg",
  "original_filename": "IMG_1234.jpg",
  "size": 245632,
  "content_type": "image/jpeg",
  "url": "https://storage.googleapis.com/...",  // If public
  "uploaded_at": "2025-01-15T10:30:00Z",
  "uploaded_by": "user-456"
}

// Get signed URL for private file (GET /api/files/{id}/url)
const urlResponse = await fetch('/api/files/file-123/url?expiration=3600', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { url, expires_in } = await urlResponse.json();

// Download file (GET /api/files/{id})
const fileResponse = await fetch('/api/files/file-123', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const blob = await fileResponse.blob();

// List user's files (GET /api/files)
const listResponse = await fetch('/api/files?page=1&limit=20', {
  headers: { 'Authorization': `Bearer ${token}` }
});
const { files, total } = await listResponse.json();

// Delete file (DELETE /api/files/{id})
await fetch('/api/files/file-123', {
  method: 'DELETE',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

## Search Operations

### Full-Text Search

The search endpoint uses POST to allow complex search queries without URL length limitations:

```javascript
// POST /api/{collection}/search
const response = await fetch('/api/products/search', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    q: 'laptop',                    // Search query (required)
    fields: ['name', 'description'], // Fields to search in (optional)
    fuzzy: false,                    // Enable fuzzy matching (optional)
    page: 1,                         // Page number (optional, default: 1)
    limit: 20                        // Results per page (optional, default: 20)
  })
});

// Response
{
  "results": [
    {
      "id": "prod-123",
      "data": {
        "name": "Gaming Laptop",
        "description": "High-performance laptop for gaming",
        "price": 1299
      }
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20,
  "has_next": true,
  "has_prev": false,
  "execution_time_ms": 23.5
}
```

## Batch Operations

### Cross-Collection Batch Operations

The batch endpoint allows executing multiple operations across different collections in a single request:

```javascript
// POST /api/batch
const response = await fetch('/api/batch', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    operations: [
      // Create in todos collection
      { 
        operation: 'create', 
        collection: 'todos', 
        data: { text: 'Buy milk', completed: false } 
      },
      // Update in users collection
      { 
        operation: 'update', 
        collection: 'users', 
        id: 'user-123',
        data: { lastActive: new Date().toISOString() } 
      },
      // Delete from messages collection
      { 
        operation: 'delete', 
        collection: 'messages', 
        id: 'msg-456' 
      }
    ],
    atomic: false  // If true, all operations must succeed or all fail
  })
});

// Response
{
  "success": true,
  "results": [
    { "operation": "create", "id": "todo-789", "success": true },
    { "operation": "update", "id": "user-123", "success": true },
    { "operation": "delete", "id": "msg-456", "success": true }
  ],
  "errors": [],
  "total": 3,
  "succeeded": 3,
  "failed": 0
}
```

## Collection Management Examples

### Creating a Collection Programmatically

```javascript
// POST /api/collections
const response = await fetch('/api/collections', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'products',
    description: 'Product catalog',
    schema: {
      name: { type: 'string', required: true },
      price: { type: 'number', min: 0 },
      inStock: { type: 'boolean', default: true }
    },
    indexes: [
      { fields: ['name'], unique: true },
      { fields: ['price', 'inStock'] }
    ],
    permissions: {
      read: ['member', 'admin'],
      write: ['admin'],
      delete: ['admin']
    }
  })
});

// Delete a collection (DELETE /api/collections/{name}?confirm=true)
// Requires admin role or collection owner
// Deletes the collection and ALL its documents
const deleteResponse = await fetch('/api/collections/old-products?confirm=true', {
  method: 'DELETE',
  headers: {
    'Authorization': `Bearer ${token}`
  }
});

if (deleteResponse.ok) {
  const result = await deleteResponse.json();
  console.log(result.message); // "Collection 'old-products' and 42 documents deleted successfully"
}
```

## Token Refresh Flow

### Refreshing Expired Tokens

The refresh endpoint allows obtaining new access tokens without requiring re-authentication:

```javascript
// When access token expires (401 response), use refresh token
async function handleTokenRefresh() {
  const response = await fetch('/auth/refresh', {
    method: 'POST',
    headers: {
      'X-Refresh-Token': localStorage.getItem('refreshToken')
      // Note: No Authorization header needed - works with expired access token
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    // Store new tokens
    localStorage.setItem('accessToken', data.access_token);
    localStorage.setItem('refreshToken', data.refresh_token);
    
    // Retry original request with new token
    return data.access_token;
  } else {
    // Refresh token expired - redirect to login
    window.location.href = '/login';
  }
}

// Auto-refresh before expiry
function setupAutoRefresh(expiresIn) {
  // Refresh 5 minutes before token expires
  const refreshTime = (expiresIn - 300) * 1000;
  setTimeout(handleTokenRefresh, refreshTime);
}

// Revoke tokens on logout
async function logout() {
  await fetch('/auth/revoke', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
      'X-Refresh-Token': localStorage.getItem('refreshToken')
    }
  });
  
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  window.location.href = '/login';
}
```

## Example Miniapp Using Generic Backend

### Simple Todo App (Frontend Only)

**miniapp.json:**
```json
{
  "name": "Simple Todo",
  "backend": {
    "type": "generic",
    "collections": [
      {
        "name": "todos",
        "realtime": true
      }
    ]
  }
}
```

**script.js:**
```javascript
const api = new OlamoDataAPI(window.olamoAuth);

// Create todo
async function addTodo(text) {
  await api.create('todos', { text, completed: false });
}

// List todos
async function loadTodos() {
  const todos = await api.list('todos');
  renderTodos(todos);
}

// Subscribe to updates
api.subscribe('todos', (event) => {
  if (event.type === 'document_created') {
    addTodoToUI(event.data);
  }
});
```

This specification enables creation of fully functional miniapps without writing any backend code, significantly lowering the barrier to entry for developers.