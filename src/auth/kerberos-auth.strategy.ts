import { Db2AuthStrategy } from "./db2-auth.strategy";
import { Db2AuthenticationError } from "../errors";
import { Db2ConnectionState } from "../enums/db2.enums";
import { Logger } from "@nestjs/common";
import * as kerberos from "kerberos";
import {
  Db2KerberosAuthOptions,
  IConnectionManager,
  IDb2Client,
  IDb2ConfigOptions,
} from "../interfaces";

export class KerberosAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(KerberosAuthStrategy.name);

  constructor(
    config: IDb2ConfigOptions,
    connectionManager: IConnectionManager
  ) {
    super(config, connectionManager); // Add the connectionManager argument
  }

  /**
   * Perform the Kerberos authentication process.
   * Acquires a Kerberos ticket and attempts to authenticate with the DB2 server.
   */
  async authenticate(): Promise<void> {
    this.connectionManager.setState({
      connectionState: Db2ConnectionState.AUTHENTICATING,
    });
    this.logger.log("Starting Kerberos authentication...");

    const authOptions = this.config.auth;

    // Narrow down the type to Db2KerberosAuthOptions
    if (authOptions.authType !== "kerberos") {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      throw new Db2AuthenticationError(
        "Kerberos authentication was expected, but another authentication type was provided."
      );
    }

    const { krbServiceName, username } = authOptions as Db2KerberosAuthOptions;

    if (!krbServiceName || !username) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      throw new Db2AuthenticationError(
        "Kerberos service name and username are required for Kerberos authentication."
      );
    }

    try {
      // Initialize Kerberos client
      const kerberosClient = await this.getKerberosClient(
        username,
        krbServiceName
      );

      // Request a service ticket for the DB2 service
      await this.acquireKerberosTicket(kerberosClient);

      // Open the DB2 connection after acquiring the ticket
      await this.connectionManager.getConnection();
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.CONNECTED,
      });
      this.logger.log("Authentication successful using Kerberos strategy.");
    } catch (error) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      this.logger.error("Kerberos authentication failed:", error.message);
      throw new Db2AuthenticationError(
        "Authentication failed during Kerberos strategy."
      );
    }
  }

  /**
   * Initializes the Kerberos client with the provided username and service name.
   */
  private async getKerberosClient(
    username: string,
    serviceName: string
  ): Promise<kerberos.Client> {
    const authOptions = this.config.auth;

    // Ensure we are dealing with Kerberos authentication options
    if (authOptions.authType !== "kerberos") {
      throw new Db2AuthenticationError(
        "Expected Kerberos authentication options, but received a different auth type."
      );
    }

    try {
      const { krbKeytab } = authOptions as Db2KerberosAuthOptions;
      const client = await kerberos.initializeClient(serviceName, {
        principal: username,
        keytab: krbKeytab, // This is now safe because of the type narrowing
        kdc: process.env.KRB_KDC, // Optional KDC (Key Distribution Center) host from environment variables
      });
      this.logger.log("Kerberos client initialized successfully.");
      return client;
    } catch (error) {
      this.logger.error("Failed to initialize Kerberos client:", error.message);
      throw new Db2AuthenticationError(
        "Kerberos client initialization failed."
      );
    }
  }

  /**
   * Acquires a Kerberos ticket using the initialized Kerberos client.
   */
  private async acquireKerberosTicket(client: kerberos.Client): Promise<void> {
    try {
      // Send an authentication request to the KDC (Key Distribution Center) to obtain a ticket
      await new Promise((resolve, reject) => {
        client.step("", (error, response) => {
          if (error) {
            return reject(
              new Db2AuthenticationError("Failed to acquire Kerberos ticket.")
            );
          }
          this.logger.log("Kerberos ticket acquired successfully.");
          resolve(response);
        });
      });
    } catch (error) {
      this.logger.error("Failed to acquire Kerberos ticket:", error.message);
      throw new Db2AuthenticationError("Failed to acquire Kerberos ticket.");
    }
  }
}
