import { Module } from '@nestjs/common';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';

@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class DatabaseModule {}
