// src/modules/db2-config.module.ts

import { Module, DynamicModule, Global } from '@nestjs/common';
import { I_DB2_CONFIG } from '../constants/injection-token.constant';
import { IDb2ConfigOptions } from '../interfaces';

@Global()
@Module({})
export class Db2ConfigModule {
  static forRoot(options: IDb2ConfigOptions): DynamicModule {
    return {
      module: Db2ConfigModule,
      providers: [
        {
          provide: I_DB2_CONFIG,
          useValue: options,
        },
      ],
      exports: [I_DB2_CONFIG],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<IDb2ConfigOptions> | IDb2ConfigOptions;
    inject?: any[];
  }): DynamicModule {
    return {
      module: Db2ConfigModule,
      providers: [
        {
          provide: I_DB2_CONFIG,
          useFactory: options.useFactory,
          inject: options.inject || [],
        },
      ],
      exports: [I_DB2_CONFIG],
    };
  }
}
