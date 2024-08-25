// src/auth/password-auth.strategy.ts

import { Db2AuthStrategy } from "./db2-auth.strategy";
import { Db2AuthOptions } from "../interfaces/db2.interface";
import { Db2Error } from "../errors/db2.error";
import { Db2Client } from "../db/db2-client";
import { Db2ConnectionState } from "../enums/db2.enums"; // Import enum
import { Logger } from "@nestjs/common";
import { Connection } from "ibm_db";

export class PasswordAuthStrategy extends Db2AuthStrategy {
  private dbClient: Db2Client;
  private logger = new Logger(PasswordAuthStrategy.name);

  constructor(config: Db2AuthOptions, dbClient: Db2Client) {
    super(config);
    this.dbClient = dbClient; // Injecting the Db2Client instance
  }

  async authenticate(): Promise<void> {
    this.dbClient.setState(Db2ConnectionState.AUTHENTICATING); // Set state to AUTHENTICATING

    // Fetch configuration details from Db2Client
    const config = this.dbClient.getConfig();

    // Build a connection string using config
    const connStr = this.dbClient.buildConnectionString(config);

    let connection: Connection | null = null; // Declare connection variable

    try {
      // Attempt to connect using the DB2 client
      connection = await this.dbClient.getConnectionFromPool(connStr);
      this.dbClient.setState(Db2ConnectionState.CONNECTED); // Set state to CONNECTED on success

      this.logger.log("Authentication successful using password strategy.");
    } catch (error) {
      this.dbClient.setState(Db2ConnectionState.AUTH_FAILED); // Set state to AUTH_FAILED on failure
      this.logger.error("Authentication failed:", error.message);
      throw new Db2Error("Authentication failed during password strategy");
    } finally {
      // Release the connection back to the pool if it was established
      if (connection) {
        await this.dbClient.releaseConnection(connection);
      }
    }
  }
}
