export class MeUserDto {
  id: string;
  name: string;
  email: string;
  image: string | null;
  phoneNumber: string | null;
}

export class MeOrganizationDto {
  id: string;
  name: string;
  slug: string;
  logo: string | null;
}

export class MeRoleDto {
  id: string;
  name: string;
}

export class MeMembershipDto {
  memberId: string;
  organization: MeOrganizationDto;
  // Better Auth organization role: "owner", "admin" or "member".
  orgRole: string;
  // True for owners and admins, who hold every permission in the organization.
  isOrgAdmin: boolean;
  role: MeRoleDto | null;
  // Permission names from the custom role, e.g. "inventory:edit".
  permissions: string[];
}

export class MeDto {
  user: MeUserDto;
  isPlatformAdmin: boolean;
  memberships: MeMembershipDto[];
}
