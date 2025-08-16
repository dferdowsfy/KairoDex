export type ContractTemplate = {
  id: string
  name: string
  template: string
}

// Minimal demo templates; extend or load from a CMS later
const DEFAULT_TEMPLATES: ContractTemplate[] = [
  {
    id: 'generic-rpa',
    name: 'Residential Purchase Agreement (Generic)',
    template: `RESIDENTIAL PURCHASE AGREEMENT

Parties: [Buyer] and [Seller].
Property: [Address].
Purchase Price: [Amount].
Closing Date: [Date].
Financing: [Type].
Contingencies: [Contingencies].

Additional Terms:
- [Terms]

Signatures:
Buyer: ____________  Date: ______
Seller: ____________  Date: ______
`
  },
  {
    id: 'generic-addendum',
    name: 'Contract Addendum (Generic)',
    template: `CONTRACT ADDENDUM

This Addendum modifies the agreement dated [Original Date] for the property at [Address].

Amendments:
1. [Amendment]

All other terms remain in full force and effect.

Signatures:
Buyer: ____________  Date: ______
Seller: ____________  Date: ______
`
  }
]

// Example jurisdiction-specific overrides
const BY_STATE: Record<string, ContractTemplate[]> = {
  CA: [
    {
      id: 'ca-rpa',
      name: 'California Residential Purchase Agreement (Sample)',
      template: `CALIFORNIA RESIDENTIAL PURCHASE AGREEMENT (Sample)

Buyer: [Buyer]
Seller: [Seller]
Property: [Address], County of [County], State of California.
Purchase Price: [Amount].
Closing: [Date].
Disclosures: As required by California Civil Code.

Contingencies and Terms:
- [Terms]

Signatures:
Buyer: ____________  Date: ______
Seller: ____________  Date: ______
`
    }
  ]
}

export function getContractsForJurisdiction(stateCode?: string, _countyFips?: string): ContractTemplate[] {
  const list = (stateCode && BY_STATE[stateCode]) || []
  return [...list, ...DEFAULT_TEMPLATES]
}
