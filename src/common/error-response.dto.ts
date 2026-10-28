import { ApiProperty } from '@nestjs/swagger';

// Shape of every error Nest returns (HttpException + ValidationPipe).
export class ErrorResponseDto {
  statusCode: number;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    description: 'A message, or one message per failed field for validation errors',
  })
  message: string | string[];

  error?: string;
}
