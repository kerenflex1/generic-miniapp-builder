# Generic Backend Documentation

**Version**: 1.0.0  
**Last Updated**: August 13, 2025  

## Overview

This folder contains the complete specification and documentation for the Olamo Generic Backend Service - a universal backend that enables frontend-only miniapp development.

## Documents

### Core Specifications

1. **[generic-backend-specification.md](./generic-backend-specification.md)** (v1.0.0)
   - Complete backend service specification
   - REST API endpoints
   - WebSocket protocol
   - Data model and permissions
   - Security and performance considerations

2. **[frontend-sdk-specification.md](./frontend-sdk-specification.md)** (v1.0.0)
   - JavaScript SDK specification
   - Modular architecture
   - API client implementation
   - TypeScript support
   - Authentication and security

3. **[versioning-and-compatibility.md](./versioning-and-compatibility.md)** (v1.0.0)
   - Comprehensive versioning strategy
   - Backward/forward compatibility
   - Migration paths
   - Enhanced security features
   - Token management

4. **[CHANGELOG.md](./CHANGELOG.md)**
   - Document version history
   - Service version tracking
   - Breaking changes log
   - Deprecation notices
   - Future roadmap

## Quick Start

### For Miniapp Developers

1. Read the [Frontend SDK Specification](./frontend-sdk-specification.md)
2. Include the SDK in your miniapp:
   ```html
   <script src="https://cdn.olamo.app/sdk/2.3.1/olamo-sdk.min.js"></script>
   ```
3. Initialize in your app:
   ```javascript
   const olamo = new OlamoSDK();
   await olamo.init();
   ```

### For Backend Developers

1. Review the [Generic Backend Specification](./generic-backend-specification.md)
2. Check [Versioning and Compatibility](./versioning-and-compatibility.md)
3. Implement according to the API specification

## Key Features

### 🚀 Simplified Development
- **No backend code required** - Just HTML, CSS, and JavaScript
- **Automatic persistence** - Built-in Firestore integration
- **Real-time updates** - WebSocket support included
- **Authentication handled** - JWT verification automatic

### 🔒 Enterprise Security
- **JWT with RS256** - Secure token signing
- **Token rotation** - Automatic refresh
- **Device binding** - Prevent token theft
- **Rate limiting** - API protection
- **Audit logging** - Security tracking

### 📊 Version Management
- **Semantic versioning** - Clear version strategy
- **Backward compatibility** - Old apps keep working
- **Forward compatibility** - Handle future features
- **Gradual migration** - 6-month deprecation cycle
- **Auto-negotiation** - Best version selection

## Architecture Overview

```
┌─────────────────┐
│   Miniapp       │
│  (Frontend)     │
└────────┬────────┘
         │
    JavaScript SDK
         │
         ▼
┌─────────────────┐
│ Generic Backend │
│    Service      │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
Firestore   GCS
```

## Compatibility Matrix

| Component | Current Version | Supported Versions | Status |
|-----------|----------------|-------------------|--------|
| Backend Service | 2.0.0 | 1.5.0+ | Active |
| Frontend SDK | 2.3.1 | 2.0.0+ | Active |
| API | v2 | v1, v2 | Active |

## Benefits

### For Developers
- 🎯 **Focus on frontend** - No backend complexity
- ⚡ **Faster development** - Pre-built functionality
- 🔄 **Real-time by default** - WebSocket included
- 🛡️ **Security built-in** - Enterprise-grade auth

### For Platform
- 📦 **Reduced complexity** - One backend, many apps
- 💰 **Cost efficient** - Shared infrastructure
- 🔧 **Easier maintenance** - Centralized updates
- 📈 **Better scaling** - Optimized resources

## Example Usage

### Simple Todo App (Frontend Only)

```javascript
// Initialize SDK
const olamo = new OlamoSDK();
await olamo.init();

// Create a todo
await olamo.api.create('todos', {
  text: 'Build awesome miniapp',
  completed: false
});

// List todos
const todos = await olamo.api.list('todos');

// Subscribe to updates
olamo.ws.subscribe('todos', (event) => {
  if (event.type === 'document_created') {
    renderNewTodo(event.data);
  }
});
```

## Migration from Custom Backend

1. **Identify collections** used in your miniapp
2. **Map custom endpoints** to generic CRUD operations
3. **Update frontend** to use SDK instead of custom API
4. **Configure miniapp.json** with collection definitions
5. **Test thoroughly** in staging environment
6. **Deploy** with confidence

## Support

- **Documentation**: This folder
- **Issues**: GitHub Issues
- **Email**: platform@olamo.app
- **Discord**: [discord.gg/olamo](https://discord.gg/olamo)

## Contributing

We welcome contributions! Please:
1. Read the specifications thoroughly
2. Follow semantic versioning
3. Update CHANGELOG.md
4. Submit PR with clear description

## License

Copyright © 2025 Olamo Platform. All rights reserved.

---

*This documentation is version 1.0.0. For the latest version, check the [CHANGELOG](./CHANGELOG.md).*