#!/bin/bash

echo "Testing amend-storage API..."

# Test with a known contract ID
response=$(curl -s -X POST "http://localhost:3002/api/contracts/amend-storage" \
  -H "Content-Type: application/json" \
  -d '{
    "contractFileId": "9b96cb41-42ca-4c03-be59-cf1c57ce4941",
    "naturalChanges": "change conventional loan in the amount of $360,000.00 to $400,000.00",
    "clientId": "test-client"
  }')

echo "Response:"
echo "$response" | jq . 2>/dev/null || echo "$response"
