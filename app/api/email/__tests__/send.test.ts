const assert = require('assert');
const emailService = require('../emailService');

describe('Email Sending', () => {
    it('should send an email successfully', async () => {
        const result = await emailService.send({
            to: 'test@example.com',
            subject: 'Test Email',
            body: 'This is a test email.'
        });
        assert.strictEqual(result.success, true);
    });

    it('should fail to send an email with invalid address', async () => {
        const result = await emailService.send({
            to: 'invalid-email',
            subject: 'Test Email',
            body: 'This is a test email.'
        });
        assert.strictEqual(result.success, false);
    });
});