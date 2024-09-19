import {
  Db2AuthOptions,
  IDb2ConfigOptions,
  Db2JwtAuthOptions,
  Db2KerberosAuthOptions,
  Db2LdapAuthOptions,
  Db2PasswordAuthOptions,
} from "../interfaces";
import { Db2AuthStrategy } from "../auth/db2-auth.strategy";
import { createAuthStrategy } from "../auth/auth-factory";
import { Logger } from "@nestjs/common";
import { IConnectionManager } from "../interfaces";
import { Db2Client } from "./db2-client";

export class Db2AuthManager {
  private authStrategy: Db2AuthStrategy;
  private readonly logger = new Logger(Db2AuthManager.name);

  constructor(
    private config: IDb2ConfigOptions,
    private connectionManager: IConnectionManager,
    private dbClient: Db2Client
  ) {
    this.authStrategy = createAuthStrategy(
      this.config,
      this.connectionManager,
      this.dbClient
    );
  }
  /**
   * Perform authentication using the selected strategy.
   */
  public async authenticate(): Promise<void> {
    this.logger.log(
      `Db2AuthManager: Authenticating using ${this.config.auth?.authType} strategy...`
    );

    try {
      await this.authStrategy.authenticate();
      this.logger.log("Db2AuthManager: Authentication successful.");
    } catch (error) {
      this.logger.error("Db2AuthManager: Authentication failed.", error);
      throw error;
    }
  }

  /**
   * Build the connection string including authentication details.
   */
  public buildConnectionString(): string {
    const {
      host,
      port,
      database,
      characterEncoding,
      securityMechanism,
      currentSchema,
      applicationName,
      useTls,
      sslCertificatePath,
    } = this.config;

    const authConfig = this.config.auth;

    let connStr = `DATABASE=${database};HOSTNAME=${host};PORT=${port};`;

    connStr += this.buildAuthSection(authConfig); // Call to buildAuthSection

    // Optional configurations
    if (characterEncoding) {
      connStr += `CHARACTERENCODING=${characterEncoding};`;
    }

    if (securityMechanism) {
      connStr += `SECURITY=${securityMechanism};`;
    }

    if (currentSchema) {
      connStr += `CURRENTSCHEMA=${currentSchema};`;
    }

    if (applicationName) {
      connStr += `APPLICATIONNAME=${applicationName};`;
    }

    if (useTls) {
      connStr += "SECURITY=SSL;";
      if (sslCertificatePath) {
        connStr += `SSLServerCertificate=${sslCertificatePath};`;
      }
    }

    return connStr;
  }

  /**
   * Get the current authentication strategy.
   */
  public getAuthStrategy(): Db2AuthStrategy {
    return this.authStrategy; // Return the current strategy
  }

  // buildauthsection method
  // Add this method to the Db2AuthManager class
  /**
   * Build the authentication section of the connection string based on the auth type.
   */
  private buildAuthSection(authConfig: Db2AuthOptions): string {
    const { authType } = this.config.auth || {};

    switch (authType) {
      case "password": {
        const { username, password } = authConfig as Db2PasswordAuthOptions;
        return `UID=${username};PWD=${password};`;
      }
      case "kerberos": {
        const { username, krbServiceName, krb5Config, krbKeytab } =
          authConfig as Db2KerberosAuthOptions;
        let authStr = `UID=${username};SECURITY=KERBEROS;KRBPLUGINNAME=IBMkrb5;KRB_SERVICE_NAME=${krbServiceName};`;
        if (krb5Config) {
          authStr += `KRB5_CONFIG=${krb5Config};`;
        }
        if (krbKeytab) {
          authStr += `KRB_KEYTAB=${krbKeytab};`;
        }
        return authStr;
      }
      case "jwt": {
        const { jwtToken, jwtSecret } = authConfig as Db2JwtAuthOptions;
        return `TOKEN=${jwtToken};JWT_SECRET=${jwtSecret};`;
      }
      case "ldap": {
        const { username, password, ldapUrl } =
          authConfig as Db2LdapAuthOptions;
        return `UID=${username};PWD=${password};SECURITY=LDAP;LDAPURL=${ldapUrl};`;
      }
      default:
        throw new Error(`Unsupported authentication type: ${authType}`);
    }
  }
}
