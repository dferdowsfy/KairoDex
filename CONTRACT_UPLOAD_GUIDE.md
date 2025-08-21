# Contract File Upload & Setup Guide

## Step 1: Upload Files to Supabase Storage

### Folder Structure
Create this structure in your `contracts` bucket:
```
contracts/
├── md/
│   ├── addendum-for-seller-to-pay-buyer-broker-compensation.pdf
│   ├── addendum-of-clauses-a.pdf
│   ├── addendum-of-clauses-b.pdf
│   ├── blank-addendum.pdf
│   ├── buyer-broker-agreement.pdf
│   ├── escrow-agreement-between-buyer-seller-and-non-broker-escrow-agent.pdf
│   ├── gcaar_form_1301_february_2025_revisedfinal.pdf
│   ├── home-inspection-contingency-notice-and-or-addendum.pdf
│   ├── important-information-for-the-purchase-of-real-estate.pdf
│   ├── montgomery-county-jurisdictional-addendum-to-gcaar-sales-contract.pdf
│   ├── on-site-sewage-disposal-system-(-septic-)-inspection-contingency-notice-and-or-addendum.pdf
│   ├── on-site-sewage-disposal-system-(septic)-inspection-addendum.pdf
│   ├── private-water-supply-system-(-well-)-inspection-addendum.pdf
│   ├── private-water-supply-system-(well)-inspection-contingency-notice-and-or-addendum.pdf
│   └── understanding-whom-real-estate-agents-represent.pdf
└── dc/ (optional, if you want same contracts for DC)
    └── [same files as md/]
```

## Step 2: Upload via Supabase Dashboard

1. Go to **Supabase Dashboard → Storage → contracts bucket**
2. Create folder: `md`
3. Upload all 14 PDF files to the `md/` folder
4. (Optional) Create `dc/` folder and upload copies for Washington DC

## Step 3: Insert Metadata Records

Run the SQL from `insert_contract_files.sql` in your Supabase SQL Editor:
- This creates metadata records for Maryland (Montgomery County)
- Links each file to its storage path
- Sets up proper categorization

## Step 4: Test the Frontend

1. Go to `/tasks` → click "Amend Contracts"
2. Select **Maryland** from State dropdown
3. Select **Montgomery County** from County dropdown
4. You should now see your contracts organized by category:
   - **Purchase Contracts**: GCAAR Purchase Contract, Buyer Broker Agreement
   - **Addendums & Amendments**: Various addendum forms
   - **Inspection Contingencies**: Home inspection, septic, well water forms
   - **Escrow & Legal**: Escrow agreement
   - **Informational**: Purchase info, agent representation

## Step 5: How It Works

1. **User selects a contract** → System loads PDF content from Supabase Storage
2. **Preview appears** → Shows the actual contract text
3. **Natural language input** → User types changes like "extend closing by 10 days"
4. **AI processes** → Creates amended version with summary
5. **New version saved** → Automatically creates v2, v3, etc. with full tracking

## Frontend Display Names

Your files will show with these user-friendly names:

| Original Filename | Display Name |
|------------------|--------------|
| `gcaar_form_1301_february_2025_revisedfinal.pdf` | GCAAR Purchase Contract (Feb 2025) |
| `addendum-for-seller-to-pay-buyer-broker-compensation.pdf` | Seller Pays Buyer Broker Compensation Addendum |
| `home-inspection-contingency-notice-and-or-addendum.pdf` | Home Inspection Contingency Notice/Addendum |
| `on-site-sewage-disposal-system-(-septic-)-inspection-contingency-notice-and-or-addendum.pdf` | Septic System Inspection Contingency |
| ...and so on |

## Geographic Coverage

- **Maryland**: Montgomery County (FIPS: 24031)
- **Washington DC**: District of Columbia (FIPS: 11001)

The system automatically filters contracts by selected state/county, so users only see relevant forms for their jurisdiction.
