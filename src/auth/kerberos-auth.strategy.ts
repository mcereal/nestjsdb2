// src/auth/kerberos-auth.strategy.ts

import { Inject, Logger } from '@nestjs/common';
import { Db2AuthStrategy } from './db2-auth.strategy';
import { Db2ConnectionState } from '../enums';
import { Db2AuthenticationError, Db2Error } from '../errors';
import {
  IDb2ConfigOptions,
  IConnectionManager,
  Db2KerberosAuthOptions,
} from '../interfaces';
import { Connection } from 'ibm_db';
import { I_CONNECTION_MANAGER } from '../constants/injection-token.constant';
import * as kerberos from 'kerberos';

export class KerberosAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(KerberosAuthStrategy.name);

  constructor(
    config: IDb2ConfigOptions,
    @Inject(I_CONNECTION_MANAGER) connectionManager: IConnectionManager,
  ) {
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
      this.logger.log('Already authenticated. Skipping...');
      return;
    }

    this.connectionManager.setState({
      connectionState: Db2ConnectionState.AUTHENTICATING,
    });
    this.logger.log('Starting Kerberos authentication...');

    try {
      // Initialize Kerberos client and acquire ticket
      await this.initializeKerberosClient();

      // Open the DB2 connection after acquiring the ticket
      const connection: Connection =
        await this.connectionManager.getConnection();
      await this.connectionManager.closeConnection(connection);

      this.connectionManager.setState({
        connectionState: Db2ConnectionState.CONNECTED,
      });
      this.logger.log('Authentication successful using Kerberos strategy.');
    } catch (error: any) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      this.logger.error('Kerberos authentication failed:', error.message);
      throw new Db2AuthenticationError(
        'Authentication failed during Kerberos strategy.',
      );
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
   * Initializes the Kerberos client and acquires a ticket.
   */
  private async initializeKerberosClient(): Promise<void> {
    const authOptions = this.config.auth as Db2KerberosAuthOptions;

    const { krbServiceName, username, krbKeytab } = authOptions;

    try {
      // Initialize Kerberos client
      const client = await kerberos.initializeClient(krbServiceName, {
        principal: username,
        keytab: krbKeytab,
        kdc: process.env.KRB_KDC, // Optional KDC host
      });
      this.logger.log('Kerberos client initialized successfully.');

      // Acquire Kerberos ticket
      await this.acquireKerberosTicket(client);
    } catch (error: any) {
      this.logger.error('Failed to initialize Kerberos client:', error.message);
      throw new Db2AuthenticationError(
        'Kerberos client initialization failed.',
      );
    }
  }

  /**
   * Acquires a Kerberos ticket using the initialized Kerberos client.
   */
  private async acquireKerberosTicket(client: kerberos.Client): Promise<void> {
    try {
      // Send an authentication request to obtain a ticket
      await new Promise((resolve, reject) => {
        client.step('', (error, response) => {
          if (error) {
            this.logger.error(
              'Failed to acquire Kerberos ticket:',
              error.message,
            );
            return reject(
              new Db2AuthenticationError('Failed to acquire Kerberos ticket.'),
            );
          }
          this.logger.log('Kerberos ticket acquired successfully.');
          resolve(response);
        });
      });
    } catch (error: any) {
      this.logger.error('Failed to acquire Kerberos ticket:', error.message);
      throw new Db2AuthenticationError('Failed to acquire Kerberos ticket.');
    }
  }
}
