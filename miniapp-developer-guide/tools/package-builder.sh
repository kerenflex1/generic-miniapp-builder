#!/bin/bash

# Olamo Miniapp Package Builder
# Automates the creation of deployment-ready ZIP files

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default values
MINIAPP_DIR=""
OUTPUT_DIR="./dist"
VALIDATE_ONLY=false
OPTIMIZE=true
VERBOSE=false

# Print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Show usage information
show_usage() {
    cat << EOF
Olamo Miniapp Package Builder

Usage: $0 [OPTIONS] <miniapp-directory>

OPTIONS:
    -o, --output DIR     Output directory for ZIP file (default: ./dist)
    -v, --validate-only  Only validate, don't create ZIP
    -n, --no-optimize    Skip optimization steps
    --verbose           Show detailed output
    -h, --help          Show this help message

EXAMPLES:
    $0 my-miniapp/                    # Package miniapp to ./dist/
    $0 -o packages/ my-miniapp/       # Package to packages/ directory
    $0 --validate-only my-miniapp/    # Only validate structure
    $0 --no-optimize my-miniapp/      # Skip optimization

EOF
}

# Parse command line arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -o|--output)
                OUTPUT_DIR="$2"
                shift 2
                ;;
            -v|--validate-only)
                VALIDATE_ONLY=true
                shift
                ;;
            -n|--no-optimize)
                OPTIMIZE=false
                shift
                ;;
            --verbose)
                VERBOSE=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            -*)
                print_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
            *)
                if [[ -z "$MINIAPP_DIR" ]]; then
                    MINIAPP_DIR="$1"
                else
                    print_error "Multiple directories specified"
                    exit 1
                fi
                shift
                ;;
        esac
    done

    if [[ -z "$MINIAPP_DIR" ]]; then
        print_error "Miniapp directory is required"
        show_usage
        exit 1
    fi
}

# Validate miniapp directory exists
validate_directory() {
    if [[ ! -d "$MINIAPP_DIR" ]]; then
        print_error "Directory not found: $MINIAPP_DIR"
        exit 1
    fi

    print_status "Validating miniapp directory: $MINIAPP_DIR"
}

# Check required files
check_required_files() {
    print_status "Checking required files..."

    local errors=0

    # Check index.html
    if [[ ! -f "$MINIAPP_DIR/index.html" ]]; then
        print_error "Missing required file: index.html"
        errors=$((errors + 1))
    else
        print_success "Found index.html"
    fi

    # Check manifest.json
    if [[ ! -f "$MINIAPP_DIR/manifest.json" ]]; then
        print_error "Missing required file: manifest.json"
        errors=$((errors + 1))
    else
        print_success "Found manifest.json"
        validate_manifest
    fi

    if [[ $errors -gt 0 ]]; then
        print_error "Required files validation failed"
        exit 1
    fi
}

# Validate manifest.json structure
validate_manifest() {
    local manifest="$MINIAPP_DIR/manifest.json"
    
    # Check if it's valid JSON
    if ! python3 -m json.tool "$manifest" > /dev/null 2>&1; then
        print_error "manifest.json is not valid JSON"
        exit 1
    fi

    # Check required fields
    local required_fields=("name" "version" "description" "author")
    for field in "${required_fields[@]}"; do
        if ! grep -q "\"$field\"" "$manifest"; then
            print_error "Missing required field in manifest.json: $field"
            exit 1
        fi
    done

    print_success "manifest.json validation passed"
}

# Check file references in HTML
validate_file_references() {
    print_status "Validating file references..."

    local html_file="$MINIAPP_DIR/index.html"
    local errors=0

    # Extract src and href attributes
    local references=$(grep -oE '(src|href)="[^"]*"' "$html_file" | cut -d'"' -f2 | grep -v '^http' | grep -v '^//' | grep -v '^#')

    while IFS= read -r ref; do
        if [[ -n "$ref" && ! -f "$MINIAPP_DIR/$ref" ]]; then
            print_error "Referenced file not found: $ref"
            errors=$((errors + 1))
        fi
    done <<< "$references"

    if [[ $errors -gt 0 ]]; then
        print_error "File reference validation failed"
        exit 1
    else
        print_success "File references validated"
    fi
}

