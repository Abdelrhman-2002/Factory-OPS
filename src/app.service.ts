import { Injectable } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service.js';

@Injectable()
export class AppService {
  constructor(private readonly prisma: PrismaService) {}

  getHello(): string {
    return 'Hello World!';
  }

  // Round-trips through Postgres to prove the Prisma connection works.
  async checkDatabase() {
    const record = await this.prisma.healthCheck.create({
      data: { message: 'ok' },
    });
    const count = await this.prisma.healthCheck.count();
    return { connected: true, lastRecord: record, totalRecords: count };
  }
}
