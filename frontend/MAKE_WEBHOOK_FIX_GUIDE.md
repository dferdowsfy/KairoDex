# Make.com Webhook Configuration Guide for Client Selection

## Problem
The Make.com webhook is currently returning the same static client data ("Riley Davis") regardless of which client is selected in the frontend.

## Solution
You need to modify your Make.com scenario to:
1. Process the incoming client information from the request
2. Use that information to search in Google Sheets
3. Return the matching client data

## Steps to Fix

### 1. Add a JSON Parser Module
- Add a "JSON Parser" module right after your webhook trigger
- This will extract the client information from the incoming request
- Connect the webhook's "Data" output to the JSON Parser input

### 2. Add a Google Sheets Search Module
- After the JSON Parser, add a "Google Sheets > Search Rows" module
- Configure it to search in your client data spreadsheet
- Use the following search criteria:
  - Column for `client_id`: Map to `{{1.body.client_id}}`
  - OR Column for `client_name`: Map to `{{1.body.client_name}}`
  - OR Column for `email`: Map to `{{1.body.client_email}}`
  - OR Column for `first_name`: Map to `{{1.body.search_fields.first_name}}`

### 3. Modify the Webhook Response Module
- Update your webhook response module to use dynamic data from the Google Sheets search
- Replace the static JSON with dynamic mapping:

```json
{
  "status": "ok",
  "client": {
    "client_id": "{{2.id}}",
    "name": "{{2.name}}",
    "stage": "{{2.stage}}",
    "budget": "{{2.budget}}",
    "notes": "{{2.notes}}",
    "last_contact": "{{2.last_contact}}",
    "next_action": "{{2.next_action}}",
    "next_action_due": "{{2.next_action_due}}"
  },
  "answer": "Client data retrieved successfully"
}
```

Where `2` represents the output of your Google Sheets search module (adjust the number based on your scenario).

### 4. Add Error Handling
- Add a Router module after the Google Sheets search
- First route: If results found (length > 0)
  - Connect to the existing webhook response
- Second route: If no results (length = 0)
  - Connect to a new webhook response with this JSON:
```json
{
  "status": "not_found",
  "message": "No client found matching the provided information."
}
```

### 5. Test Your Changes
- Run the scenario with a test webhook call using the debug-client-selection.js script
- Verify that different client requests return different client data from Google Sheets

## Notes
- Make sure your Google Sheets module has the correct spreadsheet ID and sheet name
- Ensure you have proper column mappings in the Google Sheets module
- Test with multiple client names to verify proper matching
