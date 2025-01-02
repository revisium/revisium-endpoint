import { Injectable } from '@nestjs/common';
import { PrismaHealthIndicator } from '@nestjs/terminus';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';

@Injectable()
export class DatabaseCheck {
  constructor(
    private readonly prismaHealth: PrismaHealthIndicator,
    private readonly prismaService: PrismaService,
  ) {}

  public check() {
    return this.prismaHealth.pingCheck('database', this.prismaService);
  }
}
