# Collections API

## Overview

Collections in Olamo are like database tables - they store related documents and provide structure for your miniapp's data. Each collection can have its own schema, permissions, and indexes.

**Base URL**: `/api/collections`

## Endpoints

### List Collections
Get all collections accessible to the current user.

```http
GET /api/collections
```

**Response:**
```json
{
  "collections": [
    {
      "name": "tasks",
      "description": "User tasks and todos",
      "document_count": 25,
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-20T14:45:00Z",
      "permissions": {
        "read": ["user", "admin"],
        "write": ["user", "admin"],
        "delete": ["admin"]
      }
    }
  ]
}
```

### Create Collection
Create a new collection for storing documents.

```http
POST /api/collections
```

**Request Body:**
```json
{
  "name": "tasks",
  "description": "User tasks and todos",
  "schema": {
    "type": "object",
    "properties": {
      "title": {"type": "string", "required": true},
      "completed": {"type": "boolean", "default": false},
      "priority": {"type": "string", "enum": ["low", "medium", "high"]}
    }
  },
  "permissions": {
    "read": ["user"],
    "write": ["user"],
    "delete": ["admin"]
  }
}
```

**Response:**
```json
{
  "message": "Collection created successfully",
  "collection": {
    "name": "tasks",
    "description": "User tasks and todos",
    "created_at": "2024-01-15T10:30:00Z"
  }
}
```

### Get Collection Details
Get detailed information about a specific collection.

```http
GET /api/collections/{collection_name}
```

**Response:**
```json
{
  "name": "tasks",
  "description": "User tasks and todos",
  "document_count": 25,
  "schema": {
    "type": "object",
    "properties": {
      "title": {"type": "string", "required": true},
      "completed": {"type": "boolean", "default": false}
    }
  },
  "indexes": [
    {"field": "completed", "type": "simple"},
    {"field": "created_at", "type": "simple"}
  ],
  "permissions": {
    "read": ["user"],
    "write": ["user"],
    "delete": ["admin"]
  },
  "created_at": "2024-01-15T10:30:00Z",
  "updated_at": "2024-01-20T14:45:00Z"
}
```

### Update Collection
Update collection metadata, schema, or permissions.

```http
PUT /api/collections/{collection_name}
```

**Request Body:**
```json
{
  "description": "Updated description",
  "schema": {
    "type": "object",
    "properties": {
      "title": {"type": "string", "required": true},
      "completed": {"type": "boolean", "default": false},
      "priority": {"type": "string", "enum": ["low", "medium", "high"]},
      "due_date": {"type": "string", "format": "date"}
    }
  }
}
```

### Delete Collection
Delete a collection and all its documents.

```http
DELETE /api/collections/{collection_name}
```

**Response:**
```json
{
  "message": "Collection deleted successfully",
  "documents_deleted": 25
}
```

## Collection Naming Rules

### Valid Names
- Alphanumeric characters (a-z, A-Z, 0-9)
- Hyphens (-) and underscores (_)
- Must start with a letter
- 1-64 characters long

### Examples
```javascript
// ✅ Valid names
"tasks"
"user-profiles"
"shopping_cart"
"todo2024"

// ❌ Invalid names
"123tasks"        // Starts with number
"my tasks"        // Contains space
"user@data"       // Contains special character
""                // Empty string
```

## Schema Definition

### Basic Schema
```json
{
  "type": "object",
  "properties": {
    "title": {
      "type": "string",
      "required": true,
      "minLength": 1,
      "maxLength": 200
    },
    "completed": {
      "type": "boolean",
      "default": false
    },
    "priority": {
      "type": "string",
      "enum": ["low", "medium", "high"],
      "default": "medium"
    },
    "tags": {
      "type": "array",
      "items": {"type": "string"}
    }
  }
}
```

### Supported Data Types
- **string**: Text data
- **number**: Numeric data
- **boolean**: True/false values
- **array**: Lists of items
- **object**: Nested objects
- **date**: ISO date strings

## Permissions System

### Permission Levels
- **read**: View documents in collection
- **write**: Create and update documents
- **delete**: Remove documents
- **admin**: Full access including schema changes

