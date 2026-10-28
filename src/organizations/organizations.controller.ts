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
import { CurrentSession, PlatformAdminOnly } from '../auth/decorators.js';
import { ErrorResponseDto } from '../common/error-response.dto.js';
import { PaginationQueryDto } from '../common/pagination.dto.js';
import { SESSION_SECURITY } from '../swagger.js';
import {
  CreatedOrganizationDto,
  CreateOrganizationDto,
  OrganizationDetailDto,
  OrganizationDto,
  PaginatedOrganizationsDto,
  UpdateOrganizationDto,
} from './organizations.dto.js';
import { OrganizationsService } from './organizations.service.js';

// Platform administrator dashboard: create and manage factories (tenants).
@ApiTags('Admin: Organizations')
@ApiCookieAuth(SESSION_SECURITY)
@ApiUnauthorizedResponse({ type: ErrorResponseDto, description: 'Not signed in' })
@ApiForbiddenResponse({ type: ErrorResponseDto, description: 'Platform administrators only' })
@PlatformAdminOnly()
@Controller('admin/organizations')
export class OrganizationsController {
  constructor(private readonly organizations: OrganizationsService) {}

  /**
   * List organizations, newest first.
   */
  @Get()
  @ApiOkResponse({ type: PaginatedOrganizationsDto })
  findAll(@Query() query: PaginationQueryDto) {
    return this.organizations.findAll(query);
  }

  /**
   * Get one organization with its member count and owners.
   */
  @Get(':organizationId')
  @ApiOkResponse({ type: OrganizationDetailDto })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  findOne(@Param('organizationId') id: string) {
    return this.organizations.findOne(id);
  }

  /**
   * Create an organization together with its owner (organization admin) login.
   */
  @Post()
  @ApiCreatedResponse({ type: CreatedOrganizationDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validation failed' })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Slug or owner email already in use' })
  create(@Body() dto: CreateOrganizationDto, @CurrentSession() { user }: AuthSession) {
    return this.organizations.create(dto, user.id);
  }

  /**
   * Update an organization's details.
   */
  @Patch(':organizationId')
  @ApiOkResponse({ type: OrganizationDto })
  @ApiBadRequestResponse({ type: ErrorResponseDto, description: 'Validation failed' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  @ApiConflictResponse({ type: ErrorResponseDto, description: 'Slug already in use' })
  update(
    @Param('organizationId') id: string,
    @Body() dto: UpdateOrganizationDto,
    @CurrentSession() { user }: AuthSession,
  ) {
    return this.organizations.update(id, dto, user.id);
  }

  /**
   * Delete an organization and all of its data. Logins that belonged only to it are deleted too.
   */
  @Delete(':organizationId')
  @HttpCode(204)
  @ApiNoContentResponse({ description: 'Deleted' })
  @ApiNotFoundResponse({ type: ErrorResponseDto })
  remove(@Param('organizationId') id: string, @CurrentSession() { user }: AuthSession) {
    return this.organizations.remove(id, user.id);
  }
}
