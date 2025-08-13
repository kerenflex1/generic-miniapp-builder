# Miniapp Packaging Guide

## Overview

This guide explains how to package your miniapp into a ZIP file for deployment on the Olamo platform. The ZIP file must contain all necessary files and follow a specific structure.

## Required Structure

Your miniapp ZIP file must have this exact structure:

```
your-miniapp.zip
├── index.html          # Main entry point (required)
├── manifest.json       # App metadata (required)
├── assets/            # Static assets (optional)
│   ├── css/
│   ├── js/
│   └── images/
├── lib/               # External libraries (optional)
└── README.md          # Documentation (optional)
```

## Required Files

### 1. index.html
The main entry point for your miniapp. Must be in the root directory.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Miniapp</title>
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body>
    <div id="app">
        <!-- Your miniapp content -->
    </div>
    
    <script src="assets/js/app.js"></script>
</body>
</html>
```

### 2. manifest.json
Contains metadata about your miniapp.

```json
{
  "name": "My Awesome Miniapp",
  "version": "1.0.0",
  "description": "A fantastic miniapp that does amazing things",
  "author": "Your Name",
  "icon": "assets/images/icon.png",
  "category": "productivity",
  "permissions": ["read", "write"],
  "api_version": "2.0.0",
  "main": "index.html",
  "dependencies": {
    "olamo-sdk": "^1.0.0"
  },
  "keywords": ["productivity", "tasks", "management"],
  "homepage": "https://yourwebsite.com",
  "repository": "https://github.com/yourusername/your-miniapp"
}
```

#### Manifest Fields

| Field | Required | Description |
|-------|----------|-------------|
| `name` | ✅ | Display name of your miniapp |
| `version` | ✅ | Semantic version (e.g., "1.0.0") |
| `description` | ✅ | Brief description of functionality |
| `author` | ✅ | Your name or organization |
| `icon` | ❌ | Path to app icon (PNG, 256x256px) |
| `category` | ❌ | App category (productivity, social, games, etc.) |
| `permissions` | ❌ | Required permissions array |
| `api_version` | ❌ | Backend API version compatibility |
| `main` | ❌ | Entry point file (defaults to index.html) |
| `dependencies` | ❌ | External dependencies |
| `keywords` | ❌ | Search keywords |
| `homepage` | ❌ | Project website |
| `repository` | ❌ | Source code repository |

## File Organization

### Assets Directory
```
assets/
├── css/
│   ├── style.css      # Main stylesheet
│   └── components.css # Component styles
├── js/
│   ├── app.js         # Main application logic
│   ├── api.js         # API integration
│   └── utils.js       # Utility functions
└── images/
    ├── icon.png       # App icon (256x256px)
    ├── logo.svg       # Logo files
    └── screenshots/   # App screenshots
```

### Library Directory
```
lib/
├── framework/         # Framework files (React, Vue, etc.)
├── components/        # Reusable components
└── vendors/          # Third-party libraries
```

## Size Limits

- **Maximum ZIP size**: 50MB
- **Maximum individual file**: 10MB
- **Recommended total size**: <5MB for better performance

## Packaging Steps

### Manual Packaging

1. **Prepare your files**
   ```bash
   # Your project structure
   my-miniapp/
   ├── index.html
   ├── manifest.json
   ├── assets/
   └── lib/
   ```

2. **Validate structure**
   - Check that `index.html` exists in root
   - Verify `manifest.json` has required fields
   - Ensure all referenced files exist

3. **Create ZIP file**
   ```bash
   # Navigate to your project directory
   cd my-miniapp
   
   # Create ZIP file (exclude development files)
   zip -r my-miniapp.zip . -x "*.git*" "node_modules/*" "*.DS_Store" "*.log"
   ```

### Automated Packaging Script

Use the provided packaging script for consistent results:

```bash
# Make the script executable
chmod +x tools/package-builder.sh

