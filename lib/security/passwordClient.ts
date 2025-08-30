export function basicPasswordIssues(pw: string) {
  const issues: string[] = []
  if (!pw || pw.length < 12) issues.push('At least 12 characters')
  if (!/[A-Z]/.test(pw)) issues.push('Add an uppercase letter')
  if (!/[a-z]/.test(pw)) issues.push('Add a lowercase letter')
  if (!/\d/.test(pw)) issues.push('Add a number')
  if (!/[^A-Za-z0-9]/.test(pw)) issues.push('Add a symbol')
  return issues
}
