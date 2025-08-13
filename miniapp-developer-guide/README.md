# Olamo Miniapp Developer Guide

Welcome to the Olamo Miniapp Development Guide! This comprehensive guide will help you build miniapps that integrate with the Olamo platform using our generic backend service.

## 📁 Guide Structure

```
miniapp-developer-guide/
├── README.md                    # This file - overview and getting started
├── api-reference/               # Complete API documentation
│   ├── authentication.md       # Auth flows and JWT handling
│   ├── collections.md          # Collection management
│   ├── documents.md            # Document CRUD operations
│   ├── files.md                # File upload/download
│   ├── preferences.md          # User preferences
│   ├── queries.md              # Advanced querying
│   └── websockets.md           # Real-time features
├── examples/                   # Complete working examples
│   ├── todo-app/               # Simple todo list example
│   ├── chat-app/               # Real-time chat example
│   └── file-manager/           # File handling example
├── templates/                  # Starter templates
│   ├── vanilla-js/             # Pure JavaScript template
│   ├── react/                  # React template
│   └── vue/                    # Vue template
├── deployment/                 # Packaging and deployment
│   ├── packaging-guide.md      # How to create the final ZIP
│   ├── testing-guide.md        # Testing your miniapp
│   └── deployment-checklist.md # Pre-deployment checklist
└── tools/                      # Development tools
    ├── package-builder.sh      # Automated ZIP creation script
    ├── validate-miniapp.js     # Validation tool
    └── local-dev-setup.md      # Local development setup
```

## 🚀 Quick Start

1. **Choose a template** from the `templates/` directory
2. **Read the API reference** to understand available endpoints
3. **Build your miniapp** using the provided examples as guidance
4. **Test locally** using the tools provided
5. **Package and deploy** following the deployment guide

## 🔑 Key Concepts

### What is a Miniapp?
A miniapp is a self-contained web application that runs within the Olamo platform. It consists of:
- **Frontend**: HTML, CSS, JavaScript (any framework)
- **Backend Integration**: Uses Olamo's generic backend APIs
- **Authentication**: Handled automatically by the platform
- **Data Storage**: Firestore collections managed through APIs

### Architecture Overview
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Your Miniapp  │    │ Olamo Platform  │    │ Generic Backend │
│   (Frontend)    │◄──►│                 │◄──►│                 │
│                 │    │ • Authentication│    │ • Collections   │
│                 │    │ • User Management│    │ • Documents     │
│                 │    │ • App Hosting   │    │ • Files         │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🔧 Development Environment

### Prerequisites
- Modern web browser
- Text editor or IDE
- Node.js (for using templates with build tools)
- Basic knowledge of HTML, CSS, JavaScript

### Local Development
The generic backend is available at: `https://olamo-generic-backend-url.run.app`

All API endpoints require authentication via JWT tokens that are automatically provided by the Olamo platform when your miniapp is launched.

## 📚 Getting Started Tutorial

### Step 1: Choose Your Approach
- **Vanilla JavaScript**: Use `templates/vanilla-js/` for simple apps
- **React**: Use `templates/react/` for complex interactive apps
- **Vue**: Use `templates/vue/` for modern component-based apps

### Step 2: Understand Authentication
Your miniapp receives a JWT token from the platform:
```javascript
// The platform provides this token
const token = window.olamoAuth.getToken();

// Use it in API calls
fetch('/api/collections', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Step 3: Start Building
1. Copy a template to your working directory
2. Modify the code to fit your needs
3. Test using the provided tools
4. Package when ready

## 🎯 Core Features Available

### Data Management
- **Collections**: Create and manage data collections
- **Documents**: CRUD operations on documents
- **Queries**: Advanced filtering and searching
- **Real-time**: WebSocket support for live updates

### File Handling
- **Upload**: Multiple file formats supported
- **Download**: Secure file serving
- **Management**: File metadata and organization

### User Features
- **Preferences**: Per-user settings storage
- **Authentication**: Automatic user identification
- **Permissions**: Access control per collection

## 📋 Development Workflow

1. **Design**: Plan your miniapp features and data structure
2. **Develop**: Build using templates and API reference
3. **Test**: Use validation tools and local testing
4. **Package**: Create deployment ZIP file
5. **Deploy**: Upload to Olamo platform
6. **Iterate**: Update and republish as needed

## 🔗 Quick Links

- [API Reference](./api-reference/) - Complete API documentation
- [Examples](./examples/) - Working miniapp examples
- [Templates](./templates/) - Starter code templates
- [Deployment Guide](./deployment/packaging-guide.md) - How to package your app
- [Tools](./tools/) - Development and validation tools

## ❓ Need Help?

- Check the [examples](./examples/) for working code
- Review the [API reference](./api-reference/) for endpoint details
- Use the [validation tools](./tools/) to check your miniapp
- Follow the [deployment checklist](./deployment/deployment-checklist.md)

## 🏷️ Version Information

- **Generic Backend API**: v2.0.0
- **Platform Compatibility**: Olamo v1.0+
- **Guide Version**: 1.0.0
- **Last Updated**: August 2025

---

Ready to build your first miniapp? Start with the [API Reference](./api-reference/) or jump into an [example](./examples/)!