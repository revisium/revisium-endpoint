import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from 'src/endpoint-microservice/database/prisma.service';
import { EndpointChangeEvent } from '../types';

@Injectable()
export class InitialSyncService {
  private readonly logger = new Logger(InitialSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  public async performInitialSync(
    changeHandler: (event: EndpointChangeEvent) => Promise<void>,
  ): Promise<void> {
    const batchSize = this.configService.get('SYNC_INITIAL_BATCH_SIZE', 100);

    this.logger.log('Starting initial endpoint synchronization');

    try {
      let offset = 0;
      let totalProcessed = 0;

      while (true) {
        const endpoints = await this.prisma.endpoint.findMany({
          where: {
            isDeleted: false,
          },
          orderBy: {
            createdAt: 'asc',
          },
          skip: offset,
          take: batchSize,
        });

        if (endpoints.length === 0) {
          break;
        }

        this.logger.log(
          `Processing batch ${Math.floor(offset / batchSize) + 1}: ${endpoints.length} endpoints`,
        );

        // Process endpoints in parallel within the batch
        await Promise.allSettled(
          endpoints.map(async (endpoint) => {
            const event: EndpointChangeEvent = {
              type: 'created',
              endpointId: endpoint.id,
            };

            try {
              await changeHandler(event);
            } catch (error) {
              this.logger.error(
                `Failed to sync endpoint ${endpoint.id}: ${error instanceof Error ? error.message : String(error)}`,
                error instanceof Error ? error.stack : error,
              );
            }
          }),
        );

        totalProcessed += endpoints.length;
        offset += batchSize;
      }

      this.logger.log(
        `Initial synchronization completed. Processed ${totalProcessed} endpoints.`,
      );
    } catch (error) {
      this.logger.error(
        `Initial synchronization failed: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : error,
      );
      throw error;
    }
  }
}
