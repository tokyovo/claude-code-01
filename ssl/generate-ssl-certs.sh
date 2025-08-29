#!/bin/bash

# =================================
# SSL Certificate Generation Script
# Personal Finance Tracker - SSL/TLS Certificate Setup
# =================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CERT_DIR="${SCRIPT_DIR}/certs"
DHPARAM_DIR="${SCRIPT_DIR}/dhparam"

# Default values
DOMAIN=""
EMAIL=""
METHOD="letsencrypt"
STAGING=false
FORCE_RENEWAL=false

# Usage function
show_usage() {
    echo -e "${BLUE}Personal Finance Tracker - SSL Certificate Generator${NC}"
    echo -e "${BLUE}===================================================${NC}"
    echo ""
    echo "Usage: $0 [OPTIONS] DOMAIN"
    echo ""
    echo "Methods:"
    echo "  letsencrypt  Use Let's Encrypt (default, recommended for production)"
    echo "  selfsigned   Generate self-signed certificates (development only)"
    echo ""
    echo "Options:"
    echo "  -e, --email EMAIL       Email for Let's Encrypt registration"
    echo "  -m, --method METHOD     Certificate method (letsencrypt|selfsigned)"
    echo "  -s, --staging          Use Let's Encrypt staging environment"
    echo "  -f, --force            Force certificate renewal"
    echo "  -h, --help             Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 --email admin@yourdomain.com yourdomain.com"
    echo "  $0 --method selfsigned localhost"
    echo "  $0 --staging --email test@yourdomain.com staging.yourdomain.com"
    echo ""
}

# Parse command line arguments
parse_arguments() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            -e|--email)
                EMAIL="$2"
                shift 2
                ;;
            -m|--method)
                METHOD="$2"
                shift 2
                ;;
            -s|--staging)
                STAGING=true
                shift
                ;;
            -f|--force)
                FORCE_RENEWAL=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                if [ -z "$DOMAIN" ]; then
                    DOMAIN="$1"
                    shift
                else
                    echo -e "${RED}❌ Unknown option: $1${NC}"
                    show_usage
                    exit 1
                fi
                ;;
        esac
    done
    
    if [ -z "$DOMAIN" ]; then
        echo -e "${RED}❌ Domain not specified${NC}"
        show_usage
        exit 1
    fi
}

# Function to validate prerequisites
validate_prerequisites() {
    echo -e "${YELLOW}🔍 Validating prerequisites...${NC}"
    
    # Check required commands
    case "$METHOD" in
        letsencrypt)
            if ! command -v certbot >/dev/null 2>&1; then
                echo -e "${RED}❌ certbot not found. Installing...${NC}"
                # Try to install certbot
                if command -v apt-get >/dev/null 2>&1; then
                    sudo apt-get update && sudo apt-get install -y certbot
                elif command -v yum >/dev/null 2>&1; then
                    sudo yum install -y certbot
                elif command -v brew >/dev/null 2>&1; then
                    brew install certbot
                else
                    echo -e "${RED}❌ Cannot install certbot. Please install manually.${NC}"
                    exit 1
                fi
            fi
            
            if [ -z "$EMAIL" ]; then
                echo -e "${RED}❌ Email is required for Let's Encrypt${NC}"
                exit 1
            fi
            ;;
        selfsigned)
            if ! command -v openssl >/dev/null 2>&1; then
                echo -e "${RED}❌ openssl not found${NC}"
                exit 1
            fi
            ;;
        *)
            echo -e "${RED}❌ Invalid method: $METHOD${NC}"
            exit 1
            ;;
    esac
    
    echo -e "${GREEN}✅ Prerequisites validated${NC}"
}

# Function to create directories
create_directories() {
    echo -e "${YELLOW}📁 Creating certificate directories...${NC}"
    
    mkdir -p "$CERT_DIR"
    mkdir -p "$DHPARAM_DIR"
    mkdir -p "${SCRIPT_DIR}/archive"
    mkdir -p "${SCRIPT_DIR}/renewal"
    
    echo -e "${GREEN}✅ Directories created${NC}"
}

# Function to generate DH parameters
generate_dhparam() {
    local dhparam_file="${DHPARAM_DIR}/dhparam.pem"
    
    if [ ! -f "$dhparam_file" ] || [ "$FORCE_RENEWAL" = "true" ]; then
        echo -e "${YELLOW}🔐 Generating DH parameters (this may take a while)...${NC}"
        
        openssl dhparam -out "$dhparam_file" 2048
        
        echo -e "${GREEN}✅ DH parameters generated${NC}"
    else
        echo -e "${GREEN}✅ DH parameters already exist${NC}"
    fi
}

