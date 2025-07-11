import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { CacheNode } from 'src/endpoint-microservice/graphql/graphql-schema-converter/graphql-schema.converter';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';

@Injectable()
export class CacheService {
  constructor(private readonly contextService: ContextService) {}

  public get(tableId: string) {
    const node = this.context.nodes[tableId];

    if (!node) {
      throw new InternalServerErrorException(
        `Table '${tableId}' not found in cache. Ensure all dependencies are processed before referencing.`,
      );
    }

    return node;
  }

  public add(tableId: string, value: CacheNode) {
    this.context.nodes[tableId] = value;
  }

  public getRoot(tableId: string) {
    const node = this.get(tableId);

    if (!node.nodeType) {
      throw new InternalServerErrorException(
        'No root found for the given table id.',
      );
    }

    return node.nodeType;
  }

  public getFlatRoot(tableId: string) {
    const node = this.get(tableId);

    if (!node.dataFlatRoot) {
      throw new InternalServerErrorException(
        'No flat root found for the given table id.',
      );
    }

    return node.dataFlatRoot;
  }

  private get context() {
    return this.contextService.context;
  }
}
