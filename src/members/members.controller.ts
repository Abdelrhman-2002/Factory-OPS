import { Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { AuthSession } from '../auth/auth.js';
import type { OrganizationAccess } from '../auth/auth.types.js';
import { CurrentOrganizationAccess, CurrentSession, RequirePermission } from '../auth/decorators.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { PaginationQueryDto } from '../common/pagination.dto.js';
import { SESSION_SECURITY } from '../swagger.js';
import { CreateMemberDto, MemberDto, PaginatedMembersDto, UpdateMemberDto } from './members.dto.js';
import { MembersService } from './members.service.js';

// Employees of one organization. Org admins have every permission; other users
// need the matching EMPLOYEES permission on their custom role.
@ApiTags('Members (employees)')
@ApiCookieAuth(SESSION_SECURITY)
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Not signed in' })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Missing the required EMPLOYEES permission' })
@Controller('organizations/:organizationId/members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  /**
   * List the organization's employees. Requires `employees:browse`.
   */
  @Get()
  @RequirePermission('EMPLOYEES', 'BROWSE')
  @ApiOkResponse({ type: PaginatedMembersDto })
  findAll(@CurrentOrganizationAccess() access: OrganizationAccess, @Query() query: PaginationQueryDto) {
    return this.members.findAll(access, query);
  }

  /**
   * Get one employee. Requires `employees:read`.
   */
  @Get(':memberId')
  @RequirePermission('EMPLOYEES', 'READ')
  @ApiOkResponse({ type: MemberDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@CurrentOrganizationAccess() access: OrganizationAccess, @Param('memberId') memberId: string) {
    return this.members.findOne(access, memberId);
  }

  /**
   * Create an employee login and add it to the organization. Requires `employees:add`;
   * only organization admins can create admins.
   */
  @Post()
  @RequirePermission('EMPLOYEES', 'ADD')
  @ApiCreatedResponse({ type: MemberDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validation failed or role not in this organization' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Email already in use' })
  create(
    @CurrentOrganizationAccess() access: OrganizationAccess,
    @Body() dto: CreateMemberDto,
    @CurrentSession() { user }: AuthSession,
  ) {
    return this.members.create(access, dto, user.id);
  }

  /**
   * Update an employee's profile, org role or custom role. Requires `employees:edit`.
   */
  @Patch(':memberId')
  @RequirePermission('EMPLOYEES', 'EDIT')
  @ApiOkResponse({ type: MemberDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validation failed or role not in this organization' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  update(
    @CurrentOrganizationAccess() access: OrganizationAccess,
    @Param('memberId') memberId: string,
    @Body() dto: UpdateMemberDto,
    @CurrentSession() { user }: AuthSession,
  ) {
    return this.members.update(access, memberId, dto, user.id);
  }

  /**
   * Remove an employee. Their login is deleted when they belong to no other organization.
   * Requires `employees:delete`.
   */
  @Delete(':memberId')
  @RequirePermission('EMPLOYEES', 'DELETE')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Removed' })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'You cannot remove yourself' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  remove(
    @CurrentOrganizationAccess() access: OrganizationAccess,
    @Param('memberId') memberId: string,
    @CurrentSession() { user }: AuthSession,
  ) {
    return this.members.remove(access, memberId, user.id);
  }
}
