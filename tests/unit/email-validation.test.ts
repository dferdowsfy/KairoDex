import { validateEmail } from '../../lib/emailValidation';

test('valid email', () => {
    expect(validateEmail('test@example.com')).toBe(true);
});

test('invalid email without @', () => {
    expect(validateEmail('testexample.com')).toBe(false);
});

test('invalid email without domain', () => {
    expect(validateEmail('test@')).toBe(false);
});

test('invalid email with spaces', () => {
    expect(validateEmail('test @example.com')).toBe(false);
});