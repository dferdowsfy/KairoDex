# Make.com Webhook Configuration Guide

## 🔧 Updated Webhook Payload

Your Make.com webhook will now receive this enhanced payload:

```json
{
  "client_id": "client1",
  "client_name": "Avery Brooks",
  "client_email": "avery.brooks@example.com", 
  "client_phone": "+1-555-0123",
  "agent_id": "agent1",
  "question": "client snapshot",
  "search_fields": {
    "name": "Avery Brooks",
    "email": "avery.brooks@example.com",
    "phone": "+1-555-0123", 
    "first_name": "Avery",
    "last_name": "Brooks"
  }
}
```

## 📋 Make.com Scenario Configuration

### Step 1: Webhook Module Setup
- Module: **Webhooks > Custom webhook**
- Method: **POST**
- Accept: **JSON**

### Step 2: Google Sheets Search Logic
Instead of just searching by `client_id`, use multiple search strategies:

#### Option A: Search by Name (Recommended)
```
Search criteria in Google Sheets:
- Column A (name_first): {{search_fields.first_name}}
- Column B (name_last): {{search_fields.last_name}}
OR
- Full name match: {{client_name}}
```

#### Option B: Search by Email (Most Reliable)
```
Search criteria:
- Column C (email): {{client_email}}
OR
- Column C (email): {{search_fields.email}}
```

#### Option C: Fuzzy Name Matching
```
Use Make.com's text functions:
- contains({{client_name}}, Sheet.name_first)
- contains(Sheet.name_last, {{search_fields.last_name}})
```

### Step 3: Response Format
Return this exact JSON structure:

#### Success Response:
```json
{
  "status": "ok",
  "client": {
    "client_id": "{{client_id}}",
    "name": "{{Sheet.name_first}} {{Sheet.name_last}}",
    "stage": "{{Sheet.stage}}",
    "budget": "{{Sheet.budget}}",
    "notes": "{{Sheet.notes}}", 
    "last_contact": "{{Sheet.last_contact}}",
    "next_action": "{{Sheet.next_action}}",
    "next_action_due": "{{Sheet.next_action_due}}"
  },
  "answer": "Based on {{Sheet.name_first}}'s profile, I recommend..."
}
```

#### Not Found Response:
```json
{
  "status": "not_found",
  "message": "No client found matching '{{client_name}}' ({{client_email}})"
}
```

#### Multiple Matches Response:
```json
{
  "status": "multiple", 
  "options": [
    {"client_id": "1", "name": "Sam Johnson"},
    {"client_id": "2", "name": "Sam Jackson"}
  ]
}
```

## 🔍 Google Sheets Column Mapping

Based on your screenshot, map these columns:

| Frontend Field | Sheet Column | Column Letter |
|---------------|--------------|---------------|
| Client Name | name_first + name_last | A + B |
| Email | email | C |
| Stage | stage | D |
| Budget | budget | E |
| Notes | notes | F |
| Last Contact | last_contact | G |
| Next Action | next_action | H |
| Next Action Due | next_action_due | I |

## 🧪 Testing Strategy

### Test Cases to Handle:

1. **Exact Name Match**
   - Frontend: "Jordan Brooks" 
   - Sheet: "Jordan" + "Brooks"
   - ✅ Should find match

2. **Email Match** 
   - Frontend: "priya.shah@email.com"
   - Sheet: "priya.shah@email.com"
   - ✅ Should find match

3. **Partial Name Match**
   - Frontend: "Avery Brooks"
   - Sheet: "Avery" + "Brooks-Smith" 
   - ⚠️ May need fuzzy matching

4. **No Match**
   - Frontend: "New Client"
   - Sheet: No matching row
   - ❌ Return "not_found"

## 🛠️ Recommended Make.com Flow

```
1. Webhook Trigger
   ↓
2. Google Sheets: Search rows
   - Filter by email (exact match)
   - OR filter by first_name + last_name
   ↓  
3. Router:
   Branch A: Found exactly 1 row → Return success
   Branch B: Found 0 rows → Return not_found  
   Branch C: Found 2+ rows → Return multiple options
   ↓
4. Webhook Response
```

## 🎯 Quick Fix Alternative

If the above is complex, you can also:

1. **Update Frontend Client Data** to match Google Sheets
2. **Add ID mapping** in Google Sheets (new column with frontend client IDs)
3. **Use email as primary key** if emails match between systems

Would you like me to help implement any of these approaches?
