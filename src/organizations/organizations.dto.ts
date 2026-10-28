import { Type } from 'class-transformer';
import { PaginationMetaDto } from '../common/pagination.dto.js';
import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class OwnerAccountDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phoneNumber?: string;
}

export class CreateOrganizationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string;

  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase letters, numbers and dashes' })
  @MaxLength(60)
  slug: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  // The organization admin (Better Auth role "owner") created together with the organization.
  @ValidateNested()
  @Type(() => OwnerAccountDto)
  owner: OwnerAccountDto;
}

export class UpdateOrganizationDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @IsOptional()
  @IsString()
  @Matches(SLUG_PATTERN, { message: 'slug must be lowercase letters, numbers and dashes' })
  @MaxLength(60)
  slug?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logo?: string;
}

// ---- Responses ----

export class OrganizationDto {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
  description: string | null;
  metadata: string | null;
  createdAt: Date;
}

export class OrganizationCountDto {
  members: number;
}

export class OrganizationListItemDto extends OrganizationDto {
  _count: OrganizationCountDto;
}

export class PaginatedOrganizationsDto extends PaginationMetaDto {
  data: OrganizationListItemDto[];
}

export class OrganizationOwnerUserDto {
  id: string;
  name: string;
  email: string;
}

export class CreatedOrganizationDto extends OrganizationDto {
  owner: OrganizationOwnerUserDto;
}

export class OrganizationOwnerMemberDto {
  // Member id of the owner inside this organization.
  id: string;
  user: OrganizationOwnerUserDto;
}

export class OrganizationDetailDto extends OrganizationListItemDto {
  owners: OrganizationOwnerMemberDto[];
}
