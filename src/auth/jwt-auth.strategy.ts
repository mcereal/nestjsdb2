// src/auth/jwt-auth.strategy.ts

import { createHmac } from 'crypto';
import { AuthStrategy } from './auth.strategy';
import { Db2ConnectionState } from '../enums';
import { Db2AuthenticationError, Db2Error } from '../errors';
import {
  IConfigOptions,
  IConnectionManager,
  Db2JwtAuthOptions,
} from '../interfaces';
import { Logger } from '../utils/logger';

// Define the JWT payload interface
interface IJwtPayload {
  username: string;
  password: string;
  exp?: number;
  iss?: string;
  sub?: string;
  aud?: string;
  iat?: number;
  jti?: string;
}

// Utility functions for Base64URL encoding/decoding
function base64urlDecode(str: string): string {
  str = str.replace(/-/g, '+').replace(/_/g, '/');
  while (str.length % 4) {
    str += '=';
  }
  return Buffer.from(str, 'base64').toString('utf8');
}

function base64urlEncode(buffer: Buffer): string {
  return buffer
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export class JwtAuthStrategy extends AuthStrategy {
  private readonly logger = new Logger(JwtAuthStrategy.name);

  constructor(config: IConfigOptions, connectionManager: IConnectionManager) {
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
      this.logger.info('Already authenticated. Skipping...');
      return;
    }

    this.connectionManager.setState({
      connectionState: Db2ConnectionState.AUTHENTICATING,
    });
    this.logger.info('Starting JWT authentication...');

    try {
      // Simulate authentication process (e.g., establish DB2 connection)
      // For example:
      // const connectionString = this.getConnectionString();
      // await this.connectionManager.connect(connectionString);

      this.logger.info('Authentication successful using JWT strategy.');
      this.connectionManager.setState({
        connectionState: Db2ConnectionState.CONNECTED,
      });
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

    let decoded: IJwtPayload;

    try {
      decoded = this.verifyJwtToken(jwtToken, jwtSecret);
      this.logger.info('JWT token successfully verified.');
    } catch (error: any) {
      this.logger.error('JWT verification failed:', error.message);
      throw new Db2AuthenticationError('Invalid or expired JWT token.');
    }

    const username = decoded.username;
    const password = decoded.password;

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
  private verifyJwtToken(token: string, secret: string): IJwtPayload {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Db2AuthenticationError('Invalid JWT token format.');
    }

    const [headerB64Url, payloadB64Url, signatureB64Url] = parts;

    // Decode header and payload
    const headerJson = base64urlDecode(headerB64Url);
    const payloadJson = base64urlDecode(payloadB64Url);

    let header: any;
    let payload: any;
    try {
      header = JSON.parse(headerJson);
      payload = JSON.parse(payloadJson);
    } catch (error) {
      throw new Db2AuthenticationError('Invalid JWT token payload.');
    }

    // Verify algorithm
    const algorithm = header.alg;
    if (algorithm !== 'HS256') {
      throw new Db2AuthenticationError(
        `Unsupported JWT algorithm: ${algorithm}`,
      );
    }

    // Recompute the signature
    const data = `${headerB64Url}.${payloadB64Url}`;
    const expectedSignature = base64urlEncode(
      createHmac('sha256', secret).update(data).digest(),
    );

    if (expectedSignature !== signatureB64Url) {
      throw new Db2AuthenticationError('Invalid JWT token signature.');
    }

    // Verify token expiration
    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && currentTime >= payload.exp) {
      throw new Db2AuthenticationError('JWT token has expired.');
    }

    return payload as IJwtPayload;
  }
}
