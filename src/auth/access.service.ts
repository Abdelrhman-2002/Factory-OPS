import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  isPlatformAdmin,
  ORG_ADMIN_ROLES,
  type OrganizationAccess,
  type RequiredPermission,
} from './auth.types.js';

export function permissionName({ resource, action }: RequiredPermission) {
  return `${resource.toLowerCase()}:${action.toLowerCase()}`;
}

@Injectable()
export class AccessService {
  constructor(private readonly prisma: PrismaService) {}

  // Platform admins and organization owners/admins pass every check;
  // everyone else needs the permission on their custom role.
  async authorize(
    user: { id: string; role?: string | null },
    organizationId: string,
    required: RequiredPermission,
  ): Promise<OrganizationAccess> {
    const member = await this.prisma.member.findUnique({
      where: { organizationId_userId: { organizationId, userId: user.id } },
      include: {
        customRole: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    if (isPlatformAdmin(user)) {
      const exists = await this.prisma.organization.count({ where: { id: organizationId } });
      if (!exists) throw new NotFoundException('Organization not found');
      return {
        organizationId,
        memberId: member?.id ?? null,
        orgRole: member?.role ?? null,
        isOrgAdmin: true,
      };
    }

    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const isOrgAdmin = ORG_ADMIN_ROLES.includes(member.role);
    const granted =
      isOrgAdmin ||
      member.customRole?.permissions.some(
        ({ permission }) =>
          permission.resource === required.resource && permission.action === required.action,
      );

    if (!granted) {
      throw new ForbiddenException(`Missing permission ${permissionName(required)}`);
    }

    return { organizationId, memberId: member.id, orgRole: member.role, isOrgAdmin };
  }
}
