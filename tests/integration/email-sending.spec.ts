import { sendEmail } from '../../app/api/email/send';
import { scheduleEmail } from '../../app/api/email/schedule';

describe('Email Sending Integration Tests', () => {
    it('should send an email successfully', async () => {
        const response = await sendEmail({
            to: 'test@example.com',
            subject: 'Test Email',
            body: 'This is a test email.'
        });
        expect(response.status).toBe(200);
        expect(response.message).toBe('Email sent successfully');
    });

    it('should fail to send an email with invalid address', async () => {
        const response = await sendEmail({
            to: 'invalid-email',
            subject: 'Test Email',
            body: 'This is a test email.'
        });
        expect(response.status).toBe(400);
        expect(response.message).toBe('Invalid email address');
    });

    it('should schedule an email successfully', async () => {
        const response = await scheduleEmail({
            to: 'test@example.com',
            subject: 'Scheduled Email',
            body: 'This is a scheduled email.',
            scheduleTime: new Date(Date.now() + 3600000) // 1 hour later
        });
        expect(response.status).toBe(200);
        expect(response.message).toBe('Email scheduled successfully');
    });

    it('should fail to schedule an email with past time', async () => {
        const response = await scheduleEmail({
            to: 'test@example.com',
            subject: 'Scheduled Email',
            body: 'This is a scheduled email.',
            scheduleTime: new Date(Date.now() - 3600000) // 1 hour ago
        });
        expect(response.status).toBe(400);
        expect(response.message).toBe('Schedule time must be in the future');
    });
});