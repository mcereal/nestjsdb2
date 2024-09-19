// src/auth/password-auth.strategy.ts

import { Logger } from "@nestjs/common";
import { Db2AuthStrategy } from "./db2-auth.strategy";

import { Db2ConnectionState } from "../enums";
import { Db2AuthenticationError } from "../errors";
import {
  Db2PasswordAuthOptions,
  IDb2ConfigOptions,
  IConnectionManager,
} from "../interfaces";
import { Connection } from "ibm_db";

export class PasswordAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(PasswordAuthStrategy.name);

  constructor(
    config: IDb2ConfigOptions,
    connectionManager: IConnectionManager
  ) {
    super(config, connectionManager);
  }

  async authenticate(): Promise<void> {
    // Set the state to AUTHENTICATING
    this.connectionManager.setState({
      connectionState: Db2ConnectionState.AUTHENTICATING,
    });
    this.logger.log("Starting password authentication...");

    // Check if the authentication type is 'password'
    if (this.config.auth?.authType === "password") {
      const { username, password } = this.config.auth as Db2PasswordAuthOptions;

      // Validate presence of username and password
      if (!username || !password) {
        this.connectionManager.setState({
          connectionState: Db2ConnectionState.AUTH_FAILED,
        });
        this.logger.error(
          "Username and password are required for authentication."
        );
        throw new Db2AuthenticationError("Username and password are required.");
      }

      try {
        // Attempt to acquire a connection to verify credentials
        const connection: Connection =
          await this.connectionManager.getConnection();

        // If connection is successful, release it back to the pool
        await this.connectionManager.closeConnection(connection);

        // Update state to CONNECTED
        this.connectionManager.setState({
          connectionState: Db2ConnectionState.CONNECTED,
        });
        this.logger.log("Authentication successful using password strategy.");
      } catch (error) {
        // On failure, update state and throw authentication error
        this.connectionManager.setState({
          connectionState: Db2ConnectionState.AUTH_FAILED,
        });
        this.logger.error("Password authentication failed:", error.message);
        throw new Db2AuthenticationError(
          "Authentication failed during password strategy."
        );
      }
    } else {
      // If authentication type is not 'password', fail the authentication
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      this.logger.error("Invalid authentication type for password strategy.");
      throw new Db2AuthenticationError(
        "Invalid authentication type for password strategy."
      );
    }
  }
}
