// All US States and Territories with contract templates
export const allStates = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 
  'Delaware', 'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 
  'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 
  'New Jersey', 'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina', 'South Dakota', 
  'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia', 
  'Wisconsin', 'Wyoming', 'District of Columbia', 'Puerto Rico', 'U.S. Virgin Islands', 
  'Guam', 'American Samoa', 'Northern Mariana Islands'
];

// Standard contract template for all states
export const getStandardContract = (stateName) => {
  // Custom templates for specific states
  const customTemplates = {
    'California': {
      'Residential Purchase Agreement': `CALIFORNIA RESIDENTIAL PURCHASE AGREEMENT

This agreement is between:

BUYER: _________________ (the "Buyer")
SELLER: _________________ (the "Seller")

PROPERTY: _________________ (the "Property")

PURCHASE PRICE: $_________________ (the "Purchase Price")

EARNEST MONEY: $_________________ (the "Earnest Money")

CLOSING DATE: _________________ (the "Closing Date")

TERMS AND CONDITIONS:

1. EARNEST MONEY: Buyer shall pay the Earnest Money to the escrow agent.

2. TITLE: Seller shall deliver marketable title to the Property at closing.

3. INSPECTION PERIOD: Buyer shall have 17 days to complete inspections (California requirement).

4. FINANCING: This contract is contingent upon Buyer obtaining financing.

5. CLOSING COSTS: Buyer and Seller shall pay their respective closing costs.

6. POSSESSION: Buyer shall receive possession of the Property at closing.

7. DEFAULT: If Buyer defaults, Seller may retain the Earnest Money. If Seller defaults, Buyer may recover the Earnest Money plus costs.

8. TITLE INSURANCE: Seller shall provide and pay for a title insurance policy.

9. SURVEY: Seller shall furnish a survey of the Property.

10. PROPERTY CONDITION: The Property is sold in its present condition.

11. CALIFORNIA SPECIFIC: This contract complies with California Civil Code requirements.

Dated: _________________`,

      'Seller Disclosure': `CALIFORNIA SELLER'S DISCLOSURE STATEMENT

PROPERTY ADDRESS: _________________

SELLER: _________________

This disclosure statement is made in compliance with California Civil Code Section 1102.

PROPERTY CONDITION:

1. STRUCTURAL ITEMS:
   □ Foundation
   □ Walls
   □ Roof
   □ Floors
   □ Ceilings
   □ Windows
   □ Doors

2. MECHANICAL SYSTEMS:
   □ Electrical
   □ Plumbing
   □ Heating
   □ Air conditioning
   □ Appliances

3. ENVIRONMENTAL CONDITIONS:
   □ Lead paint
   □ Asbestos
   □ Radon
   □ Mold
   □ Underground storage tanks
   □ Earthquake hazards
   □ Other: _________________

4. KNOWN DEFECTS:
   □ _________________
   □ _________________
   □ _________________

Seller certifies that the information provided is true and accurate to the best of Seller's knowledge.

Dated: _________________`,

      'Addendum': `ADDENDUM TO CALIFORNIA RESIDENTIAL PURCHASE AGREEMENT

This Addendum is attached to and made a part of the California Residential Purchase Agreement dated _________________ between Seller: _________________ and Buyer: _________________ for the property located at: _________________

ADDITIONAL TERMS:

1. FINANCING CONTINGENCY:
   This contract is contingent upon Buyer obtaining a mortgage loan in the amount of $_________________.

2. APPRAISAL CONTINGENCY:
   This contract is contingent upon the Property appraising for at least the Purchase Price.

3. HOME INSPECTION:
   Buyer shall have the right to conduct a home inspection within 17 days (California requirement).

4. REPAIRS:
   Seller agrees to complete the following repairs prior to closing:
   □ _________________
   □ _________________

5. PERSONAL PROPERTY:
   The following personal property is included in the sale:
   □ _________________
   □ _________________

6. SPECIAL CONDITIONS:
   □ _________________
   □ _________________

All other terms of the original contract remain in full force and effect.

Dated: _________________`
    },

    'Texas': {
      'Residential Purchase Agreement': `TEXAS RESIDENTIAL PURCHASE AGREEMENT

This agreement is between:

BUYER: _________________ (the "Buyer")
SELLER: _________________ (the "Seller")

PROPERTY: _________________ (the "Property")

PURCHASE PRICE: $_________________ (the "Purchase Price")

EARNEST MONEY: $_________________ (the "Earnest Money")

CLOSING DATE: _________________ (the "Closing Date")

TERMS AND CONDITIONS:

1. EARNEST MONEY: Buyer shall pay the Earnest Money to the escrow agent.

2. TITLE: Seller shall deliver marketable title to the Property at closing.

3. INSPECTION PERIOD: Buyer shall have 10 days to complete inspections.

4. FINANCING: This contract is contingent upon Buyer obtaining financing.

5. CLOSING COSTS: Buyer and Seller shall pay their respective closing costs.

6. POSSESSION: Buyer shall receive possession of the Property at closing.

7. DEFAULT: If Buyer defaults, Seller may retain the Earnest Money. If Seller defaults, Buyer may recover the Earnest Money plus costs.

8. TITLE INSURANCE: Seller shall provide and pay for a title insurance policy.

9. SURVEY: Seller shall furnish a survey of the Property.

10. PROPERTY CONDITION: The Property is sold in its present condition.

11. TEXAS SPECIFIC: This contract complies with Texas Property Code requirements.

Dated: _________________`,

      'Seller Disclosure': `TEXAS SELLER'S DISCLOSURE STATEMENT

PROPERTY ADDRESS: _________________

SELLER: _________________

This disclosure statement is made in compliance with Texas Property Code Section 5.008.

PROPERTY CONDITION:

1. STRUCTURAL ITEMS:
   □ Foundation
   □ Walls
   □ Roof
   □ Floors
   □ Ceilings
   □ Windows
   □ Doors

2. MECHANICAL SYSTEMS:
   □ Electrical
   □ Plumbing
   □ Heating
   □ Air conditioning
   □ Appliances

3. ENVIRONMENTAL CONDITIONS:
   □ Lead paint
   □ Asbestos
   □ Radon
   □ Mold
   □ Underground storage tanks
   □ Other: _________________

4. KNOWN DEFECTS:
   □ _________________
   □ _________________
   □ _________________

Seller certifies that the information provided is true and accurate to the best of Seller's knowledge.

Dated: _________________`,

      'Addendum': `ADDENDUM TO TEXAS RESIDENTIAL PURCHASE AGREEMENT

This Addendum is attached to and made a part of the Texas Residential Purchase Agreement dated _________________ between Seller: _________________ and Buyer: _________________ for the property located at: _________________

ADDITIONAL TERMS:

1. FINANCING CONTINGENCY:
   This contract is contingent upon Buyer obtaining a mortgage loan in the amount of $_________________.

2. APPRAISAL CONTINGENCY:
   This contract is contingent upon the Property appraising for at least the Purchase Price.

3. HOME INSPECTION:
   Buyer shall have the right to conduct a home inspection within 10 days.

4. REPAIRS:
   Seller agrees to complete the following repairs prior to closing:
   □ _________________
   □ _________________

5. PERSONAL PROPERTY:
   The following personal property is included in the sale:
   □ _________________
   □ _________________

6. SPECIAL CONDITIONS:
   □ _________________
   □ _________________

All other terms of the original contract remain in full force and effect.

Dated: _________________`
    }
  };

  // Return custom template if available, otherwise return standard template
  if (customTemplates[stateName]) {
    return customTemplates[stateName];
  }

  // Standard template for all other states
  return {
    'Residential Purchase Agreement': `${stateName.toUpperCase()} RESIDENTIAL PURCHASE AGREEMENT

This agreement is between:

BUYER: _________________ (the "Buyer")
SELLER: _________________ (the "Seller")

PROPERTY: _________________ (the "Property")

PURCHASE PRICE: $_________________ (the "Purchase Price")

EARNEST MONEY: $_________________ (the "Earnest Money")

CLOSING DATE: _________________ (the "Closing Date")

TERMS AND CONDITIONS:

1. EARNEST MONEY: Buyer shall pay the Earnest Money to the escrow agent.

2. TITLE: Seller shall deliver marketable title to the Property at closing.

3. INSPECTION PERIOD: Buyer shall have 10 days to complete inspections.

4. FINANCING: This contract is contingent upon Buyer obtaining financing.

5. CLOSING COSTS: Buyer and Seller shall pay their respective closing costs.

6. POSSESSION: Buyer shall receive possession of the Property at closing.

7. DEFAULT: If Buyer defaults, Seller may retain the Earnest Money. If Seller defaults, Buyer may recover the Earnest Money plus costs.

8. TITLE INSURANCE: Seller shall provide and pay for a title insurance policy.

9. SURVEY: Seller shall furnish a survey of the Property.

10. PROPERTY CONDITION: The Property is sold in its present condition.

Dated: _________________`,

    'Seller Disclosure': `${stateName.toUpperCase()} SELLER'S DISCLOSURE STATEMENT

PROPERTY ADDRESS: _________________

SELLER: _________________

This disclosure statement is made in compliance with ${stateName} law.

PROPERTY CONDITION:

1. STRUCTURAL ITEMS:
   □ Foundation
   □ Walls
   □ Roof
   □ Floors
   □ Ceilings
   □ Windows
   □ Doors

2. MECHANICAL SYSTEMS:
   □ Electrical
   □ Plumbing
   □ Heating
   □ Air conditioning
   □ Appliances

3. ENVIRONMENTAL CONDITIONS:
   □ Lead paint
   □ Asbestos
   □ Radon
   □ Mold
   □ Underground storage tanks
   □ Other: _________________

4. KNOWN DEFECTS:
   □ _________________
   □ _________________
   □ _________________

Seller certifies that the information provided is true and accurate to the best of Seller's knowledge.

Dated: _________________`,

    'Addendum': `ADDENDUM TO ${stateName.toUpperCase()} RESIDENTIAL PURCHASE AGREEMENT

This Addendum is attached to and made a part of the ${stateName} Residential Purchase Agreement dated _________________ between Seller: _________________ and Buyer: _________________ for the property located at: _________________

ADDITIONAL TERMS:

1. FINANCING CONTINGENCY:
   This contract is contingent upon Buyer obtaining a mortgage loan in the amount of $_________________.

2. APPRAISAL CONTINGENCY:
   This contract is contingent upon the Property appraising for at least the Purchase Price.

3. HOME INSPECTION:
   Buyer shall have the right to conduct a home inspection within 10 days.

4. REPAIRS:
   Seller agrees to complete the following repairs prior to closing:
   □ _________________
   □ _________________

5. PERSONAL PROPERTY:
   The following personal property is included in the sale:
   □ _________________
   □ _________________

6. SPECIAL CONDITIONS:
   □ _________________
   □ _________________

All other terms of the original contract remain in full force and effect.

Dated: _________________`
  };
};

// Generate jurisdictions array for the app
export const generateJurisdictions = () => {
  return allStates.map(state => {
    const stateId = state.toLowerCase().replace(/\s+/g, '');
    const contracts = getStandardContract(state);
    
    return {
      id: stateId,
      name: state,
      documents: [
        {
          name: 'Residential Purchase Agreement',
          content: contracts['Residential Purchase Agreement']
        },
        {
          name: 'Seller Disclosure',
          content: contracts['Seller Disclosure']
        },
        {
          name: 'Addendum',
          content: contracts['Addendum']
        }
      ]
    };
  });
}; 