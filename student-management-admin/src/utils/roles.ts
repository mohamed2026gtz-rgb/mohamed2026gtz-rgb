export interface RoleCarrier {
  roles?: string[] | null;
}

export const FULL_ADMIN_ROLES = new Set([
  'system admin',
  'manager',
  'admin',
  'administrator',
]);

export const ADMINISTRATION_ROLES = new Set([
  ...FULL_ADMIN_ROLES,
  'data entry staff',
  'center',
  'district',
  'region',
  'university',
]);

export const SCOPED_STAFF_ROLES = new Set([
  'data entry staff',
  'center',
  'district',
  'region',
  'university',
]);

export function normalizeRole(role: string): string {
  return role.trim().toLowerCase();
}

export function hasAnyRole(user: RoleCarrier | null | undefined, roleSet: Set<string>): boolean {
  return (user?.roles ?? []).some((role) => roleSet.has(normalizeRole(role)));
}

export function isAdministration(user: RoleCarrier | null | undefined): boolean {
  return hasAnyRole(user, ADMINISTRATION_ROLES);
}

export function isFullAdmin(user: RoleCarrier | null | undefined): boolean {
  return hasAnyRole(user, FULL_ADMIN_ROLES);
}

export function isAdmin(user: RoleCarrier | null | undefined): boolean {
  return isFullAdmin(user);
}

export function isScopedStaff(user: RoleCarrier | null | undefined): boolean {
  return hasAnyRole(user, SCOPED_STAFF_ROLES);
}

export function isRegionScopeUser(
  user: (RoleCarrier & { accessScope?: { scopeType?: string | null; regionId?: number | null } | null }) | null | undefined
): boolean {
  return user?.accessScope?.scopeType === 'region' && user.accessScope.regionId != null;
}

function toTitleCase(value: string): string {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

export function primaryRoleLabel(user: RoleCarrier | null | undefined): string {
  const roles = user?.roles ?? [];
  if (!roles.length) return 'User';
  if (isAdministration(user)) return 'Administration';
  return toTitleCase(roles[0]);
}