import { createParamDecorator, ExecutionContext, SetMetadata } from '@nestjs/common';
import type { PermissionAction, PermissionResource } from '../generated/prisma/enums.js';
import type { AuthenticatedRequest, RequiredPermission } from './auth.types.js';

export const IS_PUBLIC_KEY = 'isPublic';
export const PLATFORM_ADMIN_KEY = 'platformAdmin';
export const PERMISSION_KEY = 'permission';

// Skips the session check (health checks, the Better Auth handler itself).
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

// Only users with the platform "admin" role.
export const PlatformAdminOnly = () => SetMetadata(PLATFORM_ADMIN_KEY, true);

// Requires a BREAD permission inside the organization named by the :organizationId route param.
export const RequirePermission = (resource: PermissionResource, action: PermissionAction) =>
  SetMetadata(PERMISSION_KEY, { resource, action } satisfies RequiredPermission);

export const CurrentSession = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => ctx.switchToHttp().getRequest<AuthenticatedRequest>().auth,
);

export const CurrentOrganizationAccess = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().organizationAccess!,
);
