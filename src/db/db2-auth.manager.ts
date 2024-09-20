import {
  Db2AuthOptions,
  IDb2ConfigOptions,
  Db2JwtAuthOptions,
  Db2KerberosAuthOptions,
  Db2LdapAuthOptions,
  Db2PasswordAuthOptions,
  IAuthManager,
} from "../interfaces";
import { Db2AuthStrategy } from "../auth/db2-auth.strategy";
import { createAuthStrategy } from "../auth/auth-factory";
import { Logger } from "@nestjs/common";
import { IConnectionManager } from "../interfaces";
import { Db2ConnectionState } from "../enums"; // Importing Db2ConnectionState for state handling
import { Db2AuthenticationError } from "../errors";
import { Connection } from "ibm_db";

export class Db2AuthManager implements IAuthManager {
  private authStrategy: Db2AuthStrategy;
  private readonly logger = new Logger(Db2AuthManager.name);

  constructor(
    private config: IDb2ConfigOptions,
    private connectionManager: IConnectionManager // Use the connection manager to handle state
  ) {
    this.authStrategy = createAuthStrategy(this.config, this.connectionManager);
  }

  /**
   * Initialize the authentication manager.
   */
  public async init(): Promise<void> {
    this.logger.log("Initializing Authentication...");
    await this.authenticate(); // Call authenticate on initialization
  }

  /**
   * Perform authentication using the selected strategy and manage state.
   */
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
