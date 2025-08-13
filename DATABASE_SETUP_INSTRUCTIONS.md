# 🔧 Database Setup Instructions for AgentHub Conversational Flows

## 📍 **WHERE TO RUN THESE SCRIPTS**

You need to run these SQL scripts in your **Supabase Dashboard**, specifically in the **SQL Editor**.

### **Step-by-Step Location Guide:**

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Log in to your account
   - Select your **AgentHub** project

2. **Navigate to SQL Editor**
   - On the left sidebar, click **"SQL Editor"**
   - This is where you'll paste and run the SQL scripts

3. **Create a New Query**
   - Click **"New Query"** button
   - You'll see a blank SQL editor

---

## 🚀 **EXECUTION ORDER (IMPORTANT!)**

### **Step 1: Run `fix_database_schema.sql` FIRST**

1. **Open the file** `fix_database_schema.sql` from your project
2. **Copy the entire contents**
3. **Paste into Supabase SQL Editor**
4. **Click "Run" button** (or press Ctrl/Cmd + Enter)
5. **Wait for success message**: "Database preparation complete"

### **Step 2: Run `enhanced_database_schema_safe.sql` SECOND**

1. **Create a new query** in SQL Editor
2. **Open the file** `enhanced_database_schema_safe.sql` from your project  
3. **Copy the entire contents**
4. **Paste into the new SQL Editor tab**
5. **Click "Run" button** (or press Ctrl/Cmd + Enter)
6. **Wait for success message**: "Database schema update completed successfully!"

---

## ✅ **What Each Script Does**

### **Script 1: `fix_database_schema.sql`**
- ✅ Adds missing columns to existing `clients` table
- ✅ Safely cleans up old triggers and functions  
- ✅ Prepares database for the main schema
- ✅ **Fixed the "interactions table doesn't exist" error**

### **Script 2: `enhanced_database_schema_safe.sql`**  
- ✅ Creates all 9 new tables for conversational flows
- ✅ Adds indexes for performance
- ✅ Sets up Row Level Security (RLS)
- ✅ Creates triggers and functions
- ✅ Handles existing tables gracefully

---

## 🐛 **Error Resolution**

The error you were getting:
```
ERROR: 42P01: relation "interactions" does not exist
```

**Was caused by:** The script trying to drop triggers on tables that don't exist yet.

**Now fixed by:** Wrapping trigger drops in existence checks using `IF EXISTS` blocks.

---

## 🎯 **After Running Both Scripts**

Your database will have these new tables:
- `clients` (enhanced with new columns)
- `interactions` 
- `contracts`
- `contract_events`
- `showings`
- `property_listings`
- `client_properties`
- `scheduled_messages`
- `agent_calendar`

**Then you can:**
1. Start your backend server
2. Use the new "AI Flows" tab in your frontend
3. Add sample data using the "Add Sample Data" button
4. Test all three conversational flows!

---

## 🆘 **If You Still Get Errors**

1. **Check which script failed** - look at the error message
2. **Run them one at a time** - don't run both together
3. **Make sure you're in the right Supabase project**
4. **Check you have proper permissions** - you should be the owner/admin

**Location reminder:** Supabase Dashboard → Your Project → SQL Editor → New Query → Paste → Run
