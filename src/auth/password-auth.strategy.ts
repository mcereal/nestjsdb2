// src/auth/password-auth.strategy.ts

import { Inject, Logger } from "@nestjs/common";
import { Db2AuthStrategy } from "./db2-auth.strategy";

import { Db2ConnectionState } from "../enums";
import { Db2AuthenticationError } from "../errors";
import {
  Db2PasswordAuthOptions,
  IDb2ConfigOptions,
  IConnectionManager,
} from "../interfaces";
import { Connection } from "ibm_db";
import { I_CONNECTION_MANAGER } from "src/constants/injection-token.constant";

export class PasswordAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(PasswordAuthStrategy.name);

  constructor(
    config: IDb2ConfigOptions,
    @Inject(I_CONNECTION_MANAGER) connectionManager: IConnectionManager
  ) {
    super(config, connectionManager);
    if (!connectionManager) {
      throw new Error(
        "ConnectionManager is not defined in PasswordAuthStrategy"
      );
    }
  }

  async authenticate(): Promise<void> {
    if (
      this.connectionManager.getState().connectionState ===
      Db2ConnectionState.CONNECTED
    ) {
      this.logger.log("Already authenticated. Skipping...");
      return;
    }
    this.connectionManager.setState({
      connectionState: Db2ConnectionState.AUTHENTICATING,
    });

    this.logger.log("Starting authentication...");

    if (!this.connectionManager.getState().poolInitialized) {
      this.logger.error("Connection pool is not ready for authentication.");
      throw new Error("Connection pool is not ready for authentication.");
    }

    try {
      const connection: Connection =
        await this.connectionManager.getConnection();
      await this.connectionManager.closeConnection(connection);

      this.connectionManager.setState({
        connectionState: Db2ConnectionState.CONNECTED,
      });
      this.logger.log("Authentication successful.");
    } catch (error) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      this.logger.error("Authentication failed:", error.message);
      throw new Db2AuthenticationError("Authentication failed.");
    }
  }
}
