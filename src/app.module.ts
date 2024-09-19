// src/app.module.ts

import { Module } from "@nestjs/common";
import { Db2Module } from "./modules/db2.module";
import * as dotenv from "dotenv";
import { Db2AuthType } from "./enums/db2.enums";
import { ConfigModule, ConfigService } from "@nestjs/config";
import db2Config from "./config/db2.config";
import { IDb2ConfigOptions } from "./interfaces";

dotenv.config();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [db2Config],
    }),
    Db2Module.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (
        configService: ConfigService
      ): Promise<IDb2ConfigOptions> => ({
        auth: {
          authType:
            configService.get<Db2AuthType>("db2.auth.authType") ||
            Db2AuthType.PASSWORD,
          username:
            configService.get<string>("db2.auth.username") ||
            process.env.DB2_UID,
          password:
            configService.get<string>("db2.auth.password") ||
            process.env.DB2_PWD,
        },
        host: configService.get<string>("db2.host") || process.env.DB2_HOSTNAME,
        port:
          configService.get<number>("db2.port") || Number(process.env.DB2_PORT),
        database:
          configService.get<string>("db2.database") || process.env.DB2_DATABASE,
        useTls:
          configService.get<boolean>("db2.useTls") ||
          process.env.DB2_SSL_CONNECTION === "true",
        cache: {
          store:
            configService.get<"memory" | "redis">("db2.cache.store") ||
            "memory",
          enabled: configService.get<boolean>("db2.cache.enabled") || false,
        },
        // Include other configuration options as needed
      }),
      inject: [ConfigService],
    }),
  ],
})
export class AppModule {}
