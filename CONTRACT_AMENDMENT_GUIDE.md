# Contract Amendment Feature Guide

## Overview

The Contract Amendment feature allows real estate agents to upload signed contracts and request AI-powered amendments based on natural language instructions. The AI will generate a revised version with all changes marked in **bold** using Markdown formatting.

## How to Use

### 1. Upload or Enter Contract Content

- **Option A**: Type or paste the contract content directly into the text area
- **Option B**: Upload a contract file using the drag-and-drop area or file browser
  - Supported formats: `.txt`, `.pdf`, `.doc`, `.docx`, `.csv`
  - Maximum file size: 10MB

### 2. Enable Contract Amendment Mode

- Check the "This is a contract amendment" checkbox
- A new text area will appear asking for amendment instructions

### 3. Provide Amendment Instructions

Enter clear, specific instructions about what changes you want made to the contract. Examples:

- "Change the closing date to March 15th, 2024"
- "Increase the earnest money deposit to $10,000"
- "Update the property address to 123 Main Street, Anytown, CA 90210"
- "Change the buyer's name from John Smith to John and Jane Smith"

### 4. Process the Amendment

- Click "Process Amendment" button
- The AI will analyze your contract and instructions
- A revised version will be generated with changes marked in **bold**

### 5. Review and Save

- Review the amended contract in the preview panel
- Changes are highlighted in bold text
- Click "Save Contract" to store the amended version
- Use "Copy" to copy the amended contract to clipboard

## Features

### AI-Powered Processing
- Uses OpenAI GPT-4 for intelligent contract analysis
- Maintains legal document structure and formatting
- Only changes specified sections while preserving the rest

### Visual Change Highlighting
- All modifications are marked in **bold** text
- Easy to identify what was changed
- Maintains document readability

### Secure Storage
- Original and amended contracts are stored in Supabase
- Amendment instructions are logged for audit trail
- Row-level security ensures data privacy

### Integration
- Works seamlessly with existing AgentHub workflow
- Compatible with current client management system
- No changes to existing features or UI

## Technical Details

### Backend Endpoints

#### Process Contract Amendment
```
POST /api/contract-amendment
Content-Type: application/json

{
  "contract": "string",
  "instruction": "string", 
  "clientId": "string"
}
```

#### Save Amended Contract
```
POST /api/save-amended-contract
Content-Type: application/json

{
  "clientId": "string",
  "originalContract": "string",
  "amendedContract": "string",
  "instruction": "string"
}
```

### Database Tables

#### contract_amendments
- Logs all amendment requests for audit trail
- Stores original contract, instruction, and AI-generated result

#### amended_contracts  
- Stores final saved amended contracts
- Links to agent and client for organization

### Security
- All endpoints require authentication
- Row-level security in database
- User can only access their own contracts

## Best Practices

### Writing Clear Instructions
- Be specific about what needs to change
- Include exact values (dates, amounts, names)
- Mention section names if possible
- Avoid ambiguous language

### Review Process
- Always review AI-generated amendments
- Verify all requested changes were made correctly
- Check that no unintended changes occurred
- Ensure legal compliance

### File Management
- Use descriptive file names when uploading
- Keep original contracts for reference
- Organize by client and date

## Troubleshooting

### Common Issues

**AI doesn't make the expected changes**
- Try rephrasing your instructions more specifically
- Include exact section references if possible
- Break complex changes into multiple instructions

**File upload fails**
- Check file size (max 10MB)
- Ensure file format is supported
- Try converting to .txt format if issues persist

**Processing takes too long**
- Large contracts may take longer to process
- Check your internet connection
- Try with a smaller section of the contract

### Support
For technical issues or feature requests, please contact the development team or create an issue in the project repository. 