import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service.js';
import { AccountsService } from '../auth/accounts.service.js';
import { ORG_ADMIN_ROLES, type OrganizationAccess } from '../auth/auth.types.js';
import { paginate, paginated, type PaginationQueryDto } from '../common/pagination.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateMemberDto, UpdateMemberDto } from './members.dto.js';

const memberInclude = {
  user: { select: { id: true, name: true, email: true, phoneNumber: true, image: true } },
  customRole: { select: { id: true, name: true } },
} satisfies Prisma.MemberInclude;

type MemberWithRelations = Prisma.MemberGetPayload<{ include: typeof memberInclude }>;

function toResponse(member: MemberWithRelations) {
  const { customRole, roleId: _roleId, userId: _userId, role, ...rest } = member;
  return { ...rest, orgRole: role, role: customRole };
}

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly audit: AuditService,
  ) {}

  async findAll(access: OrganizationAccess, query: PaginationQueryDto) {
    const where: Prisma.MemberWhereInput = {
      organizationId: access.organizationId,
      ...(query.search && {
        user: {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { email: { contains: query.search, mode: 'insensitive' } },
          ],
        },
      }),
    };

    const [members, total] = await this.prisma.$transaction([
      this.prisma.member.findMany({
        where,
        include: memberInclude,
        orderBy: { createdAt: 'asc' },
        ...paginate(query),
      }),
      this.prisma.member.count({ where }),
    ]);
    return paginated(members.map(toResponse), total, query);
  }

  async findOne(access: OrganizationAccess, memberId: string) {
    return toResponse(await this.getMember(access.organizationId, memberId));
  }

  // Creates the employee's login and their membership in one transaction.
  async create(access: OrganizationAccess, dto: CreateMemberDto, actorId: string) {
    if (dto.orgRole === 'admin' && !access.isOrgAdmin) {
      throw new ForbiddenException('Only organization admins can create admins');
    }
    if (dto.roleId) await this.assertRoleInOrganization(access.organizationId, dto.roleId);

    const member = await this.prisma.$transaction(async (tx) => {
      const user = await this.accounts.createCredentialUser(tx, dto);
      const created = await tx.member.create({
        data: {
          id: randomUUID(),
          organizationId: access.organizationId,
          userId: user.id,
          role: dto.orgRole ?? 'member',
          roleId: dto.roleId,
          jobTitle: dto.jobTitle,
          department: dto.department,
          hiredAt: dto.hiredAt,
        },
        include: memberInclude,
      });

      await this.audit.log(tx, {
        organizationId: access.organizationId,
        authorId: actorId,
        action: 'CREATE',
        entityType: 'Member',
        entityId: created.id,
        changeDescription: `Added employee ${user.email} as ${created.role}`,
      });
      return created;
    });

    return toResponse(member);
  }

  async update(access: OrganizationAccess, memberId: string, dto: UpdateMemberDto, actorId: string) {
    const member = await this.getMember(access.organizationId, memberId);
    this.assertCanManage(access, member);

    if (dto.orgRole && dto.orgRole !== member.role) {
      if (!access.isOrgAdmin) throw new ForbiddenException('Only organization admins can change org roles');
      if (member.role === 'owner') throw new ForbiddenException('The owner role cannot be changed');
    }
    if (dto.roleId) await this.assertRoleInOrganization(access.organizationId, dto.roleId);

    const updated = await this.prisma.$transaction(async (tx) => {
      if (dto.name !== undefined || dto.phoneNumber !== undefined) {
        await tx.user.update({
          where: { id: member.userId },
          data: { name: dto.name, phoneNumber: dto.phoneNumber },
        });
      }

      const result = await tx.member.update({
        where: { id: member.id },
        data: {
          role: dto.orgRole,
          roleId: dto.roleId,
          jobTitle: dto.jobTitle,
          department: dto.department,
          hiredAt: dto.hiredAt,
        },
        include: memberInclude,
      });

      await this.audit.log(tx, {
        organizationId: access.organizationId,
        authorId: actorId,
        action: 'UPDATE',
        entityType: 'Member',
        entityId: member.id,
        changeDescription: `Updated employee ${member.user.email}`,
        before: {
          orgRole: member.role,
          roleId: member.roleId,
          jobTitle: member.jobTitle,
          department: member.department,
        },
        after: JSON.parse(JSON.stringify(dto)),
      });
      return result;
    });

    return toResponse(updated);
  }

  // Removes the membership. The login is deleted too when it belongs to no other
  // organization, since accounts only exist through memberships (closed signup).
  async remove(access: OrganizationAccess, memberId: string, actorId: string) {
    const member = await this.getMember(access.organizationId, memberId);
    if (member.userId === actorId) throw new BadRequestException('You cannot remove yourself');
    if (member.role === 'owner') throw new ForbiddenException('The owner cannot be removed');
    this.assertCanManage(access, member);

    await this.prisma.$transaction(async (tx) => {
      await tx.member.delete({ where: { id: member.id } });

      const user = await tx.user.findUniqueOrThrow({
        where: { id: member.userId },
        select: { role: true, _count: { select: { members: true } } },
      });
      if (user._count.members === 0 && user.role !== 'admin') {
        await tx.user.delete({ where: { id: member.userId } });
      } else {
        // Still a member elsewhere: just end their sessions so access is re-checked.
        await tx.session.deleteMany({ where: { userId: member.userId } });
      }

      await this.audit.log(tx, {
        organizationId: access.organizationId,
        authorId: actorId,
        action: 'DELETE',
        entityType: 'Member',
        entityId: member.id,
        changeDescription: `Removed employee ${member.user.email}`,
      });
    });
  }

  private async getMember(organizationId: string, memberId: string) {
    const member = await this.prisma.member.findFirst({
      where: { id: memberId, organizationId },
      include: memberInclude,
    });
    if (!member) throw new NotFoundException('Employee not found');
    return member;
  }

  // Users holding only EMPLOYEES permissions through a custom role cannot touch org admins.
  private assertCanManage(access: OrganizationAccess, member: { role: string }) {
    if (!access.isOrgAdmin && ORG_ADMIN_ROLES.includes(member.role)) {
      throw new ForbiddenException('Only organization admins can manage admins');
    }
  }

  private async assertRoleInOrganization(organizationId: string, roleId: string) {
    const exists = await this.prisma.role.count({ where: { id: roleId, organizationId } });
    if (!exists) throw new BadRequestException('Role does not belong to this organization');
  }
}
