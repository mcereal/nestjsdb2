// src/auth/kerberos-auth.strategy.ts

import { Db2AuthStrategy } from "./db2-auth.strategy";
import { Db2AuthOptions } from "../interfaces/db2.interface";
import { Db2Error } from "../errors/db2.error";
import { Db2Client } from "../db/db2-client";
import { Db2ConnectionState } from "../enums/db2.enums"; // Import enum
import { Logger } from "@nestjs/common";
import { Connection } from "ibm_db";

export class KerberosAuthStrategy extends Db2AuthStrategy {
  private dbClient: Db2Client;
  private logger = new Logger(KerberosAuthStrategy.name);

  constructor(config: Db2AuthOptions, dbClient: Db2Client) {
    super(config);
    this.dbClient = dbClient; // Injecting the Db2Client instance
  }

  async authenticate(): Promise<void> {
    this.dbClient.setState(Db2ConnectionState.AUTHENTICATING); // Set state to AUTHENTICATING

    // Check for necessary Kerberos configurations
    const { krbServiceName, krb5Config, krbKeytab } = this.config;
    if (!krbServiceName || !krb5Config || !krbKeytab) {
      throw new Db2Error(
        "Kerberos configuration is required for authentication."
      );
    }

    // Set Kerberos-related environment variables
    process.env.KRB5_CONFIG = krb5Config;
    process.env.KRB5_CLIENT_KTNAME = krbKeytab;

    // Build a connection string using config
    const connStr = this.buildKerberosConnectionString();

    let connection: Connection | null = null; // Declare connection variable

    try {
      // Attempt to connect using the DB2 client
      connection = await this.dbClient.getConnectionFromPool(connStr);
      this.dbClient.setState(Db2ConnectionState.CONNECTED); // Set state to CONNECTED on success

      this.logger.log("Authentication successful using Kerberos strategy.");
    } catch (error) {
      this.dbClient.setState(Db2ConnectionState.AUTH_FAILED); // Set state to AUTH_FAILED on failure
      this.logger.error("Kerberos authentication failed:", error.message);
      throw new Db2Error("Authentication failed during Kerberos strategy");
    } finally {
      // Release the connection back to the pool if it was established
      if (connection) {
        await this.dbClient.releaseConnection(connection);
      }
    }
  }

  /**
   * Builds a connection string specifically for Kerberos authentication.
   */
  private buildKerberosConnectionString(): string {
    const { host, port, database } = this.dbClient.getConfig(); // Assuming getConfig is available
    const { krbServiceName } = this.config;

    let connStr = `DATABASE=${database};HOSTNAME=${host};PORT=${port};SecurityMechanism=11;ServiceName=${krbServiceName};`;

    return connStr;
  }
}
