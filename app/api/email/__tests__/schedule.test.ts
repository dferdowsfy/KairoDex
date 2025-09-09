const { scheduleEmail } = require('../schedule');
const { mockDate } = require('mockdate');

describe('Email Scheduling Functionality', () => {
	beforeEach(() => {
		mockDate('2023-10-01T10:00:00Z');
	});

	afterEach(() => {
		mockDate.reset();
	});

	test('should schedule an email to be sent at a specific time', () => {
		const scheduledTime = new Date('2023-10-01T12:00:00Z');
		const result = scheduleEmail('test@example.com', 'Subject', 'Body', scheduledTime);
		expect(result).toEqual(expect.objectContaining({
			email: 'test@example.com',
			subject: 'Subject',
			body: 'Body',
			scheduledTime: scheduledTime,
		}));
	});

	test('should not schedule an email in the past', () => {
		const pastTime = new Date('2023-09-30T10:00:00Z');
		expect(() => {
			scheduleEmail('test@example.com', 'Subject', 'Body', pastTime);
		}).toThrow('Scheduled time must be in the future');
	});
});