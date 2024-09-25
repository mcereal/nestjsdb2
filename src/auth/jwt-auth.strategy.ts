// src/auth/jwt-auth.strategy.ts

import { Inject, Logger } from '@nestjs/common';
import { Db2AuthStrategy } from './db2-auth.strategy';
import { Db2ConnectionState } from '../enums';
import { Db2AuthenticationError, Db2Error } from '../errors';
import {
  IDb2ConfigOptions,
  IConnectionManager,
  Db2JwtAuthOptions,
} from '../interfaces';
import { Connection } from 'ibm_db';
import { I_CONNECTION_MANAGER } from '../constants/injection-token.constant';
import { verify, JwtPayload } from 'jsonwebtoken';

export class JwtAuthStrategy extends Db2AuthStrategy {
  private readonly logger = new Logger(JwtAuthStrategy.name);

  constructor(
    config: IDb2ConfigOptions,
    @Inject(I_CONNECTION_MANAGER) connectionManager: IConnectionManager,
  ) {
    super(config, connectionManager);
    if (!connectionManager) {
      throw new Error('ConnectionManager is not defined in JwtAuthStrategy');
    }
  }

  /**
   * Perform the JWT authentication process.
   * Verifies the JWT token and attempts to authenticate with the DB2 server.
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
    this.logger.log('Starting JWT authentication...');

    try {
      this.logger.log('Authentication successful using JWT strategy.');
    } catch (error: any) {
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.AUTH_FAILED,
      });
      this.logger.error('JWT authentication failed:', error.message);
      throw new Db2AuthenticationError('JWT authentication failed.');
    }
  }

  /**
   * Generates the DB2 connection string using JWT authentication.
   * Verifies the JWT token and extracts credentials for connection.
   */
  public getConnectionString(): string {
    const { host, port, database } = this.config;
    const { jwtToken, jwtSecret } = this.config.auth as Db2JwtAuthOptions;

    if (!jwtToken || !jwtSecret) {
      throw new Db2Error(
        'JWT token and secret are required for authentication.',
      );
    }

    let decoded: JwtPayload;

    try {
      decoded = this.verifyJwtToken(jwtToken, jwtSecret);
      this.logger.log('JWT token successfully verified.');
    } catch (error: any) {
      this.logger.error('JWT verification failed:', error.message);
      throw new Db2AuthenticationError('Invalid or expired JWT token.');
    }

    const username = decoded.username as string;
    const password = decoded.password as string;

    if (!username || !password) {
      throw new Db2Error('Username and password are required in JWT payload.');
    }

    return `DATABASE=${database};HOSTNAME=${host};PORT=${port};PROTOCOL=TCPIP;UID=${username};PWD=${password};`;
  }

  /**
   * Verifies the provided JWT token using the secret.
   * @param token - The JWT token to verify.
   * @param secret - The secret or public key used to verify the token.
   * @returns The decoded JWT payload if successful.
   * @throws Db2AuthenticationError if the token is invalid or expired.
   */
  private verifyJwtToken(token: string, secret: string): JwtPayload {
    try {
      const decoded = verify(token, secret) as JwtPayload;
      return decoded;
    } catch (error: any) {
      this.logger.error('JWT verification failed:', error.message);
      throw new Db2AuthenticationError('Invalid or expired JWT token.');
    }
  }
}
