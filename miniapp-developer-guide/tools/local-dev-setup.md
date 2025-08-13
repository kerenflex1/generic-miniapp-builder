# Local Development Setup

This guide helps you set up a local development environment for building Olamo miniapps.

## Prerequisites

### Required Software
- **Web Browser** (Chrome, Firefox, Safari, or Edge)
- **Text Editor/IDE** (VS Code, Sublime Text, Atom, etc.)
- **Node.js** (v16 or later) - for build tools and validation
- **Python 3** (v3.7 or later) - for packaging scripts

### Optional Tools
- **Git** - for version control
- **Image optimization tools** (pngcrush, ImageOptim, etc.)
- **CSS/JS minifiers** (cleancss, uglifyjs, etc.)

## Development Environment Setup

### 1. Clone/Download the Developer Guide
```bash
# If using Git
git clone <developer-guide-repo>
cd miniapp-developer-guide

# Or download and extract the ZIP file
```

### 2. Install Node.js Dependencies
```bash
# Install global tools for validation and building
npm install -g http-server
npm install -g cleancss-cli
npm install -g uglify-js

# Verify installation
node --version
npm --version
```

### 3. Test the Validation Tools
```bash
# Make scripts executable (macOS/Linux)
chmod +x tools/package-builder.sh
chmod +x tools/validate-miniapp.js

# Test with the example app
node tools/validate-miniapp.js examples/todo-app/
```

## Local Development Workflow

### 1. Start with a Template
```bash
# Copy a template to your project directory
cp -r templates/vanilla-js/ my-new-miniapp/
cd my-new-miniapp/

# Or start with an example
cp -r examples/todo-app/ my-todo-app/
cd my-todo-app/
```

### 2. Set Up Local Server
```bash
# Start a local development server
http-server . -p 8080 -c-1

# Your miniapp will be available at:
# http://localhost:8080
```

### 3. Development Tools Setup

#### VS Code Extensions (Recommended)
```json
{
  "recommendations": [
    "ms-vscode.vscode-json",
    "bradlc.vscode-tailwindcss",
    "formulahendry.auto-rename-tag",
    "christian-kohler.path-intellisense",
    "ms-vscode.vscode-eslint",
    "esbenp.prettier-vscode"
  ]
}
```

#### VS Code Settings
```json
{
  "editor.formatOnSave": true,
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "files.associations": {
    "*.json": "jsonc"
  }
}
```

## Mock Authentication for Development

Since miniapps rely on the Olamo platform for authentication, you'll need to mock this during development.

### Mock Authentication Script
Create a file called `mock-auth.js` in your project:

```javascript
// mock-auth.js
// Only active in development environment

if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  console.log('🔧 Development mode: Using mock authentication');
  
  window.olamoAuth = {
    getToken: () => {
      // Return a mock JWT token for development
      return 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoidGVzdC11c2VyIiwiZW1haWwiOiJ0ZXN0QGV4YW1wbGUuY29tIiwiZ3JvdXBzIjpbInRlc3QtZ3JvdXAiXSwicGVybWlzc2lvbnMiOlsicmVhZCIsIndyaXRlIl0sImV4cCI6OTk5OTk5OTk5OX0.mock';
    },
    
    getUserInfo: () => ({
      user_id: 'test-user-123',
      email: 'developer@example.com',
      groups: ['developers', 'test-group'],
      permissions: ['read', 'write', 'delete'],
      exp: 9999999999,
      iat: Date.now() / 1000
    }),
    
    isAuthenticated: () => true,
    
    refreshToken: async () => {
      console.log('🔄 Mock token refresh');
      return 'refreshed-mock-token';
    },
    
    getUserGroups: () => ['developers', 'test-group'],
    
    hasPermission: (permission) => {
      const permissions = ['read', 'write', 'delete'];
      return permissions.includes(permission);
    },
    
    onTokenRefresh: (callback) => {
      console.log('🔗 Token refresh listener registered');
      // In real implementation, this would listen for token refresh events
    }
  };
}
```

### Mock API Server (Optional)

For more realistic testing, you can set up a mock API server:

```javascript
// mock-server.js
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Mock collections endpoint
app.get('/api/collections', (req, res) => {
  res.json({
    collections: [
      {
        name: 'todos',
        description: 'Todo items',
        document_count: 5,
        created_at: new Date().toISOString()
      }
    ]
  });
});

// Mock documents endpoint
app.get('/api/collections/:collection/documents', (req, res) => {
  res.json({
    documents: [
      {
        id: '1',
        title: 'Sample todo item',
        completed: false,
        created_at: new Date().toISOString()
      }
    ]
  });
});

// Start server
app.listen(3001, () => {
  console.log('Mock API server running on http://localhost:3001');
});
```

## Development Best Practices

