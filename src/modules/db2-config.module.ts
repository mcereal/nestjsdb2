// src/modules/db2-config.module.ts
import { Module, Global, DynamicModule, Provider } from "@nestjs/common";
import { IDb2ConfigOptions } from "../interfaces";
import { DB2_CONFIG } from "../constants/injection-token.constant";

@Global()
@Module({})
export class Db2ConfigModule {
  static forRoot(options: IDb2ConfigOptions): DynamicModule {
    const configProvider: Provider = {
      provide: DB2_CONFIG,
      useValue: options,
    };

    return {
      module: Db2ConfigModule,
      providers: [configProvider],
      exports: [configProvider],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<IDb2ConfigOptions> | IDb2ConfigOptions;
    inject?: any[];
  }): DynamicModule {
    const configProvider: Provider = {
      provide: DB2_CONFIG,
      useFactory: options.useFactory,
      inject: options.inject || [],
    };

    return {
      module: Db2ConfigModule,
      providers: [configProvider],
      exports: [configProvider],
    };
  }
}
