import { Db2AuthStrategy } from "./db2-auth.strategy";
import { Db2ConfigOptions } from "../interfaces";
import { Db2AuthenticationError, Db2Error } from "../errors";
import { Db2Client } from "../db";
import { Db2ConnectionState } from "../enums/db2.enums";
import { Logger } from "@nestjs/common";
import { verify, JwtPayload } from "jsonwebtoken"; // Import JwtPayload type
import { IConnectionManager } from "../interfaces/connection-mannager.interface";

export class JwtAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(JwtAuthStrategy.name);
  private dbClient: Db2Client;

  constructor(
    config: Db2ConfigOptions,
    dbClient: Db2Client,
    connectionManager: IConnectionManager
  ) {
    super(config, connectionManager); // Add the connectionManager argument
    this.dbClient = dbClient;
  }

  /**
   * Perform the JWT authentication process.
   * Verifies the JWT token and attempts to authenticate with the DB2 server.
   */
  async authenticate(): Promise<void> {
    this.dbClient.setState(Db2ConnectionState.AUTHENTICATING);
    this.logger.log("Starting JWT authentication...");

    const { jwtToken, jwtSecret } = this.config.auth as {
      jwtToken: string;
      jwtSecret: string;
    };

    if (!jwtToken || !jwtSecret) {
      this.dbClient.setState(Db2ConnectionState.AUTH_FAILED);
      throw new Db2Error(
        "JWT token and secret are required for authentication."
      );
    }

    try {
      // Verify the JWT token
      const decoded = this.verifyJwtToken(jwtToken, jwtSecret);
      this.logger.log("JWT token successfully verified:", decoded);

      // Proceed to open a connection after successful token verification
      await this.dbClient.openConnection();
      this.dbClient.setState(Db2ConnectionState.CONNECTED);
      this.logger.log("Authentication successful using JWT strategy.");
    } catch (error) {
      this.dbClient.setState(Db2ConnectionState.AUTH_FAILED);
      this.logger.error("JWT authentication failed:", error.message);
      throw new Db2AuthenticationError("JWT authentication failed.");
    }
  }

  /**
   * Verifies the provided JWT token using the secret.
   * @param token - The JWT token to verify.
   * @param secret - The secret or public key used to verify the token.
   * @returns The decoded JWT payload if successful.
   * @throws Db2AuthenticationError if the token is invalid or expired.
   */
  private verifyJwtToken(token: string, secret: string): JwtPayload {
    try {
      const decoded = verify(token, secret) as JwtPayload;
      return decoded;
    } catch (error) {
      this.logger.error("JWT verification failed:", error.message);
      throw new Db2AuthenticationError("Invalid or expired JWT token.");
    }
  }
}
