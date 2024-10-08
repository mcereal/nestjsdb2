// src/auth/ldap-auth.strategy.ts

import { AuthStrategy } from './auth.strategy';
import { Db2ConnectionState } from '../enums';
import { Db2AuthenticationError, Db2Error } from '../errors';
import { Logger } from '../utils/logger';
import {
  IConfigOptions,
  IConnectionManager,
  Db2LdapAuthOptions,
} from '../interfaces';
import { LdapClient, LdapConfig } from './ldap.client';

export class LdapAuthStrategy extends AuthStrategy {
  private readonly logger = new Logger(LdapAuthStrategy.name);
  private ldapClient: LdapClient | null = null;

  constructor(config: IConfigOptions, connectionManager: IConnectionManager) {
    super(config, connectionManager);
    if (!connectionManager) {
      throw new Error('ConnectionManager is not defined in LdapAuthStrategy');
    }
  }

  /**
   * Perform the LDAP authentication process.
   * Connects to an LDAP server and attempts to authenticate with the DB2 server.
   */
  async authenticate(): Promise<void> {
    if (
      this.connectionManager.getState().connectionState ===
      Db2ConnectionState.CONNECTED
    ) {
      this.logger.info('Already authenticated. Skipping...');
      return;
    }

    this.connectionManager.setState({
      connectionState: Db2ConnectionState.AUTHENTICATING,
    });
    this.logger.info('Starting LDAP authentication...');

    const authOptions = this.config.auth as Db2LdapAuthOptions;
    const { username, password, ldapUrl } = authOptions;

    if (!username || !password || !ldapUrl) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      this.logger.error('LDAP username, password, and URL are required.');
      throw new Db2AuthenticationError('LDAP credentials are incomplete.');
    }

    // Configure TLS options if needed (e.g., custom CA)
    const tlsOptions = authOptions.tlsOptions
      ? {
          rejectUnauthorized: authOptions.tlsOptions.rejectUnauthorized ?? true,
          ca: authOptions.tlsOptions.ca,
          key: authOptions.tlsOptions.key,
          cert: authOptions.tlsOptions.cert,
        }
      : undefined;

    const ldapConfig: LdapConfig = {
      ldapUrl,
      username,
      password,
      tlsOptions,
    };

    this.ldapClient = new LdapClient(ldapConfig);

    try {
      await this.ldapClient.connect();
      await this.ldapClient.bind();
      this.logger.info('LDAP authentication successful.');
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.CONNECTED,
      });
    } catch (error: any) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      this.logger.error('LDAP authentication failed:', error.message);
      throw new Db2AuthenticationError('LDAP authentication failed.');
    } finally {
      this.cleanup();
    }
  }

  /**
   * Generates the DB2 connection string using LDAP authentication.
   */
  public getConnectionString(): string {
    const { host, port, database } = this.config;
    const authOptions = this.config.auth as Db2LdapAuthOptions;

    if (authOptions.authType !== 'ldap') {
      throw new Db2Error(
        'Expected LDAP authentication options, but received a different auth type.',
      );
    }

    const { username, password } = authOptions;

    if (!username || !password) {
      throw new Db2Error('LDAP username and password are required.');
    }

    // The connection string may include LDAP-specific parameters
    return `DATABASE=${database};HOSTNAME=${host};PORT=${port};PROTOCOL=TCPIP;UID=${username};PWD=${password};Authentication=SERVER_ENCRYPT;`;
  }

  /**
   * Cleanup LDAP client connection.
   */
  private cleanup(): void {
    if (this.ldapClient) {
      this.ldapClient.close();
      this.ldapClient = null;
    }
  }
}
