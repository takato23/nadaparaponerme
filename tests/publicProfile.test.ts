import { describe, expect, it } from 'vitest';
import { getSafePublicDisplayName } from '../src/utils/publicProfile';

describe('publicProfile', () => {
  it('does not expose raw emails as public names', () => {
    expect(getSafePublicDisplayName('sgorbalan@gmail.com', null, 'Usuario')).toBe('sgorbalan');
    expect(getSafePublicDisplayName(null, 'admin@test.com', 'Usuario')).toBe('admin');
  });

  it('prefers explicit display name over username', () => {
    expect(getSafePublicDisplayName('Santi', 'sgorbalan', 'Usuario')).toBe('Santi');
  });
});
