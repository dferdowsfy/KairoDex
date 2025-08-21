-- SQL to insert your 14 contract files into the contract_files table
-- These are mapped for Maryland (MD) and Washington DC (DC)

-- Maryland contracts (state_code: 'MD', county_fips: '24031' for Montgomery County)
INSERT INTO public.contract_files (
  state_code,
  county_fips,
  contract_name,
  path,
  mime_type,
  status,
  created_by
) VALUES 
  -- Core Purchase Contracts
  ('MD', '24031', 'GCAAR Purchase Contract (Feb 2025)', 'md/gcaar_form_1301_february_2025_revisedfinal.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Buyer Broker Agreement', 'md/buyer-broker-agreement.pdf', 'application/pdf', 'original', auth.uid()),
  
  -- Addendums & Amendments
  ('MD', '24031', 'Seller Pays Buyer Broker Compensation Addendum', 'md/addendum-for-seller-to-pay-buyer-broker-compensation.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Additional Clauses Addendum (Part A)', 'md/addendum-of-clauses-a.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Additional Clauses Addendum (Part B)', 'md/addendum-of-clauses-b.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Blank Addendum Template', 'md/blank-addendum.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Montgomery County Jurisdictional Addendum', 'md/montgomery-county-jurisdictional-addendum-to-gcaar-sales-contract.pdf', 'application/pdf', 'original', auth.uid()),
  
  -- Inspection Contingencies
  ('MD', '24031', 'Home Inspection Contingency Notice/Addendum', 'md/home-inspection-contingency-notice-and-or-addendum.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Septic System Inspection Contingency', 'md/on-site-sewage-disposal-system-(-septic-)-inspection-contingency-notice-and-or-addendum.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Septic System Inspection Addendum', 'md/on-site-sewage-disposal-system-(septic)-inspection-addendum.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Well Water System Inspection Addendum', 'md/private-water-supply-system-(-well-)-inspection-addendum.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Well Water System Inspection Contingency', 'md/private-water-supply-system-(well)-inspection-contingency-notice-and-or-addendum.pdf', 'application/pdf', 'original', auth.uid()),
  
  -- Escrow & Legal
  ('MD', '24031', 'Escrow Agreement (Non-Broker Agent)', 'md/escrow-agreement-between-buyer-seller-and-non-broker-escrow-agent.pdf', 'application/pdf', 'original', auth.uid()),
  
  -- Informational
  ('MD', '24031', 'Important Real Estate Purchase Information', 'md/important-information-for-the-purchase-of-real-estate.pdf', 'application/pdf', 'original', auth.uid()),
  ('MD', '24031', 'Understanding Real Estate Agent Representation', 'md/understanding-whom-real-estate-agents-represent.pdf', 'application/pdf', 'original', auth.uid());

-- Washington DC contracts (state_code: 'DC', county_fips: '11001')
-- If you want the same contracts available for DC, uncomment and run these:
/*
INSERT INTO public.contract_files (
  state_code,
  county_fips,
  contract_name,
  path,
  mime_type,
  status,
  created_by
) VALUES 
  -- Core Purchase Contracts
  ('DC', '11001', 'GCAAR Purchase Contract (Feb 2025)', 'contracts/dc/gcaar_form_1301_february_2025_revisedfinal.pdf', 'application/pdf', 'original', auth.uid()),
  ('DC', '11001', 'Buyer Broker Agreement', 'contracts/dc/buyer-broker-agreement.pdf', 'application/pdf', 'original', auth.uid()),
  
  -- Add other contracts for DC if needed...
  -- (Copy the MD structure above and change state_code to 'DC', county_fips to '11001', and paths to 'contracts/dc/')
*/
