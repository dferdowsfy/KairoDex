# Tasks Page: Contract Amendment System

## Features Implemented

### 1. ✅ Amend Contracts UI
- **State Selection**: Dropdown with all US states from `lib/us.ts`
- **Jurisdiction Filtering**: County selection via `/api/geo/counties` (Census API)
- **Contract Selection**: 
  - Template contracts from `lib/contracts.ts` (state-specific + generic)
  - Real contracts from Supabase Storage via `contract_files` table
- **Live Preview**: Shows selected contract content in scrollable box
- **Natural Language Editor**: Text area for describing changes
- **AI Processing**: Uses `/api/contracts/apply` and `/api/contracts/amend-storage`

### 2. ✅ Generate Follow-Up
- Reordered as 2nd priority quick action
- Uses existing `/api/ai/followup` endpoint
- Prompts for tone (Professional, Friendly, Concise)
- Shows result in alert dialog

### 3. ✅ Create Task  
- Reordered as 3rd priority quick action
- Uses existing task creation flow
- Opens the "Add task" form directly

### 4. ✅ Supabase Integration
- **Database Schema**: `contract_files` table with metadata
- **Storage Bucket**: Private "contracts" bucket for PDFs/documents
- **RLS Policies**: Secure authenticated access
- **Version Control**: Amendments create new versions with incremented numbers

## API Endpoints

### `/api/contracts/amend-storage` (NEW)
```typescript
POST { contractFileId, naturalChanges, clientId }
→ { updatedContractId, summary, newPath, version }
```
- Downloads original from Supabase Storage
- Applies AI changes via `lib/ai.ts`
- Uploads amended version with versioned filename
- Creates new `contract_files` record with status 'amended'
- Logs amendment event

### `/api/contracts/apply` (EXISTING)
```typescript
POST { contractTemplate, naturalChanges, clientContext }
→ { updated, summary }
```
- For template contracts (not storage-backed)
- Returns updated contract text + change summary

## Database Schema (Supabase)

```sql
-- Contracts bucket (private, 50MB limit)
bucket: contracts

-- Contract metadata table
contract_files:
  - id (uuid, primary key)
  - client_id (uuid, nullable)
  - state_code (text, e.g., 'CA')
  - county_fips (text, e.g., '06037')
  - contract_name (text)
  - bucket (text, default 'contracts')
  - path (text, unique storage path)
  - status ('original'|'amended'|'final')
  - version (integer, starts at 1)
  - created_at, updated_at, created_by
```

## How to Use

### For Template Contracts:
1. Go to `/tasks` → click "Amend Contracts"
2. Select State → (optional) County → Contract template
3. Preview appears automatically
4. Type natural language changes: "extend closing by 10 days, add inspection contingency"
5. Click "Apply changes" → see updated contract + summary

### For Your 10 PDF Contracts:
1. Upload PDFs to Supabase Storage bucket "contracts"
2. Insert metadata records in `contract_files` table with correct state/county/path
3. Same UI flow, but click the uploaded contract buttons instead of template dropdown
4. AI downloads, amends, and saves new version automatically

## File Changes Made

### `/app/(routes)/tasks/page.tsx`
- Added Supabase contract state management
- Added county loading from Census API
- Added contract file selection UI
- Modified `onApplyChanges` to handle both templates and storage contracts
- Reordered quick action buttons

### `/app/api/contracts/amend-storage/route.ts` (NEW)
- Handles Supabase Storage contract amendments
- Downloads → AI amends → uploads new version → creates metadata record

### Database setup via provided SQL
- Creates `contract_files` table
- Sets up RLS policies
- Creates storage bucket and policies

## ✅ Contract File Mapping Complete

### User-Friendly Display Names
Your 14 contract files now show with clean, readable names:

- **Purchase Contracts**:
  - GCAAR Purchase Contract (Feb 2025)
  - Buyer Broker Agreement

- **Addendums & Amendments**:
  - Seller Pays Buyer Broker Compensation Addendum
  - Additional Clauses Addendum (Part A)
  - Additional Clauses Addendum (Part B)
  - Blank Addendum Template
  - Montgomery County Jurisdictional Addendum

- **Inspection Contingencies**:
  - Home Inspection Contingency Notice/Addendum
  - Septic System Inspection Contingency
  - Septic System Inspection Addendum
  - Well Water System Inspection Addendum
  - Well Water System Inspection Contingency

- **Escrow & Legal**:
  - Escrow Agreement (Non-Broker Agent)

- **Informational**:
  - Important Real Estate Purchase Information
  - Understanding Real Estate Agent Representation

### Geographic Setup
- **Maryland**: Montgomery County (FIPS: 24031)
- **Washington DC**: District of Columbia (FIPS: 11001)

### Next Steps to Complete Setup

1. **Upload Files**: Upload your 14 PDFs to `contracts/md/` folder in Supabase Storage
2. **Run SQL**: Execute `insert_contract_files.sql` in Supabase SQL Editor
3. **Test**: Go to Tasks → Amend Contracts → Select MD/Montgomery → See categorized contracts

### File Changes Made

### `/lib/contractMappings.ts` (NEW)
- Maps original filenames to user-friendly display names
- Categorizes contracts by type (Purchase, Addendums, Inspections, etc.)
- Helper functions for display and categorization

### `/app/(routes)/tasks/page.tsx`
- Updated to use display names from mapping
- Shows contracts organized by category
- Better visual hierarchy with category headers

### Database setup via provided SQL
- Creates `contract_files` table
- Sets up RLS policies
- Creates storage bucket and policies

## Next Steps

1. **Upload your 10 PDFs** to the "contracts" bucket
2. **Insert metadata** for each PDF in `contract_files` table
3. **Test the flow**: Select state/county → click uploaded contract → describe changes → apply
4. **Optional**: Add file upload UI to let users upload contracts directly from the Tasks page

The system now supports natural language editing of both template contracts and your actual PDF contracts stored in Supabase, with full version control and metadata tracking.
