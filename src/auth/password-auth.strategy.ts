import { Logger } from "@nestjs/common";
import { Db2AuthStrategy } from "./db2-auth.strategy";
import {
  Db2PasswordAuthOptions,
  Db2ConfigOptions,
} from "../interfaces/db2.interface";
import { Db2ConnectionState } from "../enums";
import { Db2AuthenticationError } from "../errors";
import { IConnectionManager } from "../interfaces";

export class PasswordAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(PasswordAuthStrategy.name);

  constructor(config: Db2ConfigOptions, connectionManager: IConnectionManager) {
    super(config, connectionManager);
  }

  async authenticate(): Promise<void> {
    // Set the state to AUTHENTICATING
    this.connectionManager.setState(Db2ConnectionState.AUTHENTICATING);
    this.logger.log("Starting password authentication...");

    if (this.config.auth?.authType === "password") {
      const { username, password } = this.config.auth as Db2PasswordAuthOptions;

      if (!username || !password) {
        this.connectionManager.setState(Db2ConnectionState.AUTH_FAILED);
        throw new Db2AuthenticationError("Username and password are required.");
      }

      try {
        // Build connection string and establish connection
        const connectionString = this.connectionManager.buildConnectionString(
          this.config
        );
        await this.connectionManager.getConnectionFromPool(connectionString);

        this.connectionManager.setState(Db2ConnectionState.CONNECTED);
        this.logger.log("Authentication successful using password strategy.");
      } catch (error) {
        this.connectionManager.setState(Db2ConnectionState.AUTH_FAILED);
        this.logger.error("Password authentication failed:", error.message);
        throw new Db2AuthenticationError(
          "Authentication failed during password strategy."
        );
      }
    } else {
      this.connectionManager.setState(Db2ConnectionState.AUTH_FAILED);
      throw new Db2AuthenticationError(
        "Invalid authentication type for password strategy."
      );
    }
  }
}
