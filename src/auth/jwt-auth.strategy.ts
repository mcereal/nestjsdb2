// src/auth/jwt-auth.strategy.ts

import { Db2AuthStrategy } from "./db2-auth.strategy";
import { Db2AuthOptions } from "../interfaces/db2.interface";
import { Db2AuthenticationError, Db2Error } from "../errors/";
import { Db2Client } from "../db/db2-client";
import { Db2ConnectionState } from "../enums";
import { Logger } from "@nestjs/common";
import { verify } from "jsonwebtoken";

export class JwtAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(JwtAuthStrategy.name);
  private dbClient: Db2Client;

  constructor(config: Db2AuthOptions, dbClient: Db2Client) {
    super(config);
    this.dbClient = dbClient;
  }

  async authenticate(): Promise<void> {
    this.dbClient.setState(Db2ConnectionState.AUTHENTICATING);

    const { jwtToken, jwtSecret } = this.config;

    if (!jwtToken || !jwtSecret) {
      throw new Db2Error(
        "JWT token and secret are required for authentication."
      );
    }

    try {
      const decoded = verify(jwtToken, jwtSecret);
      this.logger.log("JWT token successfully verified:", decoded);

      this.dbClient.setState(Db2ConnectionState.CONNECTED);
      this.logger.log("Authentication successful using JWT strategy.");
    } catch (error) {
      this.dbClient.setState(Db2ConnectionState.AUTH_FAILED);
      this.logger.error("JWT authentication failed:", error.message);
      throw new Db2AuthenticationError("JWT authentication failed.");
    }
  }
}
