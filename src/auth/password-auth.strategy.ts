// src/auth/password-auth.strategy.ts

import { AuthStrategy } from './auth.strategy';
import { Db2ConnectionState } from '../enums';
import {
  IConfigOptions,
  IConnectionManager,
  Db2PasswordAuthOptions,
} from '../interfaces';
import { Logger } from '../utils/logger';

export class PasswordAuthStrategy extends AuthStrategy {
  private readonly logger = new Logger(PasswordAuthStrategy.name);

  constructor(config: IConfigOptions, connectionManager: IConnectionManager) {
    super(config, connectionManager);
    if (!connectionManager) {
      throw new Error(
        'ConnectionManager is not defined in PasswordAuthStrategy',
      );
    }
  }

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

    this.logger.info('Starting authentication...');
  }

  public getConnectionString(): string {
    const { host, port, database } = this.config;
    const { username, password } = this.config.auth as Db2PasswordAuthOptions;
    return `DATABASE=${database};HOSTNAME=${host};PORT=${port};PROTOCOL=TCPIP;UID=${username};PWD=${password};`;
  }
}
