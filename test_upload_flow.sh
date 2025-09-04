#!/bin/bash

# Test script to debug bulk upload to AgentHub_DB
# This script will test the upload flow step by step

echo "=== Testing Bulk Upload Flow ==="

# Test 1: Check if server is running
echo "1. Testing server health..."
SERVER_HEALTH=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3001/api/clients/bulk-upload)
if [ "$SERVER_HEALTH" = "401" ] || [ "$SERVER_HEALTH" = "500" ]; then
    echo "✓ Server is responding (got $SERVER_HEALTH as expected for unauthenticated request)"
else
    echo "✗ Server issue - got HTTP $SERVER_HEALTH"
    exit 1
fi

# Test 2: Try bulk upload without auth (should get 401)
echo "2. Testing bulk upload without auth..."
UPLOAD_RESPONSE=$(curl -s -X POST http://localhost:3001/api/clients/bulk-upload \
  -H "Content-Type: application/json" \
  -d '{"rows":[{"name":"Test User","email":"test@example.com"}]}')

echo "Response: $UPLOAD_RESPONSE"
if [[ "$UPLOAD_RESPONSE" == *"Auth session missing"* ]]; then
    echo "✓ Auth protection working correctly"
else
    echo "✗ Unexpected response"
fi

echo ""
echo "=== Next Steps ==="
echo "1. Apply the database migration:"
echo "   - Open Supabase SQL editor"
echo "   - Run the contents of database_migrations/20250903_ensure_agenthub_columns.sql"
echo ""
echo "2. Test upload in browser:"
echo "   - Go to http://localhost:3001"
echo "   - Login to the app"
echo "   - Use Add Client modal with sample text"
echo "   - Check browser console and Network tab for errors"
echo ""
echo "3. Check Supabase database:"
echo "   - Look for rows in AgentHub_DB table"
echo "   - Verify the table has required columns"
