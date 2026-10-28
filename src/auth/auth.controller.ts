import { All, Controller, Get, Inject, Req, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiExcludeController, ApiOkResponse, ApiTags, ApiUnauthorizedResponse } from '@nestjs/swagger';
import { toNodeHandler } from 'better-auth/node';
import type { Request, Response } from 'express';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { SESSION_SECURITY } from '../swagger.js';
import { AUTH, type Auth, type AuthSession } from './auth.js';
import { isPlatformAdmin, ORG_ADMIN_ROLES } from './auth.types.js';
import { permissionName } from './access.service.js';
import { CurrentSession, Public } from './decorators.js';
import { MeDto } from './me.dto.js';

// Hands every /api/auth/* request (sign-in/email, sign-out, get-session, ...) to Better Auth.
// Served through a Nest route rather than app.use so the Arcjet middleware covers it.
// main.ts skips the JSON body parser for this path because Better Auth reads the raw body.
// Its routes are documented from Better Auth's own OpenAPI schema (src/swagger.ts).
@ApiExcludeController()
@Public()
@Controller('api/auth')
export class AuthController {
  private readonly handler: ReturnType<typeof toNodeHandler>;

  constructor(@Inject(AUTH) auth: Auth) {
    this.handler = toNodeHandler(auth);
  }

  @All('*path')
  handle(@Req() req: Request, @Res() res: Response) {
    return this.handler(req, res);
  }
}

@ApiTags('Me')
@ApiCookieAuth(SESSION_SECURITY)
@Controller('me')
export class MeController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * The signed in user plus each organization they belong to and what they may do there.
   */
  @Get()
  @ApiOkResponse({ type: MeDto })
  @ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Not signed in' })
  async me(@CurrentSession() { user }: AuthSession): Promise<MeDto> {
    const memberships = await this.prisma.member.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'asc' },
      include: {
        organization: { select: { id: true, name: true, slug: true, logo: true } },
        customRole: {
          include: { permissions: { include: { permission: true } } },
        },
      },
    });

    return {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image ?? null,
        phoneNumber: user.phoneNumber ?? null,
      },
      isPlatformAdmin: isPlatformAdmin(user),
      memberships: memberships.map((m) => ({
        memberId: m.id,
        organization: m.organization,
        orgRole: m.role,
        isOrgAdmin: ORG_ADMIN_ROLES.includes(m.role),
        role: m.customRole ? { id: m.customRole.id, name: m.customRole.name } : null,
        permissions: m.customRole?.permissions.map(({ permission }) => permissionName(permission)) ?? [],
      })),
    };
  }
}
