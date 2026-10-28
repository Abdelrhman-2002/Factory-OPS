import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AccessService } from '../access.service.js';
import { isPlatformAdmin, type AuthenticatedRequest, type RequiredPermission } from '../auth.types.js';
import { PERMISSION_KEY, PLATFORM_ADMIN_KEY } from '../decorators.js';

// Global guard, runs after SessionGuard: enforces @PlatformAdminOnly() and @RequirePermission().
@Injectable()
export class AccessGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly access: AccessService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const targets = [context.getHandler(), context.getClass()];
    const platformAdminOnly = this.reflector.getAllAndOverride<boolean>(PLATFORM_ADMIN_KEY, targets);
    const permission = this.reflector.getAllAndOverride<RequiredPermission>(PERMISSION_KEY, targets);
    if (!platformAdminOnly && !permission) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = req.auth.user;

    if (platformAdminOnly && !isPlatformAdmin(user)) {
      throw new ForbiddenException('Platform administrators only');
    }

    if (permission) {
      const organizationId = req.params.organizationId;
      if (typeof organizationId !== 'string') {
        throw new ForbiddenException('Organization is missing from the route');
      }
      req.organizationAccess = await this.access.authorize(user, organizationId, permission);
    }

    return true;
  }
}
