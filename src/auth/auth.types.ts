import type { Request } from 'express';
import type { AuthSession } from './auth.js';
import type { PermissionAction, PermissionResource } from '../generated/prisma/enums.js';

export const PLATFORM_ADMIN_ROLE = 'admin';
// Better Auth organization roles that get every permission inside their organization.
export const ORG_ADMIN_ROLES = ['owner', 'admin'];

export interface OrganizationAccess {
  organizationId: string;
  // Null when a platform admin acts inside an organization they are not a member of.
  memberId: string | null;
  orgRole: string | null;
  isOrgAdmin: boolean;
}

export interface AuthenticatedRequest extends Request {
  auth: AuthSession;
  organizationAccess?: OrganizationAccess;
}

export interface RequiredPermission {
  resource: PermissionResource;
  action: PermissionAction;
}

export function isPlatformAdmin(user: { role?: string | null }) {
  return user.role === PLATFORM_ADMIN_ROLE;
}
