import { Type } from 'class-transformer';
import { PaginationMetaDto } from '../common/pagination.dto.js';
import { IsDate, IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

// Better Auth organization roles an org admin may hand out. "owner" is only set when
// the platform admin creates the organization.
export const ASSIGNABLE_ORG_ROLES = ['admin', 'member'] as const;
export type AssignableOrgRole = (typeof ASSIGNABLE_ORG_ROLES)[number];

export class CreateMemberDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  // Temporary password the org admin hands to the employee.
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @IsOptional()
  @IsIn(ASSIGNABLE_ORG_ROLES)
  orgRole?: AssignableOrgRole;

  // Custom role (BREAD permissions) defined in this organization.
  @IsOptional()
  @IsString()
  roleId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  hiredAt?: Date;
}

export class UpdateMemberDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;

  @IsOptional()
  @IsIn(ASSIGNABLE_ORG_ROLES)
  orgRole?: AssignableOrgRole;

  // null removes the custom role.
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsString()
  roleId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  jobTitle?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  department?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  hiredAt?: Date;
}

// ---- Responses ----

export class MemberUserDto {
  id: string;
  name: string;
  email: string;
  phoneNumber: string | null;
  image: string | null;
}

export class MemberRoleDto {
  id: string;
  name: string;
}

export class MemberDto {
  id: string;
  organizationId: string;
  createdAt: Date;
  jobTitle: string | null;
  department: string | null;
  hiredAt: Date | null;
  user: MemberUserDto;
  // Better Auth organization role: "owner", "admin" or "member".
  orgRole: string;
  // Custom role holding the member's BREAD permissions.
  role: MemberRoleDto | null;
}

export class PaginatedMembersDto extends PaginationMetaDto {
  data: MemberDto[];
}
