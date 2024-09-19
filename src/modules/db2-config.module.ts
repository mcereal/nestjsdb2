// src/modules/db2-config.module.ts

import { Module, DynamicModule, Global } from "@nestjs/common";
import { DB2_CONFIG } from "../constants/injection-token.constant";
import { IDb2ConfigOptions } from "../interfaces";

@Global()
@Module({})
export class Db2ConfigModule {
  static forRoot(options: IDb2ConfigOptions): DynamicModule {
    return {
      module: Db2ConfigModule,
      providers: [
        {
          provide: DB2_CONFIG,
          useValue: options,
        },
      ],
      exports: [DB2_CONFIG],
    };
  }

  static forRootAsync(options: {
    imports?: any[];
    useFactory: (
      ...args: any[]
    ) => Promise<IDb2ConfigOptions> | IDb2ConfigOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: Db2ConfigModule,
      imports: options.imports || [],
      providers: [
        {
          provide: DB2_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
      exports: [DB2_CONFIG],
    };
  }
}
