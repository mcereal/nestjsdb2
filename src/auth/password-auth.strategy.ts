import { Db2AuthStrategy } from "./db2-auth.strategy";
import { Db2AuthOptions } from "../interfaces/db2.interface";
import { Db2AuthenticationError } from "../errors";
import { Db2Client } from "../db/db2-client";
import { Db2ConnectionState } from "../enums/db2.enums";
import { Logger } from "@nestjs/common";

export class PasswordAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(PasswordAuthStrategy.name);
  private dbClient: Db2Client;

  constructor(config: Db2AuthOptions, dbClient: Db2Client) {
    super(config);
    this.dbClient = dbClient;
  }

  async authenticate(): Promise<void> {
    this.dbClient.setState(Db2ConnectionState.AUTHENTICATING);
    this.logger.log("Starting password authentication...");

    const { username, password } = this.config;

    if (!username || !password) {
      this.dbClient.setState(Db2ConnectionState.AUTH_FAILED);
      throw new Db2AuthenticationError("Username and password are required.");
    }

    try {
      const connectionString = this.dbClient.buildConnectionString(this.config);

      // Establish a connection using the connection string
      await this.dbClient.getConnectionFromPool(connectionString);

      this.dbClient.setState(Db2ConnectionState.CONNECTED);
      this.logger.log("Authentication successful using password strategy.");
    } catch (error) {
      this.dbClient.setState(Db2ConnectionState.AUTH_FAILED);
      this.logger.error("Password authentication failed:", error.message);
      throw new Db2AuthenticationError(
        "Authentication failed during password strategy"
      );
    }
  }
}
