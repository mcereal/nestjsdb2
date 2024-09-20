import { Db2AuthStrategy } from './db2-auth.strategy';
import {
  IDb2ConfigOptions,
  IConnectionManager,
  Db2LdapAuthOptions,
} from '../interfaces';
import { Db2AuthenticationError } from '../errors';
import { Db2ConnectionState } from '../enums';
import { Logger } from '@nestjs/common';
import * as ldap from 'ldapjs'; // Import ldapjs for LDAP authentication

export class LdapAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(LdapAuthStrategy.name);

  constructor(
    config: IDb2ConfigOptions,
    connectionManager: IConnectionManager,
  ) {
    super(config, connectionManager); // Add the connectionManager argument
  }

  /**
   * Perform the LDAP authentication process.
   * Binds to an LDAP server and attempts to authenticate with the DB2 server.
   */
  async authenticate(): Promise<void> {
    this.connectionManager.setState({
      connectionState: Db2ConnectionState.AUTHENTICATING,
    });
    this.logger.log('Starting LDAP authentication...');

    // Ensure the authType is 'ldap' and cast config.auth to Db2LdapAuthOptions
    if (this.config.auth?.authType === 'ldap') {
      const { username, password } = this.config.auth as Db2LdapAuthOptions;

      if (!username || !password) {
        this.connectionManager.setState({
          connectionState: Db2ConnectionState.AUTH_FAILED,
        });
        throw new Db2AuthenticationError(
          'LDAP username and password are required.',
        );
      }

      try {
        // Perform LDAP bind (authentication)
        await this.ldapBind(username, password);
        this.connectionManager.setState({
          connectionState: Db2ConnectionState.CONNECTED,
        });
        this.logger.log('LDAP authentication successful.');
      } catch (error) {
        this.connectionManager.setState({
          connectionState: Db2ConnectionState.AUTH_FAILED,
        });
        this.logger.error('LDAP authentication failed:', error.message);
        throw new Db2AuthenticationError('LDAP authentication failed.');
      }
    } else {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      throw new Db2AuthenticationError(
        'Invalid authentication type for LDAP strategy.',
      );
    }
  }
  /**
   * Performs LDAP bind (authentication) using the provided username and password.
   * @param username - The LDAP username (Distinguished Name or User Principal Name).
   * @param password - The LDAP password.
   */
  private async ldapBind(username: string, password: string): Promise<void> {
    const ldapAuthConfig = this.config.auth as Db2LdapAuthOptions;
    const ldapUrl = process.env.LDAP_URL || ldapAuthConfig.ldapUrl;

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
