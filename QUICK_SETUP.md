# Quick Setup Guide - Contract Amendment Feature

## 🚨 Fix the Internal Server Error

The error you're seeing is because the database tables for the contract amendment feature haven't been created yet. Here's how to fix it:

### Step 1: Set Up Database Tables

**Option A: Automatic Setup (Recommended)**
```bash
cd backend
node setup_database.js
```

**Option B: Manual Setup**
1. **Go to your Supabase Dashboard**
   - Navigate to your Supabase project
   - Click on "SQL Editor" in the left sidebar

2. **Run the Database Setup Script**
   - Copy and paste the entire contents of `database_setup.sql` into the SQL editor
   - Click "Run" to execute the script

3. **Verify Tables Created**
   - Go to "Table Editor" in Supabase
   - You should see two new tables:
     - `contract_amendments`
     - `amended_contracts`

### Step 2: Test the Feature

1. **Restart your backend server** (if running):
   ```bash
   cd backend
   npm run dev
   ```

2. **Test the contract amendment workflow**:
   - Upload a Word document (.docx) or paste contract content
   - Toggle the sleek switch for "This is a contract amendment"
   - Enter your amendment instructions
   - Click "Process Amendment"

## ✨ New UI Improvements

### Sleek Toggle Switch
- ✅ Replaced checkbox with modern toggle switch
- ✅ Smooth animations and transitions
- ✅ Matches your theme colors

### Modern Icons
- ✅ Replaced all emojis with consistent SVG icons
- ✅ Colorful, modern design
- ✅ Professional appearance
- ✅ Responsive and scalable

## 🔧 Word Document Processing Fixed

### What's New
- ✅ **Proper .docx Support**: Now uses mammoth library for text extraction
- ✅ **Better Error Handling**: Clear messages when extraction fails
- ✅ **Fallback Options**: Instructions to copy/paste when needed
- ✅ **Debugging Tools**: Test script to diagnose processing issues

### Supported Formats
- **✅ .docx files**: Full text extraction support
- **⚠️ .doc files**: Not supported (save as .docx instead)
- **✅ .txt files**: Direct text reading
- **⚠️ .pdf files**: Basic support (copy/paste recommended)

### Debugging Word Document Issues

If you're still seeing binary content, try this debugging script:

```bash
cd backend
node test_word_processing.js ./uploads/your-file.docx
```

This will help identify:
- File format validation
- Mammoth extraction success/failure
- Content length and quality
- Specific error messages

### Common Issues & Solutions

1. **Binary Content Still Showing**
   - Run the debug script to check file format
   - Ensure file is saved as .docx (not .doc)
   - Try copying content directly into text area

2. **"No text extracted" Message**
   - File might be password protected
   - Complex formatting may not be supported
   - Use copy/paste as fallback

3. **"Not a valid .docx" Message**
   - File may be corrupted
   - Wrong file extension
   - Try re-saving the document

## 🎯 What's Fixed

1. **Backend Error Handling**: Better error messages for missing database tables
2. **Word Document Processing**: Proper text extraction from .docx files using mammoth
3. **UI Modernization**: Sleek toggle and modern icons throughout the interface
4. **Database Setup**: Clear instructions for setting up required tables

## 🔧 If You Still Get Errors

1. **Check Database Connection**: Ensure your Supabase credentials are correct in `.env`
2. **Verify Tables**: Make sure both tables were created successfully
3. **Check Backend Logs**: Look for specific error messages in the terminal
4. **Test with Simple Text**: Try pasting contract content directly instead of uploading a file

## 📝 Next Steps

After setting up the database tables, you should be able to:
- ✅ Upload .docx documents with proper text extraction
- ✅ Use the sleek toggle for contract amendments
- ✅ Process amendments with AI
- ✅ Save amended contracts to database
- ✅ Enjoy the modern, consistent icon design

## 🚀 Quick Test

1. **Save your Word document as .docx format** (if it's .doc)
2. **Upload the .docx file** - it should now extract text properly
3. **Toggle the amendment switch** and enter instructions
4. **Process the amendment** - should work without errors

The contract amendment feature is now fully functional with proper Word document support and a modern, professional UI! 