# Function to generate self-signed certificate
generate_selfsigned_certificate() {
    echo -e "${YELLOW}🔐 Generating self-signed certificate for ${DOMAIN}...${NC}"
    
    local key_file="${CERT_DIR}/privkey.pem"
    local cert_file="${CERT_DIR}/fullchain.pem"
    local chain_file="${CERT_DIR}/chain.pem"
    
    # Create OpenSSL configuration
    local config_file="${CERT_DIR}/openssl.conf"
    cat > "$config_file" << EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
distinguished_name = dn
req_extensions = v3_req

[dn]
C=US
ST=State
L=City
O=Personal Finance Tracker
OU=Development
CN=${DOMAIN}

[v3_req]
basicConstraints = CA:FALSE
keyUsage = nonRepudiation, digitalSignature, keyEncipherment
subjectAltName = @alt_names

[alt_names]
DNS.1 = ${DOMAIN}
DNS.2 = *.${DOMAIN}
DNS.3 = localhost
IP.1 = 127.0.0.1
IP.2 = ::1
EOF
    
    # Generate private key
    openssl genrsa -out "$key_file" 2048
    
    # Generate certificate signing request
    local csr_file="${CERT_DIR}/server.csr"
    openssl req -new -key "$key_file" -out "$csr_file" -config "$config_file"
    
    # Generate self-signed certificate
    openssl x509 -req -in "$csr_file" -signkey "$key_file" -out "$cert_file" -days 365 -extensions v3_req -extfile "$config_file"
    
    # Copy cert as chain file for compatibility
    cp "$cert_file" "$chain_file"
    
    # Set proper permissions
    chmod 600 "$key_file"
    chmod 644 "$cert_file" "$chain_file"
    
    # Clean up
    rm -f "$csr_file" "$config_file"
    
    echo -e "${GREEN}✅ Self-signed certificate generated${NC}"
    echo -e "${YELLOW}⚠️  WARNING: Self-signed certificates are for development only!${NC}"
}

# Function to generate Let's Encrypt certificate
generate_letsencrypt_certificate() {
    echo -e "${YELLOW}🔐 Generating Let's Encrypt certificate for ${DOMAIN}...${NC}"
    
    local certbot_args=(
        "certonly"
        "--standalone"
        "--email" "$EMAIL"
        "--agree-tos"
        "--non-interactive"
        "--domains" "$DOMAIN"
        "--cert-path" "${CERT_DIR}/cert.pem"
        "--fullchain-path" "${CERT_DIR}/fullchain.pem"
        "--chain-path" "${CERT_DIR}/chain.pem"
        "--key-path" "${CERT_DIR}/privkey.pem"
    )
    
    if [ "$STAGING" = "true" ]; then
        certbot_args+=("--staging")
        echo -e "${YELLOW}⚠️  Using Let's Encrypt staging environment${NC}"
    fi
    
    if [ "$FORCE_RENEWAL" = "true" ]; then
        certbot_args+=("--force-renewal")
    fi
    
    # Run certbot
    if certbot "${certbot_args[@]}"; then
        echo -e "${GREEN}✅ Let's Encrypt certificate generated${NC}"
        
        # Set proper permissions
        chmod 600 "${CERT_DIR}/privkey.pem"
        chmod 644 "${CERT_DIR}/fullchain.pem" "${CERT_DIR}/chain.pem"
        
        # Create renewal reminder
        echo -e "${YELLOW}📅 Certificate expires in 90 days. Set up auto-renewal.${NC}"
    else
        echo -e "${RED}❌ Let's Encrypt certificate generation failed${NC}"
        exit 1
    fi
}

# Function to verify certificate
verify_certificate() {
    echo -e "${YELLOW}🔍 Verifying certificate...${NC}"
    
    local cert_file="${CERT_DIR}/fullchain.pem"
    local key_file="${CERT_DIR}/privkey.pem"
    
    if [ ! -f "$cert_file" ] || [ ! -f "$key_file" ]; then
        echo -e "${RED}❌ Certificate files not found${NC}"
        exit 1
    fi
    
    # Check certificate validity
    local cert_info=$(openssl x509 -in "$cert_file" -text -noout)
    local expiry_date=$(echo "$cert_info" | grep "Not After" | cut -d: -f2-)
    local subject=$(echo "$cert_info" | grep "Subject:" | cut -d: -f2-)
    
    echo -e "${BLUE}Certificate Information:${NC}"
    echo -e "   Subject:${subject}"
    echo -e "   Expires:${expiry_date}"
    
    # Verify key matches certificate
    local cert_modulus=$(openssl x509 -in "$cert_file" -modulus -noout | openssl md5)
    local key_modulus=$(openssl rsa -in "$key_file" -modulus -noout | openssl md5)
    
    if [ "$cert_modulus" = "$key_modulus" ]; then
        echo -e "${GREEN}✅ Certificate and key match${NC}"
    else
        echo -e "${RED}❌ Certificate and key do not match${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Certificate verification completed${NC}"
}

