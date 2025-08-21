// Contract file display name mappings for better UX
export const CONTRACT_DISPLAY_NAMES: Record<string, string> = {
  // Addendum contracts
  'addendum-for-seller-to-pay-buyer-broker-compensation.pdf': 'Seller Pays Buyer Broker Compensation Addendum',
  'addendum-of-clauses-a.pdf': 'Additional Clauses Addendum (Part A)',
  'addendum-of-clauses-b.pdf': 'Additional Clauses Addendum (Part B)', 
  'blank-addendum.pdf': 'Blank Addendum Template',
  
  // Core agreements
  'buyer-broker-agreement.pdf': 'Buyer Broker Agreement',
  'escrow-agreement-between-buyer-seller-and-non-broker-escrow-agent.pdf': 'Escrow Agreement (Non-Broker Agent)',
  'gcaar_form_1301_february_2025_revisedfinal.pdf': 'GCAAR Purchase Contract (Feb 2025)',
  
  // Inspection and contingency forms
  'home-inspection-contingency-notice-and-or-addendum.pdf': 'Home Inspection Contingency Notice/Addendum',
  'on-site-sewage-disposal-system-(-septic-)-inspection-contingency-notice-and-or-addendum.pdf': 'Septic System Inspection Contingency',
  'on-site-sewage-disposal-system-(septic)-inspection-addendum.pdf': 'Septic System Inspection Addendum',
  'private-water-supply-system-(-well-)-inspection-addendum.pdf': 'Well Water System Inspection Addendum',
  'private-water-supply-system-(well)-inspection-contingency-notice-and-or-addendum.pdf': 'Well Water System Inspection Contingency',
  
  // Jurisdictional and informational
  'montgomery-county-jurisdictional-addendum-to-gcaar-sales-contract.pdf': 'Montgomery County Jurisdictional Addendum',
  'important-information-for-the-purchase-of-real-estate.pdf': 'Important Real Estate Purchase Information',
  'understanding-whom-real-estate-agents-represent.pdf': 'Understanding Real Estate Agent Representation'
}

// Categorize contracts by type for better organization
export const CONTRACT_CATEGORIES = {
  'Purchase Contracts': [
    'gcaar_form_1301_february_2025_revisedfinal.pdf',
    'buyer-broker-agreement.pdf'
  ],
  'Addendums & Amendments': [
    'addendum-for-seller-to-pay-buyer-broker-compensation.pdf',
    'addendum-of-clauses-a.pdf',
    'addendum-of-clauses-b.pdf',
    'blank-addendum.pdf',
    'montgomery-county-jurisdictional-addendum-to-gcaar-sales-contract.pdf'
  ],
  'Inspection Contingencies': [
    'home-inspection-contingency-notice-and-or-addendum.pdf',
    'on-site-sewage-disposal-system-(-septic-)-inspection-contingency-notice-and-or-addendum.pdf',
    'on-site-sewage-disposal-system-(septic)-inspection-addendum.pdf',
    'private-water-supply-system-(-well-)-inspection-addendum.pdf',
    'private-water-supply-system-(well)-inspection-contingency-notice-and-or-addendum.pdf'
  ],
  'Escrow & Legal': [
    'escrow-agreement-between-buyer-seller-and-non-broker-escrow-agent.pdf'
  ],
  'Informational': [
    'important-information-for-the-purchase-of-real-estate.pdf',
    'understanding-whom-real-estate-agents-represent.pdf'
  ]
}

// Helper function to get display name
export function getContractDisplayName(filename: string): string {
  return CONTRACT_DISPLAY_NAMES[filename] || filename.replace(/-/g, ' ').replace(/\.pdf$/i, '')
}

// Helper function to get category for a contract
export function getContractCategory(filename: string): string {
  for (const [category, files] of Object.entries(CONTRACT_CATEGORIES)) {
    if (files.includes(filename)) {
      return category
    }
  }
  return 'Other'
}
