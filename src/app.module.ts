import { Module } from "@nestjs/common";
import { Db2Module } from "./modules"; // Adjust the path as per your directory structure
import * as dotenv from "dotenv";
import { Db2AuthType } from "./enums";

dotenv.config(); // Load environment variables from .env file

@Module({
  imports: [
    Db2Module.forRoot({
      auth: {
        authType: Db2AuthType.PASSWORD,
        username: process.env.DB2_UID,
        password: process.env.DB2_PWD,
      },
      host: process.env.DB2_HOSTNAME,
      port: Number(process.env.DB2_PORT),
      database: process.env.DB2_DATABASE,
      useTls: process.env.DB2_SSL_CONNECTION === "true",
    }),
  ],
})
export class AppModule {}
