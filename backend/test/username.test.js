import { describe, expect, it } from 'vitest';
import { isValidUsername, normalizeUsername, usernameToEmail } from '../src/username';
describe('username', () => {
    it('normalizes', () => {
        expect(normalizeUsername('  AbC  ')).toBe('abc');
    });
    it('validates', () => {
        expect(isValidUsername('abc')).toBe(true);
        expect(isValidUsername('a')).toBe(false);
        expect(isValidUsername('ab c')).toBe(false);
        expect(isValidUsername('abc@')).toBe(false);
    });
    it('maps to pseudo email', () => {
        expect(usernameToEmail('abc')).toBe('abc@ban-den.local');
    });
});
