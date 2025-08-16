export type USState = { name: string; code: string; fips: string }

// 50 states + DC
export const US_STATES: USState[] = [
  { name: 'Alabama', code: 'AL', fips: '01' },
  { name: 'Alaska', code: 'AK', fips: '02' },
  { name: 'Arizona', code: 'AZ', fips: '04' },
  { name: 'Arkansas', code: 'AR', fips: '05' },
  { name: 'California', code: 'CA', fips: '06' },
  { name: 'Colorado', code: 'CO', fips: '08' },
  { name: 'Connecticut', code: 'CT', fips: '09' },
  { name: 'Delaware', code: 'DE', fips: '10' },
  { name: 'District of Columbia', code: 'DC', fips: '11' },
  { name: 'Florida', code: 'FL', fips: '12' },
  { name: 'Georgia', code: 'GA', fips: '13' },
  { name: 'Hawaii', code: 'HI', fips: '15' },
  { name: 'Idaho', code: 'ID', fips: '16' },
  { name: 'Illinois', code: 'IL', fips: '17' },
  { name: 'Indiana', code: 'IN', fips: '18' },
  { name: 'Iowa', code: 'IA', fips: '19' },
  { name: 'Kansas', code: 'KS', fips: '20' },
  { name: 'Kentucky', code: 'KY', fips: '21' },
  { name: 'Louisiana', code: 'LA', fips: '22' },
  { name: 'Maine', code: 'ME', fips: '23' },
  { name: 'Maryland', code: 'MD', fips: '24' },
  { name: 'Massachusetts', code: 'MA', fips: '25' },
  { name: 'Michigan', code: 'MI', fips: '26' },
  { name: 'Minnesota', code: 'MN', fips: '27' },
  { name: 'Mississippi', code: 'MS', fips: '28' },
  { name: 'Missouri', code: 'MO', fips: '29' },
  { name: 'Montana', code: 'MT', fips: '30' },
  { name: 'Nebraska', code: 'NE', fips: '31' },
  { name: 'Nevada', code: 'NV', fips: '32' },
  { name: 'New Hampshire', code: 'NH', fips: '33' },
  { name: 'New Jersey', code: 'NJ', fips: '34' },
  { name: 'New Mexico', code: 'NM', fips: '35' },
  { name: 'New York', code: 'NY', fips: '36' },
  { name: 'North Carolina', code: 'NC', fips: '37' },
  { name: 'North Dakota', code: 'ND', fips: '38' },
  { name: 'Ohio', code: 'OH', fips: '39' },
  { name: 'Oklahoma', code: 'OK', fips: '40' },
  { name: 'Oregon', code: 'OR', fips: '41' },
  { name: 'Pennsylvania', code: 'PA', fips: '42' },
  { name: 'Rhode Island', code: 'RI', fips: '44' },
  { name: 'South Carolina', code: 'SC', fips: '45' },
  { name: 'South Dakota', code: 'SD', fips: '46' },
  { name: 'Tennessee', code: 'TN', fips: '47' },
  { name: 'Texas', code: 'TX', fips: '48' },
  { name: 'Utah', code: 'UT', fips: '49' },
  { name: 'Vermont', code: 'VT', fips: '50' },
  { name: 'Virginia', code: 'VA', fips: '51' },
  { name: 'Washington', code: 'WA', fips: '53' },
  { name: 'West Virginia', code: 'WV', fips: '54' },
  { name: 'Wisconsin', code: 'WI', fips: '55' },
  { name: 'Wyoming', code: 'WY', fips: '56' }
]

export function getStateByCode(code: string) {
  return US_STATES.find(s => s.code === code)
}

export function getStateByFips(fips: string) {
  return US_STATES.find(s => s.fips === fips)
}
