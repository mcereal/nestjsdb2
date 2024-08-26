// src/auth/ldap-auth.strategy.ts

import { Db2AuthStrategy } from "./db2-auth.strategy";
import { Db2AuthOptions } from "../interfaces/db2.interface";
import { Db2Error } from "../errors/db2.error";
import { Db2Client } from "../db/db2-client";
import { Db2ConnectionState } from "../enums/db2.enums";
import { Logger } from "@nestjs/common";

export class LdapAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(LdapAuthStrategy.name);
  private dbClient: Db2Client;

  constructor(config: Db2AuthOptions, dbClient: Db2Client) {
    super(config);
    this.dbClient = dbClient;
  }

  async authenticate(): Promise<void> {
    this.dbClient.setState(Db2ConnectionState.AUTHENTICATING);

    try {
      await this.dbClient.connect();
      this.dbClient.setState(Db2ConnectionState.CONNECTED);
      this.logger.log("Authentication successful using LDAP strategy.");
    } catch (error) {
      this.dbClient.setState(Db2ConnectionState.AUTH_FAILED);
      this.logger.error("LDAP authentication failed:", error.message);
      throw new Db2Error("Authentication failed during LDAP strategy");
    }
  }
}
