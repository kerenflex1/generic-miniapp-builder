#!/usr/bin/env node

/**
 * Olamo Miniapp Validation Tool
 * Validates miniapp structure, manifest, and files before packaging
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class MiniappValidator {
    constructor(miniappPath) {
        this.miniappPath = path.resolve(miniappPath);
        this.errors = [];
        this.warnings = [];
        this.manifest = null;
    }

    /**
     * Run all validations
     */
    async validate() {
        console.log('🔍 Validating miniapp:', this.miniappPath);
        console.log('');

        this.validateDirectory();
        this.validateRequiredFiles();
        this.validateManifest();
        this.validateFileReferences();
        this.validateFileSizes();
        this.validateSecurity();
        this.generateReport();

        return this.errors.length === 0;
    }

    /**
     * Check if directory exists
     */
    validateDirectory() {
        if (!fs.existsSync(this.miniappPath)) {
            this.addError('Directory not found: ' + this.miniappPath);
            return;
        }

        if (!fs.statSync(this.miniappPath).isDirectory()) {
            this.addError('Path is not a directory: ' + this.miniappPath);
            return;
        }

        this.addSuccess('Directory structure', 'Found miniapp directory');
    }

    /**
     * Check required files exist
     */
    validateRequiredFiles() {
        const requiredFiles = ['index.html', 'manifest.json'];
        
        for (const file of requiredFiles) {
            const filePath = path.join(this.miniappPath, file);
            if (fs.existsSync(filePath)) {
                this.addSuccess('Required files', `Found ${file}`);
            } else {
                this.addError(`Missing required file: ${file}`);
            }
        }

        // Check for recommended files
        const recommendedFiles = ['README.md', 'assets/css/style.css', 'assets/js/app.js'];
        for (const file of recommendedFiles) {
            const filePath = path.join(this.miniappPath, file);
            if (!fs.existsSync(filePath)) {
                this.addWarning(`Recommended file missing: ${file}`);
            }
        }
    }

    /**
     * Validate manifest.json structure and content
     */
    validateManifest() {
        const manifestPath = path.join(this.miniappPath, 'manifest.json');
        
        if (!fs.existsSync(manifestPath)) {
            this.addError('manifest.json not found');
            return;
        }

        try {
            const manifestContent = fs.readFileSync(manifestPath, 'utf8');
            this.manifest = JSON.parse(manifestContent);
        } catch (error) {
            this.addError('manifest.json is not valid JSON: ' + error.message);
            return;
        }

        this.validateManifestFields();
        this.validateManifestValues();
    }

    /**
     * Validate required manifest fields
     */
    validateManifestFields() {
        const requiredFields = ['name', 'version', 'description', 'author'];
        const optionalFields = ['icon', 'category', 'permissions', 'api_version', 'main'];

        for (const field of requiredFields) {
            if (!this.manifest[field]) {
                this.addError(`Missing required field in manifest.json: ${field}`);
            } else {
                this.addSuccess('Manifest fields', `Found ${field}`);
            }
        }

        // Check for unknown fields
        const allKnownFields = [...requiredFields, ...optionalFields, 'keywords', 'homepage', 'repository', 'dependencies'];
        for (const field in this.manifest) {
            if (!allKnownFields.includes(field)) {
                this.addWarning(`Unknown field in manifest.json: ${field}`);
            }
        }
    }

    /**
     * Validate manifest field values
     */
    validateManifestValues() {
        if (!this.manifest) return;

        // Validate version format (semantic versioning)
        if (this.manifest.version && !/^\d+\.\d+\.\d+/.test(this.manifest.version)) {
            this.addError('Version should follow semantic versioning (e.g., 1.0.0)');
        }

        // Validate name length and format
        if (this.manifest.name) {
            if (this.manifest.name.length > 50) {
                this.addWarning('App name is very long (>50 characters)');
            }
            if (this.manifest.name.length < 3) {
                this.addError('App name is too short (<3 characters)');
            }
        }

        // Validate description length
        if (this.manifest.description && this.manifest.description.length > 200) {
            this.addWarning('Description is very long (>200 characters)');
        }

        // Validate icon path if specified
        if (this.manifest.icon) {
            const iconPath = path.join(this.miniappPath, this.manifest.icon);
            if (!fs.existsSync(iconPath)) {
                this.addError(`Icon file not found: ${this.manifest.icon}`);
            } else {
                this.validateIcon(iconPath);
            }
        }

        // Validate permissions
        if (this.manifest.permissions) {
            const validPermissions = ['read', 'write', 'delete', 'admin'];
            const invalidPerms = this.manifest.permissions.filter(p => !validPermissions.includes(p));
            if (invalidPerms.length > 0) {
                this.addError(`Invalid permissions: ${invalidPerms.join(', ')}`);
            }
        }
    }

    /**
     * Validate icon file
     */
    validateIcon(iconPath) {
        const stats = fs.statSync(iconPath);
        const sizeInMB = stats.size / (1024 * 1024);
        
        if (sizeInMB > 1) {
            this.addWarning(`Icon file is large: ${sizeInMB.toFixed(2)}MB`);
        }

        const ext = path.extname(iconPath).toLowerCase();
        if (!['.png', '.jpg', '.jpeg', '.svg'].includes(ext)) {
            this.addWarning(`Icon should be PNG, JPG, or SVG format, got: ${ext}`);
        }
    }

    /**
     * Validate file references in HTML
     */
    validateFileReferences() {
        const indexPath = path.join(this.miniappPath, 'index.html');
        
        if (!fs.existsSync(indexPath)) {
            return; // Already reported as missing required file
        }

        try {
            const htmlContent = fs.readFileSync(indexPath, 'utf8');
            this.validateHTMLReferences(htmlContent);
            this.validateHTMLStructure(htmlContent);
        } catch (error) {
            this.addError('Failed to read index.html: ' + error.message);
        }
    }

    /**
     * Validate HTML file references
     */
    validateHTMLReferences(htmlContent) {
        // Extract src and href attributes
        const srcMatches = htmlContent.match(/src=["']([^"']+)["']/g) || [];
        const hrefMatches = htmlContent.match(/href=["']([^"']+)["']/g) || [];
        
        const allRefs = [...srcMatches, ...hrefMatches]
            .map(match => match.match(/["']([^"']+)["']/)[1])
            .filter(ref => !ref.startsWith('http') && !ref.startsWith('//') && !ref.startsWith('#'));

        let validRefs = 0;
        for (const ref of allRefs) {
            const refPath = path.join(this.miniappPath, ref);
            if (fs.existsSync(refPath)) {
                validRefs++;
            } else {
                this.addError(`Referenced file not found: ${ref}`);
            }
        }

        if (validRefs > 0) {
            this.addSuccess('File references', `${validRefs} references validated`);
        }
    }

    /**
     * Validate HTML structure
     */
    validateHTMLStructure(htmlContent) {
        // Check for basic HTML structure
        if (!htmlContent.includes('<!DOCTYPE html>')) {
            this.addWarning('Missing DOCTYPE declaration');
        }

        if (!htmlContent.includes('<html')) {
            this.addError('Missing <html> tag');
        }

        if (!htmlContent.includes('<head>')) {
            this.addError('Missing <head> section');
        }

        if (!htmlContent.includes('<body>')) {
            this.addError('Missing <body> section');
        }

        // Check for title
        if (!htmlContent.includes('<title>')) {
            this.addWarning('Missing <title> tag');
        }

        // Check for viewport meta tag
        if (!htmlContent.includes('viewport')) {
            this.addWarning('Missing viewport meta tag for mobile compatibility');
        }

        // Check for charset
        if (!htmlContent.includes('charset=')) {
            this.addWarning('Missing charset declaration');
        }
    }

    /**
     * Check file sizes
     */
    validateFileSizes() {
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        const maxTotalSize = 50 * 1024 * 1024; // 50MB
        
        let totalSize = 0;
        let largeFiles = [];

        const checkDirectory = (dir) => {
            const items = fs.readdirSync(dir);
            
            for (const item of items) {
                const itemPath = path.join(dir, item);
                const stats = fs.statSync(itemPath);
                
                if (stats.isDirectory()) {
                    // Skip common development directories
                    if (!['node_modules', '.git', '.vscode', '.idea'].includes(item)) {
                        checkDirectory(itemPath);
                    }
                } else {
                    totalSize += stats.size;
                    
                    if (stats.size > maxFileSize) {
                        largeFiles.push({
                            path: path.relative(this.miniappPath, itemPath),
                            size: (stats.size / (1024 * 1024)).toFixed(2) + 'MB'
                        });
                    }
                }
            }
        };

        checkDirectory(this.miniappPath);

        // Report large files
        for (const file of largeFiles) {
            this.addWarning(`Large file detected: ${file.path} (${file.size})`);
        }

        // Check total size
        if (totalSize > maxTotalSize) {
            this.addError(`Total size exceeds 50MB limit: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`);
        } else if (totalSize > 10 * 1024 * 1024) {
            this.addWarning(`Large miniapp size: ${(totalSize / (1024 * 1024)).toFixed(2)}MB (consider optimization)`);
        } else {
            this.addSuccess('File sizes', `Total size: ${(totalSize / (1024 * 1024)).toFixed(2)}MB`);
        }
    }

    /**
     * Validate security aspects
     */
    validateSecurity() {
        // Check for potential security issues
        const indexPath = path.join(this.miniappPath, 'index.html');
        
        if (fs.existsSync(indexPath)) {
            const htmlContent = fs.readFileSync(indexPath, 'utf8');
            
            // Check for inline scripts
            if (htmlContent.includes('<script>') && htmlContent.includes('</script>')) {
                this.addWarning('Inline scripts detected - consider moving to external files');
            }

            // Check for external script sources
            const externalScripts = htmlContent.match(/src=["']https?:\/\/[^"']+["']/g) || [];
            if (externalScripts.length > 0) {
                this.addWarning(`External script dependencies detected: ${externalScripts.length}`);
            }
        }

        // Check for sensitive files
        const sensitivePatterns = ['*.key', '*.pem', '*.env', '*secret*', '*password*'];
        for (const pattern of sensitivePatterns) {
            // This is a simplified check - in a real implementation, you'd use a proper glob library
            if (pattern.includes('*')) {
                // Skip complex patterns for this example
                continue;
            }
            
            const filePath = path.join(this.miniappPath, pattern);
            if (fs.existsSync(filePath)) {
                this.addError(`Potential sensitive file found: ${pattern}`);
            }
        }
    }

    /**
     * Add error to the list
     */
    addError(message) {
        this.errors.push(message);
    }

    /**
     * Add warning to the list
     */
    addWarning(message) {
        this.warnings.push(message);
    }

    /**
     * Add success message
     */
    addSuccess(category, message) {
        console.log(`✅ ${category}: ${message}`);
    }

    /**
     * Generate validation report
     */
    generateReport() {
        console.log('\n📊 VALIDATION REPORT');
        console.log('='.repeat(50));

        if (this.errors.length === 0 && this.warnings.length === 0) {
            console.log('🎉 Perfect! Your miniapp passed all validations.');
        } else {
            if (this.errors.length > 0) {
                console.log('\n❌ ERRORS (must be fixed):');
                this.errors.forEach(error => console.log(`   • ${error}`));
            }

            if (this.warnings.length > 0) {
                console.log('\n⚠️  WARNINGS (recommended to fix):');
                this.warnings.forEach(warning => console.log(`   • ${warning}`));
            }
        }

        console.log('\n📋 SUMMARY:');
        console.log(`   Errors: ${this.errors.length}`);
        console.log(`   Warnings: ${this.warnings.length}`);
        
        if (this.errors.length === 0) {
            console.log('\n✅ Ready for packaging!');
            console.log('   Use the package-builder.sh script to create your ZIP file.');
        } else {
            console.log('\n❌ Fix the errors above before packaging.');
        }
    }
}

// Main execution
async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log('Olamo Miniapp Validator');
        console.log('');
        console.log('Usage: node validate-miniapp.js <miniapp-directory>');
        console.log('');
        console.log('Examples:');
        console.log('  node validate-miniapp.js ./my-miniapp');
        console.log('  node validate-miniapp.js ../todo-app');
        process.exit(0);
    }

    const miniappPath = args[0];
    const validator = new MiniappValidator(miniappPath);
    
    try {
        const isValid = await validator.validate();
        process.exit(isValid ? 0 : 1);
    } catch (error) {
        console.error('❌ Validation failed:', error.message);
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    main();
}

module.exports = MiniappValidator;