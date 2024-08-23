import { Module, DynamicModule, Provider } from "@nestjs/common";
import { Db2Service } from "./src/services/db2.service";
import { Db2ConfigOptions } from "./src/interfaces/db2.interface";

@Module({})
export class Db2Module {
  static forRoot(options: Db2ConfigOptions): DynamicModule {
    const db2ServiceProvider: Provider = {
      provide: Db2Service,
      useFactory: () => new Db2Service(options),
    };

    return {
      module: Db2Module,
      providers: [db2ServiceProvider],
      exports: [Db2Service],
    };
  }

  static forRootAsync(options: {
    useFactory: (
      ...args: any[]
    ) => Promise<Db2ConfigOptions> | Db2ConfigOptions;
    inject?: any[];
  }): DynamicModule {
    const db2ServiceProvider: Provider = {
      provide: Db2Service,
      useFactory: async (...args: any[]) => {
        const db2Config = await options.useFactory(...args);
        return new Db2Service(db2Config);
      },
      inject: options.inject || [],
    };

    return {
      module: Db2Module,
      providers: [db2ServiceProvider],
      exports: [Db2Service],
    };
  }

  static forFeature(): DynamicModule {
    return {
      module: Db2Module,
      providers: [Db2Service],
      exports: [Db2Service],
    };
  }
}
