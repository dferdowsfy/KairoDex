#!/bin/bash
# Quick test script for task creation and contract listing

echo "Testing task creation API..."
curl -X POST http://localhost:3001/api/sheets/tasks \
  -H "Content-Type: application/json" \
  -d '{"client_id":"test-client","title":"Test Task from Script","status":"open"}' \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n\nTesting contract listing API..."
curl -X GET "http://localhost:3001/api/contracts/list?clientId=test-client" \
  -H "Content-Type: application/json" \
  -w "\nHTTP Status: %{http_code}\n"

echo -e "\n\nTest completed."