# Run the packaging script
./tools/package-builder.sh my-miniapp
```

The script will:
- Validate your manifest.json
- Check file structure
- Optimize assets
- Create the final ZIP file

## Pre-deployment Checklist

### ✅ File Structure
- [ ] `index.html` exists in root directory
- [ ] `manifest.json` has all required fields
- [ ] All referenced assets exist
- [ ] No broken links or missing files

### ✅ Content Validation
- [ ] HTML is valid and well-formed
- [ ] CSS doesn't reference external fonts/resources
- [ ] JavaScript has no syntax errors
- [ ] All images are optimized for web

### ✅ Manifest Validation
- [ ] Name is descriptive and unique
- [ ] Version follows semantic versioning
- [ ] Description is clear and helpful
- [ ] Author information is correct
- [ ] Icon is 256x256px PNG format

### ✅ Testing
- [ ] Miniapp works in different browsers
- [ ] Responsive design works on mobile
- [ ] All features function correctly
- [ ] Error handling works properly

### ✅ Security
- [ ] No hardcoded credentials or secrets
- [ ] No external script dependencies
- [ ] All user inputs are validated
- [ ] HTTPS used for any external requests

## Common Issues

### File Not Found Errors
**Problem**: Referenced files don't exist in ZIP
**Solution**: Check all `src`, `href`, and import paths

### Manifest Validation Errors
**Problem**: Invalid manifest.json format
**Solution**: Use JSON validator and check required fields

### Size Limit Exceeded
**Problem**: ZIP file too large
**Solution**: Optimize images, remove unused files, compress assets

### Path Issues
**Problem**: Files work locally but not when deployed
**Solution**: Use relative paths, avoid absolute paths

## Optimization Tips

### Image Optimization
```bash
# Compress PNG images
pngcrush -reduce input.png output.png

# Convert to WebP for better compression
cwebp -q 80 input.jpg -o output.webp
```

### CSS Optimization
```bash
# Minify CSS
cleancss -o assets/css/style.min.css assets/css/style.css
```

### JavaScript Optimization
```bash
# Minify JavaScript
uglifyjs assets/js/app.js -o assets/js/app.min.js
```

## Example Package Structure

Here's a complete example of a well-structured miniapp:

```
todo-app.zip
├── index.html
├── manifest.json
├── assets/
│   ├── css/
│   │   ├── style.css
│   │   └── themes.css
│   ├── js/
│   │   ├── app.js
│   │   ├── api.js
│   │   └── components.js
│   └── images/
│       ├── icon.png
│       └── logo.svg
├── lib/
│   └── utils/
│       └── helpers.js
└── README.md
```

### Sample manifest.json
```json
{
  "name": "Task Manager Pro",
  "version": "1.2.0",
  "description": "Professional task management with team collaboration features",
  "author": "Development Team",
  "icon": "assets/images/icon.png",
  "category": "productivity",
  "permissions": ["read", "write"],
  "api_version": "2.0.0",
  "keywords": ["tasks", "productivity", "collaboration", "management"],
  "homepage": "https://taskmanager.example.com"
}
```

## Validation Tools

### Using the Validation Script
```bash
# Validate your miniapp before packaging
node tools/validate-miniapp.js /path/to/your/miniapp

# Output example:
✅ Structure validation passed
✅ Manifest validation passed
✅ File references validated
⚠️  Large image detected: assets/images/background.jpg (2.1MB)
✅ Ready for packaging
```

### Manual Validation
```javascript
// Check manifest.json structure
function validateManifest(manifest) {
  const required = ['name', 'version', 'description', 'author'];
  return required.every(field => field in manifest);
}

// Check file references
function validateReferences(html) {
  const links = html.match(/(?:src|href)=["']([^"']+)["']/g);
  return links.every(link => {
    const path = link.match(/["']([^"']+)["']/)[1];
    return fs.existsSync(path);
  });
}
```

## Next Steps

After packaging your miniapp:

1. **Test the ZIP file** using the validation tools
2. **Follow the deployment checklist** to ensure everything works
3. **Upload to Olamo platform** through the web interface
4. **Monitor deployment** for any errors or issues

## Related Documentation

- [Testing Guide](./testing-guide.md) - How to test your miniapp
- [Deployment Checklist](./deployment-checklist.md) - Pre-deployment validation
- [Tools](../tools/) - Automated packaging and validation tools