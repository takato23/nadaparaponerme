import { describe, expect, it } from 'vitest';

import { getSafePublicDisplayName, isEmailLike } from '../src/utils/publicProfile';

describe('publicProfile', () => {
  it('detects email-like display names', () => {
    expect(isEmailLike('sgorbalan@gmail.com')).toBe(true);
    expect(isEmailLike('santiagobalosky')).toBe(false);
  });

  it('falls back to username when display name leaks an email', () => {
    expect(getSafePublicDisplayName('sgorbalan@gmail.com', 'santiagobalosky6')).toBe('santiagobalosky6');
  });

  it('returns a generic fallback when both labels are unsafe or empty', () => {
    expect(getSafePublicDisplayName('smokeadmin17721@gmail.com', '', 'Usuario')).toBe('Usuario');
  });
});
