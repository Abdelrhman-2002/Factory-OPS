import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  // Case insensitive text filter.
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;
}

export class PaginationMetaDto {
  page: number;
  pageSize: number;
  total: number;
}

export function paginate(query: PaginationQueryDto) {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}

export function paginated<T>(data: T[], total: number, query: PaginationQueryDto) {
  return { data, page: query.page, pageSize: query.pageSize, total };
}
