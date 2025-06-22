import { Injectable } from '@nestjs/common';
import { ContextService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/context.service';
import { ModelService } from 'src/endpoint-microservice/graphql/graphql-schema-converter/services/model.service';
import { CreatingTableOptionsType } from 'src/endpoint-microservice/graphql/graphql-schema-converter/types';
import { isRootForeignSchema } from 'src/endpoint-microservice/graphql/graphql-schema-converter/utils/isRootForeignSchema';

@Injectable()
export class CacheService {
  constructor(
    private readonly contextService: ContextService,
    private readonly modelService: ModelService,
  ) {}

  public build(options: CreatingTableOptionsType[]) {
    this.buildNotRootForeignKey(options);
    this.buildRootForeignKey(options);
  }

  public get(tableId: string) {
    return this.context.nodes[tableId];
  }

  private buildNotRootForeignKey(options: CreatingTableOptionsType[]) {
    for (const option of options) {
      const schema = option.table.schema;

      if (isRootForeignSchema(schema)) {
        continue;
      }

      this.buildNodeCache(option);
    }
  }

  private buildRootForeignKey(options: CreatingTableOptionsType[]) {
    for (const option of options) {
      const schema = option.table.schema;

      if (isRootForeignSchema(schema)) {
        this.buildNodeCache(option);
      }
    }
  }

  private buildNodeCache(option: CreatingTableOptionsType): void {
    const { node } = this.modelService.getNodeType(option);
    const dataFlat = this.modelService.getDataFlatType(option);

    this.context.nodes[option.table.id] = {
      node,
      dataFlat,
    };
  }

  private get context() {
    return this.contextService.context;
  }
}
