// src/auth/password-auth.strategy.ts

import { Inject, Logger } from '@nestjs/common';
import { Db2AuthStrategy } from './db2-auth.strategy';
import { Db2ConnectionState } from '../enums';
import {
  IDb2ConfigOptions,
  IConnectionManager,
  Db2PasswordAuthOptions,
} from '../interfaces';
import { I_CONNECTION_MANAGER } from '../constants/injection-token.constant';

export class PasswordAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(PasswordAuthStrategy.name);

  constructor(
    config: IDb2ConfigOptions,
    @Inject(I_CONNECTION_MANAGER) connectionManager: IConnectionManager,
  ) {
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
      this.logger.log('Already authenticated. Skipping...');
      return;
    }

    this.connectionManager.setState({
      connectionState: Db2ConnectionState.AUTHENTICATING,
    });

    this.logger.log('Starting authentication...');
  }

  public getConnectionString(): string {
    const { host, port, database } = this.config;
    const { username, password } = this.config.auth as Db2PasswordAuthOptions;
    return `DATABASE=${database};HOSTNAME=${host};PORT=${port};PROTOCOL=TCPIP;UID=${username};PWD=${password};SECURITY=SSL`;
  }
}
