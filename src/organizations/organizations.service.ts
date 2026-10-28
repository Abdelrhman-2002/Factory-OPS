import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuditService } from '../audit/audit.service.js';
import { AccountsService } from '../auth/accounts.service.js';
import { paginate, paginated, type PaginationQueryDto } from '../common/pagination.dto.js';
import type { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import type { CreateOrganizationDto, UpdateOrganizationDto } from './organizations.dto.js';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accounts: AccountsService,
    private readonly audit: AuditService,
  ) {}

  // Creates the organization and its owner account in one transaction.
  async create(dto: CreateOrganizationDto, actorId: string) {
    await this.assertSlugFree(dto.slug);

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          id: randomUUID(),
          name: dto.name,
          slug: dto.slug,
          description: dto.description,
        },
      });

      const owner = await this.accounts.createCredentialUser(tx, dto.owner);
      await tx.member.create({
        data: {
          id: randomUUID(),
          organizationId: organization.id,
          userId: owner.id,
          role: 'owner',
        },
      });

      await this.audit.log(tx, {
        organizationId: organization.id,
        authorId: actorId,
        action: 'CREATE',
        entityType: 'Organization',
        entityId: organization.id,
        changeDescription: `Created organization "${organization.name}" with owner ${owner.email}`,
      });

      return { ...organization, owner: { id: owner.id, name: owner.name, email: owner.email } };
    });
  }

  async findAll(query: PaginationQueryDto) {
    const where: Prisma.OrganizationWhereInput = query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: 'insensitive' } },
            { slug: { contains: query.search, mode: 'insensitive' } },
          ],
        }
      : {};

    const [data, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { members: true } } },
        ...paginate(query),
      }),
      this.prisma.organization.count({ where }),
    ]);
    return paginated(data, total, query);
  }

  async findOne(id: string) {
    const organization = await this.prisma.organization.findUnique({
      where: { id },
      include: {
        _count: { select: { members: true } },
        members: {
          where: { role: 'owner' },
          select: { id: true, user: { select: { id: true, name: true, email: true } } },
        },
      },
    });
    if (!organization) throw new NotFoundException('Organization not found');

    const { members, ...rest } = organization;
    return { ...rest, owners: members };
  }

  async update(id: string, dto: UpdateOrganizationDto, actorId: string) {
    const before = await this.findOne(id);
    if (dto.slug && dto.slug !== before.slug) await this.assertSlugFree(dto.slug);

    return this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.update({ where: { id }, data: dto });
      await this.audit.log(tx, {
        organizationId: id,
        authorId: actorId,
        action: 'UPDATE',
        entityType: 'Organization',
        entityId: id,
        changeDescription: `Updated organization "${organization.name}"`,
        before: { name: before.name, slug: before.slug, description: before.description, logo: before.logo },
        after: JSON.parse(JSON.stringify(dto)),
      });
      return organization;
    });
  }

  // Deletes the organization and, through cascades, all of its data. Logins that
  // belonged only to this organization are deleted too (closed signup).
  async remove(id: string, actorId: string) {
    const organization = await this.findOne(id);
    await this.prisma.$transaction(async (tx) => {
      const members = await tx.member.findMany({ where: { organizationId: id }, select: { userId: true } });
      await tx.organization.delete({ where: { id } });
      await tx.user.deleteMany({
        where: {
          id: { in: members.map((m) => m.userId) },
          members: { none: {} },
          role: { not: 'admin' },
        },
      });
      await this.audit.log(tx, {
        organizationId: null,
        authorId: actorId,
        action: 'DELETE',
        entityType: 'Organization',
        entityId: id,
        changeDescription: `Deleted organization "${organization.name}" (${organization.slug})`,
      });
    });
  }

  private async assertSlugFree(slug: string) {
    const taken = await this.prisma.organization.count({ where: { slug } });
    if (taken) throw new ConflictException('An organization with this slug already exists');
  }
}
