#!/bin/bash

# Email Worker Cron Job Setup Script
# This script helps you set up automatic email processing

echo "🔧 Email Worker Cron Job Setup"
echo "================================"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found"
    echo "Please create .env.local and add your CRON_SECRET"
    echo "Example: CRON_SECRET=your-secure-random-secret"
    exit 1
fi

# Get the current directory
CURRENT_DIR=$(pwd)
PROJECT_URL="http://localhost:3000"

# Check if we're in production
if [ "$NODE_ENV" = "production" ]; then
    echo "📝 Enter your production domain (e.g., https://yourdomain.com):"
    read PROJECT_URL
fi

echo ""
echo "📋 Cron Job Configuration"
echo "=========================="
echo "This will set up a cron job to process emails every 5 minutes"
echo ""
echo "Add this line to your crontab (run 'crontab -e'):"
echo ""
echo "*/5 * * * * curl -H \"x-cron-secret: \$(grep CRON_SECRET $CURRENT_DIR/.env.local | cut -d '=' -f2)\" $PROJECT_URL/api/email/worker/process > /dev/null 2>&1"
echo ""
echo "Or use this curl command to test manually:"
echo ""
echo "curl -H \"x-cron-secret: \$(grep CRON_SECRET .env.local | cut -d '=' -f2)\" $PROJECT_URL/api/email/worker/process"
echo ""

# Offer to test the endpoint
echo "🧪 Would you like to test the email worker endpoint now? (y/n)"
read -r test_now

if [ "$test_now" = "y" ] || [ "$test_now" = "Y" ]; then
    echo "🔄 Testing email worker..."
    
    # Extract CRON_SECRET from .env.local
    CRON_SECRET=$(grep CRON_SECRET .env.local | cut -d '=' -f2)
    
    if [ -z "$CRON_SECRET" ]; then
        echo "❌ CRON_SECRET not found in .env.local"
        exit 1
    fi
    
    # Test the endpoint
    response=$(curl -s -H "x-cron-secret: $CRON_SECRET" "$PROJECT_URL/api/email/worker/process")
    
    if [ $? -eq 0 ]; then
        echo "✅ Email worker test successful!"
        echo "Response: $response"
    else
        echo "❌ Email worker test failed"
        echo "Make sure your server is running at $PROJECT_URL"
    fi
fi

echo ""
echo "🎯 Next Steps:"
echo "1. Configure your email provider in .env.local (see .env.email.example)"
echo "2. Set NEXT_PUBLIC_USE_MOCKS=false for real email delivery"
echo "3. Add the cron job to automate email processing"
echo "4. Visit /emails dashboard to monitor email delivery"
echo ""
echo "📧 Email System Ready!"
