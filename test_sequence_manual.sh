#!/bin/bash

# Manual Email Processor Trigger
# Use this script to manually process emails without waiting for cron

echo "🔄 Manual Email Sequence Processing"
echo "=================================="

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Local server not running at http://localhost:3000"
    echo "💡 Start it with: npm run dev"
    exit 1
fi

# Check if .env.local exists and has CRON_SECRET
if [ ! -f .env.local ]; then
    echo "❌ .env.local file not found"
    exit 1
fi

CRON_SECRET=$(grep CRON_SECRET .env.local | cut -d '=' -f2 | tr -d '"')
if [ -z "$CRON_SECRET" ]; then
    echo "❌ CRON_SECRET not found in .env.local"
    echo "💡 Add: CRON_SECRET=your-secret-key"
    exit 1
fi

echo "✅ Found CRON_SECRET"
echo ""

# Function to trigger processor
trigger_processor() {
    echo "🚀 Triggering email processor..."
    
    response=$(curl -s -w "HTTPSTATUS:%{http_code}" \
        -H "x-cron-secret: $CRON_SECRET" \
        -H "Content-Type: application/json" \
        -X POST \
        "http://localhost:3000/api/email/cron/process")
    
    # Extract the body and status
    body=$(echo $response | sed -E 's/HTTPSTATUS\:[0-9]{3}$//')
    status=$(echo $response | tr -d '\n' | sed -E 's/.*HTTPSTATUS:([0-9]{3})$/\1/')
    
    if [ "$status" = "200" ]; then
        echo "✅ Success! Response:"
        echo "$body" | python3 -m json.tool 2>/dev/null || echo "$body"
    else
        echo "❌ Failed with status $status"
        echo "Response: $body"
    fi
    
    echo ""
}

# Function to check pending emails
check_pending() {
    echo "📋 Checking pending emails..."
    node -e "
        const { createClient } = require('@supabase/supabase-js');
        require('dotenv').config({ path: '.env.local' });
        
        const supabase = createClient(
            process.env.SUPABASE_URL,
            process.env.SUPABASE_SERVICE_ROLE_KEY
        );
        
        (async () => {
            const now = new Date().toISOString();
            const { data, error } = await supabase
                .from('email_schedules')
                .select('subject, scheduled_at, status')
                .eq('status', 'pending')
                .order('scheduled_at', { ascending: true })
                .limit(10);
            
            if (error) {
                console.log('❌ Error:', error.message);
                return;
            }
            
            if (!data || data.length === 0) {
                console.log('ℹ️  No pending emails found');
                return;
            }
            
            console.log(\`📧 Found \${data.length} pending email(s):\`);
            data.forEach((email, i) => {
                const scheduled = new Date(email.scheduled_at);
                const isPast = scheduled <= new Date();
                const timeStr = scheduled.toLocaleString();
                const status = isPast ? '🟢 Ready' : '🟡 Future';
                console.log(\`   \${i+1}. \${status} \${email.subject} (\${timeStr})\`);
            });
        })();
    " 2>/dev/null
    echo ""
}

# Main menu
while true; do
    echo "Choose an option:"
    echo "1. Check pending emails"
    echo "2. Trigger processor once"
    echo "3. Auto-trigger every 30 seconds (press Ctrl+C to stop)"
    echo "4. Fast-forward all pending emails to now"
    echo "5. Exit"
    echo ""
    read -p "Enter choice (1-5): " choice
    
    case $choice in
        1)
            check_pending
            ;;
        2)
            trigger_processor
            ;;
        3)
            echo "🔄 Starting auto-trigger mode (Ctrl+C to stop)..."
            echo ""
            while true; do
                trigger_processor
                echo "⏳ Waiting 30 seconds..."
                sleep 30
            done
            ;;
        4)
            echo "⚡ Fast-forwarding all pending emails..."
            node test_sequence_fast.js
            echo ""
            ;;
        5)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice"
            echo ""
            ;;
    esac
done
