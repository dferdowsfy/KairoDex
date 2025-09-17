const { cleanPlaceholders, sanitizeEmailBody } = require('./lib/emailSanitizer')

const sample = `Dear John,\n\nI hope this message finds you well.\n\nI wanted to remind you of our upcoming inspection scheduled for October 1, 2025.\nYour next step is to review the property disclosure documents I'll send over.\n\nPlease confirm your pre-approval status with your lender by September 30, 2025.\n\nCould you let me know your availability for a quick call this week? I'm available for a brief discussion tomorrow at 2pm or Friday at 10am.\n\nCongratulations on completing the home inspection - we're making great progress.\n\nThank you for your time and attention.\n\nBest regards,\nAgent\n`;

console.log('--- RAW ---')
console.log(sample)

const cleaned = cleanPlaceholders(sample, 'John', 'Agent')
console.log('\n--- CLEANED ---')
console.log(cleaned)

const sanitized = sanitizeEmailBody('Inspection Reminder', cleaned)
console.log('\n--- SANITIZED (subject removed if present) ---')
console.log(sanitized)