# Function to create renewal script
create_renewal_script() {
    if [ "$METHOD" = "letsencrypt" ]; then
        echo -e "${YELLOW}📝 Creating renewal script...${NC}"
        
        local renewal_script="${SCRIPT_DIR}/renew-certificates.sh"
        
        cat > "$renewal_script" << EOF
#!/bin/bash

# =================================
# Certificate Renewal Script
# Automatically renew Let's Encrypt certificates
# =================================

set -e

DOMAIN="$DOMAIN"
EMAIL="$EMAIL"
CERT_DIR="$CERT_DIR"

echo "🔄 Renewing certificates for \$DOMAIN..."

# Renew certificate
certbot renew --quiet

# Reload Nginx (if running)
if pgrep nginx >/dev/null 2>&1; then
    nginx -t && nginx -s reload
    echo "✅ Nginx reloaded"
fi

# Send notification (if webhook configured)
if [ -n "\$RENEWAL_WEBHOOK_URL" ]; then
    curl -X POST "\$RENEWAL_WEBHOOK_URL" \\
        -H "Content-Type: application/json" \\
        -d "{\"text\":\"SSL Certificate renewed for \$DOMAIN\"}" \\
        >/dev/null 2>&1 || true
fi

echo "🎉 Certificate renewal completed"
EOF
        
        chmod +x "$renewal_script"
        
        echo -e "${GREEN}✅ Renewal script created: ${renewal_script}${NC}"
        echo -e "${YELLOW}💡 Add to crontab: 0 12 * * * ${renewal_script}${NC}"
    fi
}

# Function to display certificate information
display_certificate_info() {
    echo ""
    echo -e "${BLUE}📊 Certificate Summary${NC}"
    echo -e "${BLUE}======================${NC}"
    echo -e "   Domain: ${DOMAIN}"
    echo -e "   Method: ${METHOD}"
    echo -e "   Certificate: ${CERT_DIR}/fullchain.pem"
    echo -e "   Private Key: ${CERT_DIR}/privkey.pem"
    echo -e "   Chain: ${CERT_DIR}/chain.pem"
    echo -e "   DH Params: ${DHPARAM_DIR}/dhparam.pem"
    echo ""
    
    if [ "$METHOD" = "selfsigned" ]; then
        echo -e "${YELLOW}⚠️  Development Certificate Generated${NC}"
        echo -e "${YELLOW}   This is a self-signed certificate for development only.${NC}"
        echo -e "${YELLOW}   Browsers will show security warnings.${NC}"
    else
        echo -e "${GREEN}🔒 Production Certificate Generated${NC}"
        echo -e "${GREEN}   Certificate is valid and trusted.${NC}"
    fi
    
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo -e "   1. Update your Nginx configuration to use these certificates"
    echo -e "   2. Test HTTPS connectivity"
    echo -e "   3. Set up certificate auto-renewal (Let's Encrypt only)"
    echo -e "   4. Configure security headers"
    echo ""
}

# Function to test certificate
test_certificate() {
    echo -e "${YELLOW}🧪 Testing certificate configuration...${NC}"
    
    # Test certificate loading
    if openssl x509 -in "${CERT_DIR}/fullchain.pem" -text -noout >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Certificate loads correctly${NC}"
    else
        echo -e "${RED}❌ Certificate loading failed${NC}"
        exit 1
    fi
    
    # Test private key loading
    if openssl rsa -in "${CERT_DIR}/privkey.pem" -check >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Private key is valid${NC}"
    else
        echo -e "${RED}❌ Private key validation failed${NC}"
        exit 1
    fi
    
    # Test DH parameters
    if [ -f "${DHPARAM_DIR}/dhparam.pem" ]; then
        if openssl dhparam -in "${DHPARAM_DIR}/dhparam.pem" -text -noout >/dev/null 2>&1; then
            echo -e "${GREEN}✅ DH parameters are valid${NC}"
        else
            echo -e "${RED}❌ DH parameters validation failed${NC}"
            exit 1
        fi
    fi
    
    echo -e "${GREEN}✅ Certificate configuration test completed${NC}"
}

# Main execution function
main() {
    echo -e "${BLUE}🔒 Personal Finance Tracker - SSL Certificate Setup${NC}"
    echo -e "${BLUE}===================================================${NC}"
    echo -e "   Domain: ${DOMAIN}"
    echo -e "   Method: ${METHOD}"
    echo -e "   Email: ${EMAIL}"
    echo -e "   Staging: ${STAGING}"
    echo ""
    
    validate_prerequisites
    create_directories
    
    # Generate certificates based on method
    case "$METHOD" in
        letsencrypt)
            generate_letsencrypt_certificate
            ;;
        selfsigned)
            generate_selfsigned_certificate
            ;;
    esac
    
    # Generate DH parameters
    generate_dhparam
    
    # Verify certificate
    verify_certificate
    test_certificate
    
    # Create renewal script for Let's Encrypt
    create_renewal_script
    
    # Display summary
    display_certificate_info
    
    echo -e "${GREEN}🎉 SSL certificate setup completed successfully!${NC}"
}

# Error handling
handle_error() {
    echo -e "${RED}❌ SSL certificate setup failed at step: ${BASH_COMMAND}${NC}"
    exit 1
}

trap handle_error ERR

# Parse arguments and execute
parse_arguments "$@"
main