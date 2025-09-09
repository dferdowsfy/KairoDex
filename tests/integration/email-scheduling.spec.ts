import { scheduleEmail, sendEmail } from '../../app/api/email';
import { expect } from 'chai';

describe('Email Scheduling Integration Tests', () => {
	it('should send scheduled email at the correct time', async () => {
		const emailDetails = {
			to: 'test@example.com',
			subject: 'Scheduled Email',
			body: 'This is a test for scheduled email sending.',
			scheduleTime: new Date(Date.now() + 5000) // 5 seconds from now
		};

		await scheduleEmail(emailDetails);
		const result = await new Promise((resolve) => {
			setTimeout(async () => {
				const sentEmail = await sendEmail(emailDetails);
				resolve(sentEmail);
			}, 6000); // wait for 6 seconds to ensure the email is sent
		});

		expect(result).to.include(emailDetails);
	});
});