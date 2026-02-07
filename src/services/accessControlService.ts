import type { User } from '@supabase/supabase-js';

const ADMIN_ROLES = new Set(['admin', 'owner', 'superadmin']);

const ADMIN_EMAILS_FROM_ENV = String(import.meta.env.VITE_ADMIN_EMAILS || '')
  .split(',')
  .map((email) => email.trim().toLowerCase())
  .filter(Boolean);

/**
 * Centralized admin access check.
 * Priority:
 * 1) Supabase role metadata (recommended)
 * 2) Optional allow-list via VITE_ADMIN_EMAILS
 */
export function isAdminUser(
  user: Pick<User, 'email' | 'app_metadata' | 'user_metadata'> | null | undefined
): boolean {
  if (!user) return false;

  const appRole = typeof user.app_metadata?.role === 'string'
    ? user.app_metadata.role.toLowerCase()
    : '';
  const userRole = typeof user.user_metadata?.role === 'string'
    ? user.user_metadata.role.toLowerCase()
    : '';

  if (ADMIN_ROLES.has(appRole) || ADMIN_ROLES.has(userRole)) {
    return true;
  }

  const email = user.email?.trim().toLowerCase();
  if (!email) return false;

  return ADMIN_EMAILS_FROM_ENV.includes(email);
}