### Setting Permissions
```json
{
  "permissions": {
    "read": ["user", "viewer"],
    "write": ["user", "admin"],
    "delete": ["admin"],
    "admin": ["owner"]
  }
}
```

## JavaScript Examples

### Creating a Collection
```javascript
async function createTasksCollection() {
  const token = window.olamoAuth.getToken();
  
  const response = await fetch('/api/collections', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: 'tasks',
      description: 'User task management',
      schema: {
        type: 'object',
        properties: {
          title: { type: 'string', required: true },
          completed: { type: 'boolean', default: false },
          created_at: { type: 'string', format: 'date-time' }
        }
      }
    })
  });
  
  if (response.ok) {
    const result = await response.json();
    console.log('Collection created:', result);
  } else {
    console.error('Failed to create collection:', response.status);
  }
}
```

### Listing Collections
```javascript
async function listCollections() {
  const token = window.olamoAuth.getToken();
  
  const response = await fetch('/api/collections', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  
  if (response.ok) {
    const data = await response.json();
    return data.collections;
  } else {
    throw new Error('Failed to fetch collections');
  }
}
```

### Collection Manager Class
```javascript
class CollectionManager {
  constructor() {
    this.token = window.olamoAuth.getToken();
    this.baseUrl = '/api/collections';
  }

  async create(name, config) {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, ...config })
    });

    if (!response.ok) {
      throw new Error(`Failed to create collection: ${response.status}`);
    }

    return response.json();
  }

  async list() {
    const response = await fetch(this.baseUrl, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to list collections: ${response.status}`);
    }

    const data = await response.json();
    return data.collections;
  }

  async get(name) {
    const response = await fetch(`${this.baseUrl}/${name}`, {
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to get collection: ${response.status}`);
    }

    return response.json();
  }

  async update(name, updates) {
    const response = await fetch(`${this.baseUrl}/${name}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });

    if (!response.ok) {
      throw new Error(`Failed to update collection: ${response.status}`);
    }

    return response.json();
  }

  async delete(name) {
    const response = await fetch(`${this.baseUrl}/${name}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to delete collection: ${response.status}`);
    }

    return response.json();
  }
}

// Usage
const collections = new CollectionManager();

// Create a collection
await collections.create('tasks', {
  description: 'Task management',
  schema: {
    type: 'object',
    properties: {
      title: { type: 'string', required: true },
      completed: { type: 'boolean', default: false }
    }
  }
});

// List all collections
const allCollections = await collections.list();
console.log('Available collections:', allCollections);
```

## Error Handling

### Common Errors

#### Collection Already Exists
```json
{
  "error": "Collection exists",
  "message": "Collection 'tasks' already exists"
}
```

#### Invalid Collection Name
```json
{
  "error": "Invalid name",
  "message": "Collection name must be alphanumeric and start with a letter"
}
```

#### Permission Denied
```json
{
  "error": "Access denied",
  "message": "Insufficient permissions to create collection"
}
```

### Error Handling Example
```javascript
async function createCollectionSafely(name, config) {
  try {
    const result = await collections.create(name, config);
    return { success: true, data: result };
  } catch (error) {
    console.error('Collection creation failed:', error);
    
    if (error.message.includes('already exists')) {
      return { success: false, error: 'Collection name is already taken' };
    } else if (error.message.includes('Invalid name')) {
      return { success: false, error: 'Please use a valid collection name' };
    } else {
      return { success: false, error: 'Failed to create collection' };
    }
  }
}
```

## Best Practices

### ✅ Do
- Use descriptive collection names
- Define clear schemas with validation
- Set appropriate permissions
- Plan your collection structure before creating
- Use consistent naming conventions

### ❌ Don't
- Create collections with generic names like "data"
- Skip schema definition for structured data
- Give broad permissions unless needed
- Create too many small collections
- Use special characters in names

## Next Steps

- [Documents API](./documents.md) - Working with documents in collections
- [Queries API](./queries.md) - Advanced querying and filtering
- [Files API](./files.md) - File storage and management