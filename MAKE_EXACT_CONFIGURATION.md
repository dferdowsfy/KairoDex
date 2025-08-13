# Make.com Configuration for Google Sheets Client Lookup

## 🎯 **Exact Column Mapping**

Based on your Google Sheets structure:
- **Column D**: `first_name` (Sam, Casey, Riley, etc.)
- **Column E**: `last_name` (Johnson, Martinez, Davis, etc.)  
- **Column C**: `email` (sam.johnson@email.com, etc.)

## 📋 **Make.com Scenario Setup**

### 1. Webhook Trigger
- **Module**: Webhooks > Custom webhook
- **Method**: POST
- **Data structure**: JSON

### 2. Google Sheets Search Module
- **Module**: Google Sheets > Search rows
- **Spreadsheet**: Your AgentHub sheet
- **Sheet**: First sheet (gid=0)

### 3. Search Filters (Use OR logic)
```
Filter 1: Column D (first_name) equals {{search_fields.first_name}}
AND Column E (last_name) equals {{search_fields.last_name}}

OR

Filter 2: Column C (email) equals {{client_email}}
```

### 4. Response Mapping

#### Success Response (1 row found):
```json
{
  "status": "ok",
  "client": {
    "client_id": "{{client_id}}",
    "name": "{{Column D}} {{Column E}}",
    "stage": "{{Column F}}",
    "budget": "{{Column G}}", 
    "notes": "{{Column H}}",
    "last_contact": "{{Column I}}",
    "next_action": "{{Column J}}",
    "next_action_due": "{{Column K}}"
  },
  "answer": "Based on {{Column D}}'s current {{Column F}} stage..."
}
```

#### Not Found Response (0 rows):
```json
{
  "status": "not_found", 
  "message": "No client found matching {{client_name}}"
}
```

## 🧪 **Test Data**

Frontend will send this for "Sam Johnson":
```json
{
  "client_id": "client1",
  "client_name": "Sam Johnson", 
  "client_email": "sam.johnson@email.com",
  "search_fields": {
    "first_name": "Sam",
    "last_name": "Johnson"
  }
}
```

Make.com should find:
- **Column D**: "Sam" 
- **Column E**: "Johnson"
- **Column C**: "sam.johnson@email.com"

## ✅ **Verification Steps**

1. **Test the webhook URL directly** using the test file
2. **Check Make.com execution log** for search results
3. **Verify column mappings** match your sheet structure
4. **Test with frontend** using Sam Johnson client

## 🔧 **Troubleshooting**

If not found:
- ✅ Check column letters (D=first_name, E=last_name)
- ✅ Verify exact spelling matches ("Sam" not "Samuel")
- ✅ Check for extra spaces in sheet data
- ✅ Ensure case-sensitive matching is off
