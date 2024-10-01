// src/auth/kerberos-auth.strategy.ts

import { AuthStrategy } from './auth.strategy';
import { Db2ConnectionState } from '../enums';
import { Db2AuthenticationError, Db2Error } from '../errors';
import { Logger } from '../utils';
import {
  IConfigOptions,
  IConnectionManager,
  Db2KerberosAuthOptions,
} from '../interfaces';
import { KerberosClient } from './kerberos.client';

export class KerberosAuthStrategy extends AuthStrategy {
  private readonly logger = new Logger(KerberosAuthStrategy.name);
  private kerberosClient: KerberosClient | null = null;

  constructor(config: IConfigOptions, connectionManager: IConnectionManager) {
    super(config, connectionManager);
    if (!connectionManager) {
      throw new Error(
        'ConnectionManager is not defined in KerberosAuthStrategy',
      );
    }
  }

  /**
   * Perform the Kerberos authentication process.
   * Acquires a Kerberos ticket and attempts to authenticate with the DB2 server.
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
    this.logger.info('Starting Kerberos authentication...');

    const authOptions = this.config.auth as Db2KerberosAuthOptions;
    const { krbServiceName, username, krbKeytab, krbKdc, password } =
      authOptions;

    if (!krbServiceName || !username) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      this.logger.error(
        'Kerberos service name and username are required for Kerberos authentication.',
      );
      throw new Db2Error(
        'Kerberos service name and username are required for Kerberos authentication.',
      );
    }

    this.kerberosClient = new KerberosClient(authOptions);

    try {
      await this.kerberosClient.initializeClient();
      await this.kerberosClient.acquireKerberosTicket();
      this.logger.info('Authentication successful using Kerberos strategy.');
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.CONNECTED,
      });
    } catch (error: any) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      this.logger.error('Kerberos authentication failed:', error.message);
      throw new Db2AuthenticationError(
        'Authentication failed during Kerberos strategy.',
      );
    } finally {
      this.cleanup();
    }
  }

  /**
   * Generates the DB2 connection string using Kerberos authentication.
   */
  public getConnectionString(): string {
    const { host, port, database } = this.config;
    const authOptions = this.config.auth as Db2KerberosAuthOptions;

    if (authOptions.authType !== 'kerberos') {
      throw new Db2Error(
        'Expected Kerberos authentication options, but received a different auth type.',
      );
    }

    const { krbServiceName, username } = authOptions;

    if (!krbServiceName || !username) {
      throw new Db2Error(
        'Kerberos service name and username are required for Kerberos authentication.',
      );
    }

    // Kerberos authentication typically uses an authentication token obtained externally.
    // The connection string for Kerberos might include the authentication type.
    return `DATABASE=${database};HOSTNAME=${host};PORT=${port};PROTOCOL=TCPIP;UID=${username};Authentication=KERBEROS;`;
  }

  /**
   * Cleanup Kerberos client resources.
   */
  private cleanup(): void {
    if (this.kerberosClient) {
      // If the KerberosClient needs any cleanup, implement it here.
      // Currently, no cleanup is needed.
      this.kerberosClient = null;
    }
  }
}