# Check for large files
check_file_sizes() {
    print_status "Checking file sizes..."

    local large_files=$(find "$MINIAPP_DIR" -type f -size +10M 2>/dev/null || true)
    
    if [[ -n "$large_files" ]]; then
        print_warning "Large files detected (>10MB):"
        echo "$large_files" | while read -r file; do
            local size=$(du -h "$file" | cut -f1)
            print_warning "  $file ($size)"
        done
    fi

    # Check total size
    local total_size=$(du -sm "$MINIAPP_DIR" | cut -f1)
    if [[ $total_size -gt 50 ]]; then
        print_error "Total size exceeds 50MB limit: ${total_size}MB"
        exit 1
    elif [[ $total_size -gt 10 ]]; then
        print_warning "Large miniapp size: ${total_size}MB (consider optimization)"
    else
        print_success "Size check passed: ${total_size}MB"
    fi
}

# Optimize files if requested
optimize_files() {
    if [[ "$OPTIMIZE" == false ]]; then
        return
    fi

    print_status "Optimizing files..."

    # Create temporary directory for optimization
    local temp_dir=$(mktemp -d)
    cp -r "$MINIAPP_DIR"/* "$temp_dir"/

    # Optimize images if tools are available
    if command -v pngcrush >/dev/null 2>&1; then
        find "$temp_dir" -name "*.png" -exec pngcrush -reduce -ow {} \; 2>/dev/null || true
    fi

    # Minify CSS if available
    if command -v cleancss >/dev/null 2>&1; then
        find "$temp_dir" -name "*.css" -exec cleancss -o {} {} \; 2>/dev/null || true
    fi

    # Minify JavaScript if available
    if command -v uglifyjs >/dev/null 2>&1; then
        find "$temp_dir" -name "*.js" -not -path "*/node_modules/*" -exec uglifyjs {} -o {} \; 2>/dev/null || true
    fi

    # Update MINIAPP_DIR to point to optimized version
    MINIAPP_DIR="$temp_dir"
    print_success "File optimization completed"
}

# Create the ZIP package
create_package() {
    if [[ "$VALIDATE_ONLY" == true ]]; then
        print_success "Validation completed successfully"
        return
    fi

    print_status "Creating package..."

    # Create output directory
    mkdir -p "$OUTPUT_DIR"

    # Get miniapp name from manifest
    local app_name=$(python3 -c "
import json
with open('$MINIAPP_DIR/manifest.json') as f:
    data = json.load(f)
    print(data.get('name', 'miniapp').lower().replace(' ', '-'))
" 2>/dev/null || echo "miniapp")

    # Get version from manifest
    local version=$(python3 -c "
import json
with open('$MINIAPP_DIR/manifest.json') as f:
    data = json.load(f)
    print(data.get('version', '1.0.0'))
" 2>/dev/null || echo "1.0.0")

    local zip_filename="${app_name}-v${version}.zip"
    local zip_path="${OUTPUT_DIR}/${zip_filename}"

    # Create ZIP file
    cd "$MINIAPP_DIR"
    zip -r "$zip_path" . \
        -x "*.git*" \
        -x "node_modules/*" \
        -x "*.DS_Store" \
        -x "*.log" \
        -x "*.tmp" \
        -x "src/*" \
        -x "*.md" \
        > /dev/null

    cd - > /dev/null

    # Get final size
    local zip_size=$(du -h "$zip_path" | cut -f1)
    
    print_success "Package created successfully!"
    echo "  📦 File: $zip_path"
    echo "  📏 Size: $zip_size"
    echo "  🏷️  Name: $app_name"
    echo "  🔢 Version: $version"
}

# Generate deployment instructions
generate_instructions() {
    if [[ "$VALIDATE_ONLY" == true ]]; then
        return
    fi

    cat << EOF

📋 DEPLOYMENT INSTRUCTIONS:

1. Upload the ZIP file to the Olamo platform
2. The platform will automatically extract and validate your miniapp
3. Once validated, your miniapp will be available to users
4. Monitor the deployment logs for any issues

🔗 Next steps:
   - Test your miniapp in the Olamo platform
   - Share with your team for feedback
   - Update version number for future releases

EOF
}

# Cleanup temporary files
cleanup() {
    if [[ -d "/tmp/miniapp-build-"* ]]; then
        rm -rf /tmp/miniapp-build-* 2>/dev/null || true
    fi
}

# Main execution
main() {
    print_status "🚀 Olamo Miniapp Package Builder"
    echo

    parse_args "$@"
    
    # Set trap for cleanup
    trap cleanup EXIT

    validate_directory
    check_required_files
    validate_file_references
    check_file_sizes
    
    if [[ "$OPTIMIZE" == true ]]; then
        optimize_files
    fi
    
    create_package
    generate_instructions
    
    print_success "✅ Build completed successfully!"
}

# Run main function
main "$@"