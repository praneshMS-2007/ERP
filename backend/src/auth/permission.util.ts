export interface AuthenticatedUser {
  id: string;
  email?: string | null;
  role: string;
  permissions?: { module: string; action: string }[];
}

/**
 * The single source of truth for "can this user do X on module Y" — used by
 * RolesGuard (route-level) and by anything that needs the same check inside
 * a service (AI context assembly, global search). Kept in one place because
 * two copies of this logic drifting apart is exactly how a bypass like the
 * AI assistant's used to happen: the guard checked permissions, the service
 * never did.
 */
export function hasModuleAccess(
  user: AuthenticatedUser | undefined | null,
  module: string,
  action: string = 'READ',
): boolean {
  if (!user) return false;
  if (user.role === 'SUPER_ADMIN') return true;
  return !!user.permissions?.some(
    (p) => p.module === module && (p.action === action || p.action === 'ALL'),
  );
}
