// src/app.module.ts

import { Module } from "@nestjs/common";
import { Db2Module } from "./modules/db2.module"; // Adjust the path as per your directory structure
import * as dotenv from "dotenv";
import { Db2AuthType } from "./enums/db2.enums";
import { ConfigModule } from "@nestjs/config";
import db2Config from "./config/db2.config"; // Create a separate config file

dotenv.config();

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [db2Config],
    }),
    Db2Module.forRootAsync({
      useFactory: () => ({
        auth: {
          authType: Db2AuthType.PASSWORD,
          username: process.env.DB2_UID,
          password: process.env.DB2_PWD,
        },
        host: process.env.DB2_HOSTNAME,
        port: Number(process.env.DB2_PORT),
        database: process.env.DB2_DATABASE,
        useTls: process.env.DB2_SSL_CONNECTION === "true",
        cache: {
          store: "memory",
          enabled: false,
        },
      }),
    }),
  ],
})
export class AppModule {}
