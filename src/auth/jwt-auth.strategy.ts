// src/auth/jwt-auth.strategy.ts

import { Db2AuthStrategy } from "./db2-auth.strategy";
import { Db2AuthOptions } from "../interfaces/db2.interface";
import { Db2Error } from "../errors/db2.error";
import { Db2Client } from "../db/db2-client";
import { Db2ConnectionState } from "../enums/db2.enums";
import { Logger } from "@nestjs/common";
import { verify } from "jsonwebtoken";

export class JwtAuthStrategy extends Db2AuthStrategy {
  private dbClient: Db2Client;
  private logger = new Logger(JwtAuthStrategy.name);

  constructor(config: Db2AuthOptions, dbClient: Db2Client) {
    super(config);
    this.dbClient = dbClient; // Injecting the Db2Client instance
  }

  async authenticate(): Promise<void> {
    this.dbClient.setState(Db2ConnectionState.AUTHENTICATING); // Set state to AUTHENTICATING

    const { jwtToken, jwtSecret } = this.config;

    if (!jwtToken || !jwtSecret) {
      throw new Db2Error(
        "JWT token and secret are required for authentication."
      );
    }

    try {
      // Verify the JWT token
      const decoded = verify(jwtToken, jwtSecret);
      this.logger.log("JWT token successfully verified:", decoded);

      // Assuming some additional steps may be necessary to set up the DB2 connection
      this.dbClient.setState(Db2ConnectionState.CONNECTED); // Set state to CONNECTED on success
      this.logger.log("Authentication successful using JWT strategy.");
    } catch (error) {
      this.dbClient.setState(Db2ConnectionState.AUTH_FAILED); // Set state to AUTH_FAILED on failure
      this.logger.error("JWT authentication failed:", error.message);
      throw new Db2Error("JWT authentication failed.");
    }
  }
}
