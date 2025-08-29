#!/bin/sh

# =================================
# Nginx Reload Script
# Used after SSL certificate renewal
# =================================

set -e

echo "🔄 Reloading Nginx after SSL certificate renewal..."

# Check if nginx container is running
if docker ps | grep -q "finance_tracker_nginx"; then
    echo "📋 Testing Nginx configuration..."
    
    # Test configuration
    if docker exec finance_tracker_nginx nginx -t; then
        echo "✅ Nginx configuration is valid"
        
        # Reload Nginx
        docker exec finance_tracker_nginx nginx -s reload
        echo "✅ Nginx reloaded successfully"
        
        # Verify SSL certificate
        sleep 2
        echo "🔍 Verifying SSL certificate..."
        
        if command -v openssl >/dev/null 2>&1; then
            echo | openssl s_client -servername "${DOMAIN}" -connect "${DOMAIN}:443" 2>/dev/null | \
            openssl x509 -noout -dates
        fi
        
        echo "🎉 SSL certificate renewal and Nginx reload completed"
    else
        echo "❌ Nginx configuration test failed"
        exit 1
    fi
else
    echo "⚠️  Nginx container not found or not running"
    exit 1
fi