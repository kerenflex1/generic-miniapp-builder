# Authentication API

## Overview

The Olamo platform handles authentication automatically. Your miniapp receives a JWT token that identifies the current user and provides access to the generic backend APIs.

## How Authentication Works

1. **User launches miniapp** → Platform generates JWT token
2. **Token contains user info** → User ID, group membership, permissions
3. **Token passed to miniapp** → Available via JavaScript API
4. **Miniapp uses token** → Include in all API requests

## Getting the Token

### JavaScript API
```javascript
// Get the current token
const token = window.olamoAuth.getToken();

// Check if user is authenticated
const isAuthenticated = window.olamoAuth.isAuthenticated();

// Get user information
const userInfo = window.olamoAuth.getUserInfo();
```

### Token Structure
```json
{
  "user_id": "user123",
  "email": "user@example.com",
  "groups": ["group1", "group2"],
  "permissions": ["read", "write"],
  "exp": 1234567890,
  "iat": 1234567800
}
```

## Using Tokens in API Requests

### Basic Request
```javascript
const response = await fetch('/api/collections', {
  method: 'GET',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### With Request Body
```javascript
const response = await fetch('/api/collections', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    name: 'my-collection',
    description: 'My data collection'
  })
});
```

## Error Handling

### Common Authentication Errors

#### 401 Unauthorized
```json
{
  "error": "Authentication failed",
  "message": "Invalid or expired token"
}
```

**Causes:**
- Token expired
- Token invalid or malformed
- Missing Authorization header

**Solution:**
```javascript
if (response.status === 401) {
  // Request new token from platform
  const newToken = await window.olamoAuth.refreshToken();
  // Retry request with new token
}
```

#### 403 Forbidden
```json
{
  "error": "Access denied",
  "message": "Insufficient permissions"
}
```

**Causes:**
- User lacks required permissions
- Trying to access restricted resource

## Token Management

### Automatic Refresh
```javascript
// Token refresh is handled automatically
window.olamoAuth.onTokenRefresh((newToken) => {
  console.log('Token refreshed automatically');
});
```

### Manual Refresh
```javascript
try {
  const newToken = await window.olamoAuth.refreshToken();
  console.log('Token refreshed manually');
} catch (error) {
  console.error('Failed to refresh token:', error);
}
```

## Security Best Practices

### ✅ Do
- Always include the Authorization header
- Handle token expiration gracefully
- Use HTTPS for all requests
- Validate responses for authentication errors

### ❌ Don't
- Store tokens in localStorage permanently
- Log tokens to console in production
- Send tokens in URL parameters
- Share tokens between users

## User Information

### Getting User Details
```javascript
const userInfo = window.olamoAuth.getUserInfo();
console.log('User ID:', userInfo.user_id);
console.log('Email:', userInfo.email);
console.log('Groups:', userInfo.groups);
```

### Group Membership
```javascript
const userGroups = window.olamoAuth.getUserGroups();
const isInGroup = userGroups.includes('admin-group');

if (isInGroup) {
  // Show admin features
}
```

## Permissions

### Checking Permissions
```javascript
const hasPermission = window.olamoAuth.hasPermission('write');
if (hasPermission) {
  // Allow write operations
}
```

### Permission Levels
- **read**: View data and files
- **write**: Create and modify data
- **delete**: Remove data and files
- **admin**: Full access to all features

## Code Examples

### Complete Authentication Helper
```javascript
class OlamoAuth {
  constructor() {
    this.token = null;
    this.userInfo = null;
    this.init();
  }

  init() {
    this.token = window.olamoAuth.getToken();
    this.userInfo = window.olamoAuth.getUserInfo();
  }

  async makeRequest(url, options = {}) {
    const defaultOptions = {
      headers: {
        'Authorization': `Bearer ${this.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      }
    };

    const response = await fetch(url, { ...options, ...defaultOptions });

    if (response.status === 401) {
      // Try to refresh token
      this.token = await window.olamoAuth.refreshToken();
      defaultOptions.headers.Authorization = `Bearer ${this.token}`;
      return fetch(url, { ...options, ...defaultOptions });
    }

    return response;
  }

  getUserId() {
    return this.userInfo?.user_id;
  }

  getUserEmail() {
    return this.userInfo?.email;
  }

  getUserGroups() {
    return this.userInfo?.groups || [];
  }

  hasPermission(permission) {
    return this.userInfo?.permissions?.includes(permission) || false;
  }
}

// Usage
const auth = new OlamoAuth();
const response = await auth.makeRequest('/api/collections');
```

### Error Handler
```javascript
function handleAuthError(error, response) {
  if (response.status === 401) {
    console.error('Authentication failed:', error);
    // Redirect to login or show error message
    return { type: 'auth_error', message: 'Please sign in again' };
  }
  
  if (response.status === 403) {
    console.error('Access denied:', error);
    return { type: 'permission_error', message: 'Access denied' };
  }
  
  return { type: 'unknown_error', message: 'An error occurred' };
}
```

## Testing Authentication

### Mock Authentication for Development
```javascript
// For local testing only
if (window.location.hostname === 'localhost') {
  window.olamoAuth = {
    getToken: () => 'mock-jwt-token-for-testing',
    getUserInfo: () => ({
      user_id: 'test-user',
      email: 'test@example.com',
      groups: ['test-group'],
      permissions: ['read', 'write']
    }),
    isAuthenticated: () => true,
    refreshToken: () => Promise.resolve('refreshed-mock-token')
  };
}
```

## Next Steps

- [Collections API](./collections.md) - Managing data collections
- [Documents API](./documents.md) - CRUD operations
- [Files API](./files.md) - File upload and download