### File Organization
```
my-miniapp/
├── index.html              # Main entry point
├── manifest.json          # App metadata
├── mock-auth.js           # Development authentication
├── assets/
│   ├── css/
│   │   ├── style.css      # Main styles
│   │   └── components.css # Component styles
│   ├── js/
│   │   ├── app.js         # Main application logic
│   │   ├── api.js         # API integration
│   │   └── utils.js       # Utility functions
│   └── images/
│       └── icon.png       # App icon
├── lib/                   # External libraries (if needed)
└── docs/                  # Development documentation
```

### Development Scripts

Create a `package.json` for development tools:

```json
{
  "name": "my-miniapp",
  "version": "1.0.0",
  "scripts": {
    "start": "http-server . -p 8080 -c-1",
    "validate": "node ../tools/validate-miniapp.js .",
    "build": "../tools/package-builder.sh .",
    "test": "npm run validate && npm run build -- --validate-only"
  },
  "devDependencies": {
    "http-server": "^14.1.1"
  }
}
```

### Git Setup

Create a `.gitignore` file:

```gitignore
# Development files
node_modules/
.DS_Store
*.log
.env

# Build outputs
dist/
*.zip

# IDE files
.vscode/settings.json
.idea/
*.swp
*.swo

# Temporary files
tmp/
temp/
```

## Testing Your Miniapp

### Manual Testing Checklist
1. **Load the app** in your browser
2. **Test all features** work as expected
3. **Check console** for errors or warnings
4. **Test responsive design** on different screen sizes
5. **Verify API calls** work with mock data

### Browser Developer Tools

#### Console Tab
- Check for JavaScript errors
- Monitor API calls and responses
- View authentication token information

#### Network Tab
- Monitor HTTP requests
- Check request/response headers
- Verify API endpoints are called correctly

#### Application Tab
- Inspect localStorage/sessionStorage
- Check service worker status (if applicable)
- Review cached resources

### Testing with Different Screen Sizes

Use browser developer tools to test responsive design:

```css
/* Common breakpoints to test */
/* Mobile: 320px - 768px */
/* Tablet: 768px - 1024px */
/* Desktop: 1024px+ */

@media (max-width: 768px) {
  /* Mobile styles */
}

@media (min-width: 769px) and (max-width: 1024px) {
  /* Tablet styles */
}

@media (min-width: 1025px) {
  /* Desktop styles */
}
```

## Debugging Common Issues

### Authentication Errors
**Problem**: API calls return 401 Unauthorized
**Solution**: Check that mock authentication is loaded correctly

```javascript
// Debug authentication
console.log('Auth available:', !!window.olamoAuth);
console.log('Token:', window.olamoAuth?.getToken());
console.log('User info:', window.olamoAuth?.getUserInfo());
```

### CORS Errors
**Problem**: API calls blocked by CORS policy
**Solution**: Use a local server instead of opening HTML directly

```bash
# Instead of: file:///path/to/index.html
# Use: http://localhost:8080
http-server . -p 8080
```

### Module Loading Errors
**Problem**: ES6 modules don't work
**Solution**: Serve files over HTTP and use proper MIME types

```html
<!-- Use type="module" for ES6 modules -->
<script type="module" src="assets/js/app.js"></script>
```

### Path Resolution Issues
**Problem**: Assets not loading with relative paths
**Solution**: Use consistent relative paths from the HTML file

```html
<!-- Correct: relative to index.html -->
<link rel="stylesheet" href="assets/css/style.css">
<script src="assets/js/app.js"></script>

<!-- Incorrect: absolute paths -->
<link rel="stylesheet" href="/assets/css/style.css">
```

## Build and Package for Testing

### Validate Before Building
```bash
# Run validation
node ../tools/validate-miniapp.js .

# Fix any errors or warnings
# Then package
../tools/package-builder.sh .
```

### Test the Package
```bash
# Extract the built package
unzip dist/my-miniapp-v1.0.0.zip -d test-build/

# Test the extracted version
cd test-build/
http-server . -p 8081

# Visit http://localhost:8081 to test
```

## Next Steps

Once your local development setup is working:

1. **Start building** your miniapp using the templates
2. **Test frequently** during development
3. **Use the validation tools** regularly
4. **Follow the deployment checklist** when ready
5. **Package and deploy** to the Olamo platform

## Helpful Resources

### Documentation
- [API Reference](../api-reference/) - Complete API documentation
- [Examples](../examples/) - Working miniapp examples
- [Deployment Guide](../deployment/) - Packaging and deployment

### Development Tools
- [Validation Script](./validate-miniapp.js) - Structure and content validation
- [Package Builder](./package-builder.sh) - Automated ZIP creation
- [Deployment Checklist](../deployment/deployment-checklist.md) - Pre-deployment validation

### Online Resources
- **MDN Web Docs** - HTML, CSS, JavaScript reference
- **Can I Use** - Browser compatibility information
- **JSONLint** - JSON validation tool