// src/auth/ldap-auth.strategy.ts

import { Inject, Logger } from '@nestjs/common';
import { Db2AuthStrategy } from './db2-auth.strategy';
import { Db2ConnectionState } from '../enums';
import { Db2AuthenticationError, Db2Error } from '../errors';
import {
  IDb2ConfigOptions,
  IConnectionManager,
  Db2LdapAuthOptions,
} from '../interfaces';
import { Connection } from 'ibm_db';
import { I_CONNECTION_MANAGER } from '../constants/injection-token.constant';
import * as ldap from 'ldapjs';

export class LdapAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(LdapAuthStrategy.name);

  constructor(
    config: IDb2ConfigOptions,
    @Inject(I_CONNECTION_MANAGER) connectionManager: IConnectionManager,
  ) {
    super(config, connectionManager);
    if (!connectionManager) {
      throw new Error('ConnectionManager is not defined in LdapAuthStrategy');
    }
  }

  /**
   * Perform the LDAP authentication process.
   * Binds to an LDAP server and attempts to authenticate with the DB2 server.
   */
  async authenticate(): Promise<void> {
    if (
      this.connectionManager.getState().connectionState ===
      Db2ConnectionState.CONNECTED
    ) {
      this.logger.log('Already authenticated. Skipping...');
      return;
    }

    this.connectionManager.setState({
      connectionState: Db2ConnectionState.AUTHENTICATING,
    });
    this.logger.log('Starting LDAP authentication...');

    try {
      // Perform LDAP bind (authentication)
      await this.ldapBind();

      // Open the DB2 connection after successful LDAP authentication
      const connection: Connection =
        await this.connectionManager.getConnection();
      await this.connectionManager.closeConnection(connection);

      this.connectionManager.setState({
        connectionState: Db2ConnectionState.CONNECTED,
      });
      this.logger.log('LDAP authentication successful.');
    } catch (error: any) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      this.logger.error('LDAP authentication failed:', error.message);
      throw new Db2AuthenticationError('LDAP authentication failed.');
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
   * Performs LDAP bind (authentication) using the provided username and password.
   */
  private async ldapBind(): Promise<void> {
    const authOptions = this.config.auth as Db2LdapAuthOptions;
    const { username, password, ldapUrl } = authOptions;

    if (!ldapUrl) {
      throw new Db2AuthenticationError(
        'LDAP URL is required for authentication.',
      );
    }

    return new Promise<void>((resolve, reject) => {
      const client = ldap.createClient({ url: ldapUrl });

      client.bind(username, password, (err) => {
        if (err) {
          this.logger.error('Failed to bind to LDAP server:', err.message);
          return reject(new Db2AuthenticationError('LDAP bind failed.'));
        }

        this.logger.log('LDAP bind successful.');
        client.unbind(); // Unbind after successful authentication
        resolve();
      });
    });
  }
}
