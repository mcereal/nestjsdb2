// Connection.ts
import { Socket } from 'net';
import { connect as tlsConnect, TLSSocket } from 'tls';
import {
  DRDACodePoints,
  DRDAMessageTypes,
} from '../enums/drda-codepoints.enum';
import { PreparedStatement } from './prepared-statement';
import { Logger } from '../utils';
import { EventEmitter } from 'events';
import {
  ACCRDBResponse,
  ACCSECRMResponse,
  CHNRQSDSSResponse,
  EXCSQLSETResponse,
  SECCHKRMResponse,
} from '../interfaces/drda-specific-responses.interface';
import { DRDAResponseType } from '../interfaces/drda-response.interface';
import { Row } from '../interfaces/row.interface';
import { ColumnMetadata } from '../interfaces/column-metadata.interface';
import { MessageBuilder } from './message-builder';
import { DRDAParser } from './drda-parser';
import { BigInteger } from './BigInteger';
import { RSAKey } from './RSAKey';
import { readFileSync } from 'fs';
import path from 'path';
import { MessageHandlers } from './message-handlers';

interface PendingResponse {
  resolve: (response: DRDAResponseType) => void;
  reject: (error: Error) => void;
  timeout: NodeJS.Timeout;
}

/**
 * Connection class responsible for managing DRDA protocol communication with DB2.
 */
export class Connection extends EventEmitter {
  private socket: Socket | TLSSocket | null = null;
  private connectionString: string;
  private connectionTimeout: number;
  private isConnected: boolean = false;
  private serverPublicKey: Buffer | null = null;

  private dbName: string = '';
  private hostName: string = '';
  private port: number = 0;
  private userId: string = '';
  private password: string = '';
  private useSSL: boolean = false;
  private correlationId: number = 1;
  private receiveBuffer: Buffer = Buffer.alloc(0);
  private sslCertificatePath: string | null = null;

  private pendingResponses: Map<number, PendingResponse> = new Map();
  private responseResolvers: Map<number, (response: DRDAResponseType) => void> =
    new Map();
  private responseRejectors: Map<number, (error: Error) => void> = new Map();

  private readonly logger = new Logger(Connection.name);
  private messageBuilder: MessageBuilder;
  private messageHandlers: MessageHandlers;
  private parser: DRDAParser;

  private rsaKey: RSAKey;

  private _externalName: string = '';
  private _serverVersion: string = '';
  private _securityChecked: boolean = false;

  constructor(connectionString: string, timeout?: number) {
    super();
    this.connectionString = connectionString;
    this.connectionTimeout = timeout || 10000;
    this.logger = new Logger(Connection.name);
    this.messageBuilder = new MessageBuilder();
    this.messageHandlers = new MessageHandlers(this);
    this.parser = new DRDAParser();
    this.parseConnectionString();
  }

  /**
   * Parses the DB2 connection string into individual components.
   */
  private parseConnectionString(): void {
    const params = this.connectionString.split(';');
    params.forEach((param) => {
      const [key, value] = param.split('=');
      switch (key.trim().toUpperCase()) {
        case 'DATABASE':
          this.dbName = value;
          break;
        case 'HOSTNAME':
          this.hostName = value;
          break;
        case 'PORT':
          this.port = parseInt(value, 10);
          break;
        case 'UID':
          this.userId = value;
          break;
        case 'PWD':
          this.password = value;
          break;
        case 'SECURITY':
          this.useSSL = value.toLowerCase() === 'ssl';
          break;
        case 'SSLCERTIFICATE':
          this.sslCertificatePath = value;
          break;
        default:
          this.logger.warn(`Unknown connection parameter: ${key}`);
          break;
      }
    });

    this.logger.info('Parsed connection string:', {
      dbName: this.dbName,
      hostName: this.hostName,
      port: this.port,
      userId: this.userId,
      useSSL: this.useSSL,
      sslCertificatePath: this.sslCertificatePath,
    });
  }

  /**
   * Sets up socket event listeners for data, error, and close events.
   */
  private setupSocketListeners(): void {
    if (this.socket) {
      this.socket.on('data', (data: Buffer) => this.handleData(data));
      this.socket.on('error', (err: Error) => this.handleError(err));
      this.socket.on('close', (hadError: boolean) =>
        this.handleClose(hadError),
      );
    }
  }

  /**
   * Handles incoming data from the socket.
   * @param data Incoming data buffer.
   */
  private handleData(data: Buffer): void {
    this.receiveBuffer = Buffer.concat([this.receiveBuffer, data]);
    this.logger.info(`Accumulated buffer length: ${this.receiveBuffer.length}`);
    this.logger.debug(`Received data chunk: ${data.toString('hex')}`);

    while (this.receiveBuffer.length >= 6) {
      const length = this.receiveBuffer.readUInt16BE(0);
      this.logger.info(`Parsed message length: ${length}`);

      if (this.receiveBuffer.length < length) {
        this.logger.info(`Incomplete message. Waiting for more data...`);
        break;
      }

      const messageBuffer = this.receiveBuffer.slice(0, length);
      this.logger.debug(
        `Complete message received: ${messageBuffer.toString('hex')}`,
      );
      this.receiveBuffer = this.receiveBuffer.slice(length); // Remove processed message from buffer

      try {
        const header = this.parser.parseHeader(messageBuffer);
        const correlationId = header.correlationId;
        const responsePayload = header.payload;

        // Identify and parse the response type
        const responseType = this.parser.identifyResponseType(responsePayload);
        const parsedResponse = this.parser.parsePayload(
          responsePayload,
          responseType,
        );

        this.logger.info(
          `Received DRDA response with correlationId: ${correlationId}`,
        );

        // Use the MessageHandlers to process the parsed message
        this.messageHandlers.handleMessage(parsedResponse);

        const pendingResponse = this.pendingResponses.get(correlationId);
        if (pendingResponse) {
          clearTimeout(pendingResponse.timeout);
          pendingResponse.resolve(parsedResponse);
          this.pendingResponses.delete(correlationId);
        } else {
          this.logger.warn(
            'No pending response resolver to handle the response.',
          );
        }
      } catch (err) {
        this.logger.error('Error decoding DRDA response:', err);

        const correlationId = (err as any).correlationId;
        if (correlationId !== undefined) {
          const pendingResponse = this.pendingResponses.get(correlationId);
          if (pendingResponse) {
            clearTimeout(pendingResponse.timeout);
            pendingResponse.reject(err);
            this.pendingResponses.delete(correlationId);
          }
        } else {
          // If correlationId is not available, reject all pending responses (use with caution)
          this.pendingResponses.forEach((pendingResponse, cid) => {
            clearTimeout(pendingResponse.timeout);
            pendingResponse.reject(err);
            this.pendingResponses.delete(cid);
          });
        }
      }
    }
  }

  /**
   * Handles errors based on the server code or socket errors.
   * @param {Error | number} error - The error object or server code.
   */
  public handleError(error: Error | number): void {
    if (error instanceof Error) {
      // Handle socket errors
      this.logger.error('Socket error:', error);
      this.close().catch((closeErr) =>
        this.logger.error('Error closing socket:', closeErr),
      );
      this.emit('error', error);
    } else if (typeof error === 'number') {
      // Handle protocol errors based on SVRCOD
      this.logger.error(`Protocol error with SVRCOD: ${error}`);
      this.close().catch((closeErr) =>
        this.logger.error('Error closing socket:', closeErr),
      );
      this.emit('error', new Error(`Protocol error with code ${error}`));
    } else {
      this.logger.warn('Unknown error type received in handleError.');
    }
  }

  /**
   * Processes the result set received from the server.
   * @param {Row[]} rows - The result set rows.
   * @param {ColumnMetadata[]} metadata - The result set metadata.
   */
  public handleResultSet(rows: Row[], metadata: ColumnMetadata[]): void {
    this.logger.info('Handling result set from EXCSQLSET response.');
    // Emit an event with the result set for external handling
    this.emit('result', { rows, metadata });
  }

  /**
   * Handles socket closure events by updating connection status and emitting events.
   * @param hadError Indicates if the socket was closed due to an error.
   */
  private handleClose(hadError: boolean): void {
    if (hadError) {
      this.logger.error('Socket closed due to an error.');
    } else {
      this.logger.info('Socket closed gracefully.');
    }
    this.setConnected(false);
    this.emit('close', hadError);
  }

  /**
   * Initiates the authentication process using DRDA protocol.
   */
  private async authenticate(): Promise<void> {
    this.logger.info(`Authenticating as user ${this.userId}...`);

    try {
      await this.sendEXCSAT();
      await this.sendACCSEC();
      await this.sendSECCHK();
      await this.sendACCRDB();
      this.logger.info('Authentication successful for user', this.userId);
    } catch (error) {
      this.logger.error('Error during authentication:', error);
      throw error;
    }
  }

  /**
   * Sends the EXCSAT message as the first step of authentication.
   */
  private async sendEXCSAT(): Promise<void> {
    this.correlationId++;
    const excsatMessage = this.messageBuilder.constructEXCSATMessage(
      this.dbName,
      this.correlationId,
    );
    this.logger.info('Sending EXCSAT message...');
    await this.send(excsatMessage);

    // Wait for the response
    const response = await this.receiveResponse(this.correlationId);

    // Since MessageHandlers have already processed the response, we can proceed
    if (!response.success) {
      throw new Error(`EXCSAT failed with response type: ${response.type}`);
    }

    this.logger.info('EXCSAT message processed successfully.');
  }

  /**
   * Sends the ACCSEC message as the second step of authentication.
   */
  private async sendACCSEC(): Promise<void> {
    this.correlationId++;
    const accsecMessage = this.messageBuilder.constructACCSECMessage(
      this.dbName,
      this.correlationId,
    );
    this.logger.info('Sending ACCSEC message...');
    await this.send(accsecMessage);
    const response = await this.receiveResponse(this.correlationId);

    if (!response.success) {
      throw new Error(`ACCSEC failed with response type: ${response.type}`);
    }

    this.logger.info('ACCSEC message processed successfully.');
  }

  /**
   * Sends the SECCHK message as the third step of authentication.
   */
  private async sendSECCHK(): Promise<void> {
    this.correlationId++;
    const secchkMessage = this.messageBuilder.constructSECCHKMessage(
      this.userId,
      this.serverPublicKey,
      this.password,
      this.correlationId,
    );
    this.logger.info('Sending SECCHK message...');
    await this.send(secchkMessage);
    const response = await this.receiveResponse(this.correlationId);

    if (!response.success) {
      throw new Error(
        `Unexpected response type during SECCHK: ${response.type}`,
      );
    }

    this.setSecurityChecked(true);
    this.logger.info('Security check passed.');
  }

  /**
   * Sends the ACCRDB message as the final step of authentication.
   */
  private async sendACCRDB(): Promise<void> {
    this.correlationId++;
    const accrdbMessage = this.messageBuilder.constructACCRDBMessage(
      this.dbName,
      this.correlationId,
    );
    this.logger.info('Sending ACCRDB message...');
    await this.send(accrdbMessage);
    const response = await this.receiveResponse(this.correlationId);

    if (!response.success) {
      throw new Error(
        `Unexpected response type during ACCRDB: ${response.type}`,
      );
    }

    this.setConnected(true);
    this.logger.info('Connection to DB2 established successfully.');
  }

  /**
   * Sets the server's public key.
   * @param {Buffer} key - The server's public key.
   */
  public setServerPublicKey(key: Buffer): void {
    this.serverPublicKey = key;
    this.logger.debug('Server public key set.');
  }

  set externalName(name: string) {
    this._externalName = name;
    this.logger.debug(`External name set to: ${name}`);
  }

  set serverVersion(version: string) {
    this._serverVersion = version;
    this.logger.debug(`Server version set to: ${version}`);
  }

  set securityChecked(isChecked: boolean) {
    this._securityChecked = isChecked;
    this.logger.debug(`Security checked status set to: ${isChecked}`);
  }

  /**
   * Sets the connection's connected status.
   * @param {boolean} isConnected - Connection status.
   */
  public setConnected(isConnected: boolean): void {
    this.isConnected = isConnected;
    this.logger.debug(`Connection status set to: ${isConnected}`);
  }

  /**
   * Extracts the SVRCOD (Server Code) from the payload.
   * @param payload The response payload buffer.
   * @returns The SVRCOD as a number.
   */
  extractSVRCOD(payload: Buffer): number {
    if (payload.length < 6) {
      throw new Error('Invalid SVRCOD response payload');
    }
    return payload.readUInt16BE(4); // Adjust the offset as necessary
  }

  /**
   * Sets the server version.
   * @param {string} version - The server version.
   */
  public setServerVersion(version: string): void {
    this.serverVersion = version;
    this.logger.debug(`Server version set to: ${version}`);
  }

  /**
   * Sets the security check status.
   * @param {boolean} isChecked - Security check status.
   */
  public setSecurityChecked(isChecked: boolean): void {
    this.securityChecked = isChecked;
    this.logger.debug(`Security checked status set to: ${isChecked}`);
  }

  /**
   * Opens the connection to the DB2 server, supporting SSL if configured.
   */
  public async open(): Promise<void> {
    if (this.isConnected) {
      this.logger.info(
        `Already connected to DB2 at ${this.hostName}:${this.port}.`,
      );
      return;
    }

    try {
      await this.retryConnection(3);
      this.setupSocketListeners();
    } catch (error) {
      this.logger.error(
        `Failed to connect to DB2 after retries: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Attempts to establish a connection with the DB2 server, retrying on failure.
   * @param retries Number of retry attempts.
   */

  private async retryConnection(retries = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        this.logger.info(`Attempting to connect (Attempt ${attempt})...`);

        await new Promise<void>((resolve, reject) => {
          const connectionTimeout = setTimeout(() => {
            const errorMessage = `Connection to DB2 at ${this.hostName}:${this.port} timed out`;
            this.logger.error(errorMessage);
            reject(new Error(errorMessage));
          }, this.connectionTimeout);

          const onConnectionError = (err: Error) => {
            this.isConnected = false;
            clearTimeout(connectionTimeout);
            this.logger.error(
              `Connection error to DB2 at ${this.hostName}:${this.port}:`,
              err,
            );
            reject(err);
          };

          if (this.useSSL) {
            this.logger.info('Using SSL for connection');
            const tlsOptions: any = {
              port: this.port,
              host: this.hostName,
              timeout: this.connectionTimeout,
            };

            // Construct the full path to the SSL certificate
            if (this.sslCertificatePath) {
              try {
                const certPath = path.resolve(
                  process.cwd(),
                  this.sslCertificatePath,
                );
                tlsOptions['ca'] = [readFileSync(certPath)];
                this.logger.info(`Using SSL certificate at: ${certPath}`);
                tlsOptions['rejectUnauthorized'] = true; // Enable certificate verification
              } catch (fileError) {
                this.logger.error(
                  `Failed to read SSL certificate at: ${this.sslCertificatePath}`,
                  fileError,
                );
                reject(fileError);
                return;
              }
            } else {
              // No custom CA certificate provided, use default CA store
              tlsOptions['rejectUnauthorized'] = true; // Ensure certificate verification is enabled
            }

            this.socket = tlsConnect(tlsOptions, () => {
              clearTimeout(connectionTimeout);
              if (this.socket instanceof TLSSocket && this.socket.authorized) {
                this.setConnected(true);
                this.logger.info(
                  `Socket connected securely at ${this.hostName}:${this.port}`,
                );
                this.authenticate()
                  .then(() => resolve())
                  .catch((authErr) => {
                    this.logger.error('Authentication failed:', authErr);
                    reject(authErr);
                  });
              } else {
                const authError =
                  this.socket instanceof TLSSocket
                    ? this.socket.authorizationError
                    : 'Unknown';
                reject(
                  new Error(
                    `TLS connection failed: ${authError || 'Unknown authorization error'}`,
                  ),
                );
              }
            });
          } else {
            this.logger.info('Using plain TCP for connection');
            this.socket = new Socket();
            this.socket.connect(this.port, this.hostName, () => {
              clearTimeout(connectionTimeout);
              this.setConnected(true);
              this.authenticate()
                .then(() => resolve())
                .catch((authErr) => {
                  this.logger.error('Authentication failed:', authErr);
                  reject(authErr);
                });
            });
          }

          this.socket.once('error', onConnectionError);
          this.socket.once('timeout', () => {
            reject(
              new Error(
                `Connection to DB2 at ${this.hostName}:${this.port} timed out`,
              ),
            );
          });
        });
        break; // Break if connection is successful
      } catch (error) {
        this.logger.error(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt === retries) {
          throw new Error(
            'Maximum retry attempts reached. Unable to connect to DB2.',
          );
        }
        await this.delay(attempt * 1000); // Exponential backoff
      }
    }
  }

  /**
   * Delays execution for a specified duration.
   * @param ms Milliseconds to delay.
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Sends data over the socket.
   * @param data The data buffer to send.
   */
  private async send(data: Buffer): Promise<void> {
    if (!this.isConnected || !this.socket) {
      throw new Error('Connection is not open.');
    }

    return new Promise((resolve, reject) => {
      const success = this.socket!.write(data, (err: Error | null) => {
        if (err) {
          this.logger.error('Error sending data:', err.message);
          reject(new Error(`Failed to send data: ${err.message}`));
        } else {
          this.logger.info(`Data sent to DB2 at ${this.hostName}:${this.port}`);
          resolve();
        }
      });

      if (!success) {
        this.logger.info('Socket buffer full, waiting for drain event...');
        this.socket!.once('drain', () => {
          this.logger.info('Socket buffer drained, continuing to send...');
          resolve();
        });
      }
    });
  }

  /**
   * Receives a response from the DB2 server.
   * @returns A promise that resolves with the DRDA response.
   *
   */

  public receiveResponse(correlationId: number): Promise<DRDAResponseType> {
    if (!this.isConnected || !this.socket) {
      return Promise.reject(new Error('Connection is not open.'));
    }

    return new Promise((resolve, reject) => {
      this.responseResolvers.set(correlationId, resolve);
      this.responseRejectors.set(correlationId, reject);
      this.logger.info('Awaiting response from DB2 server...');

      const responseTimeout = setTimeout(() => {
        const errorMessage =
          'No response received from DB2 server in a timely manner.';
        this.logger.error(errorMessage);
        reject(new Error(errorMessage));
        this.responseResolvers.delete(correlationId);
        this.responseRejectors.delete(correlationId);
      }, 40000); // 40 seconds timeout

      this.pendingResponses.set(correlationId, {
        resolve,
        reject,
        timeout: responseTimeout,
      });
    });
  }

  extractServerPublicKey(data: Buffer): string {
    try {
      let offset = 0;

      // Parse Modulus Length (2 bytes)
      if (data.length < offset + 2) {
        throw new Error('Data buffer too short to contain modulus length.');
      }
      const modulusLength = data.readUInt16BE(offset);
      offset += 2;
      this.logger.debug(`Modulus Length: ${modulusLength} bytes`);

      // Parse Modulus
      if (data.length < offset + modulusLength) {
        throw new Error('Data buffer too short to contain modulus.');
      }
      const modulusBuffer = data.slice(offset, offset + modulusLength);
      offset += modulusLength;
      this.logger.debug(`Modulus: ${modulusBuffer.toString('hex')}`);

      // Parse Exponent Length (2 bytes)
      if (data.length < offset + 2) {
        throw new Error('Data buffer too short to contain exponent length.');
      }
      const exponentLength = data.readUInt16BE(offset);
      offset += 2;
      this.logger.debug(`Exponent Length: ${exponentLength} bytes`);

      // Parse Exponent
      if (data.length < offset + exponentLength) {
        throw new Error('Data buffer too short to contain exponent.');
      }
      const exponentBuffer = data.slice(offset, offset + exponentLength);
      offset += exponentLength;
      this.logger.debug(`Exponent: ${exponentBuffer.toString('hex')}`);

      // Convert modulus and exponent to number[] arrays
      const modulusArray = Array.from(modulusBuffer);
      const exponentArray = Array.from(exponentBuffer);

      // Convert to BigInteger instances
      const modulus = new BigInteger(modulusArray);
      const exponent = new BigInteger(exponentArray);

      // Encode modulus and exponent as ASN.1 DER integers
      const encodedModulus = this.rsaKey.encodeASN1Integer(modulus);
      const encodedExponent = this.rsaKey.encodeASN1Integer(exponent);

      // Combine them into a sequence
      const rsaPublicKeySequence = this.rsaKey.encodeASN1Sequence([
        encodedModulus,
        encodedExponent,
      ]);

      // Base64 encode the sequence
      const base64Key = rsaPublicKeySequence.toString('base64');

      // Wrap with PEM headers
      const pemKey = this.rsaKey.formatPEM(base64Key, 'RSA PUBLIC KEY');
      this.logger.debug(`Constructed PEM Public Key:\n${pemKey}`);

      // Update the serverPublicKey with the PEM-formatted key
      this.setServerPublicKey(Buffer.from(pemKey, 'utf8'));

      return pemKey;
    } catch (error) {
      this.logger.error('Failed to extract server public key:', error);
      throw new Error('Invalid server public key format.');
    }
  }

  /**
   * Parses the EXTNAM parameter.
   * @param data The data buffer containing the external name.
   * @returns The parsed external name string.
   */
  parseEXTNAM(data: Buffer): string {
    return data.toString('utf8').replace(/\x00/g, '');
  }

  /**
   * Sends a request to close a prepared statement.
   * @param statementHandle The handle of the statement to close.
   */
  public async sendCloseStatementRequest(
    statementHandle: string,
  ): Promise<void> {
    this.correlationId++;
    const message = this.messageBuilder.constructCloseStatementMessage(
      statementHandle,
      this.correlationId,
    );
    await this.send(message);
    const response = await this.receiveResponse(this.correlationId);

    if (response.type !== DRDAMessageTypes.CLOSESTM_RM) {
      throw new Error(
        `Unexpected response type during CLOSESTM: ${response.type}`,
      );
    }

    const closeStmtResponse = response as DRDAResponseType;
    const svrcod = (closeStmtResponse as ACCRDBResponse).parameters.svrcod;
    this.logger.info(`CLOSESTM RM SVRCOD received: ${svrcod}`);

    if (svrcod !== 0) {
      throw new Error(`Close Statement failed with code: ${svrcod}`);
    }
  }

  /**
   * Closes the socket connection gracefully.
   */
  public async close(): Promise<void> {
    if (!this.isConnected || !this.socket) {
      this.logger.warn('Connection is already closed or not open.');
      return;
    }

    this.logger.info(
      `Closing connection to DB2 at ${this.hostName}:${this.port}...`,
    );

    return new Promise((resolve, reject) => {
      this.socket!.once('error', (err) => {
        this.logger.error('Error closing connection:', err);
        reject(err);
      });

      this.socket!.once('close', () => {
        this.setConnected(false);
        this.logger.info('DB2 connection closed.');
        resolve();
      });

      this.socket!.end();
    });
  }

  /**
   * Executes a SQL query with optional parameters.
   * @param query The SQL query string.
   * @param params An array of parameters for the SQL query.
   * @returns A promise that resolves with the query result rows.
   */
  public async query(
    query: string,
    params: any[] = [],
    callback?: (err: Error, result: Row[]) => void,
  ): Promise<Row[]> {
    try {
      if (!this.isConnected) {
        this.logger.info('Connection lost. Attempting to reconnect...');
        await this.retryConnection();
      }

      await this.sendSQL(query, params);
      const response = await this.receiveResponse(this.correlationId);

      if (response.type !== DRDAMessageTypes.EXCSQLSET) {
        throw new Error(
          `Unexpected response type from query execution: ${response.type}`,
        );
      }

      const sqlSetResponse = response as EXCSQLSETResponse;
      if (!sqlSetResponse.success) {
        throw new Error('Query execution failed with server error code.');
      }

      return sqlSetResponse.result;
    } catch (err) {
      this.logger.error('Error executing query:', err);
      this.logger.error('Error executing query:', err);

      if (callback) {
        callback(err, null);
      }
      throw err;
    }
  }

  /**
   * Sends an SQL execution request.
   * @param query The SQL query string.
   * @param params An array of parameters for the SQL query.
   */
  private async sendSQL(query: string, params: any[]): Promise<void> {
    const preparedStmt = await this.prepare(query);
    await preparedStmt.execute(params);
  }

  /**
   * Prepares an SQL statement.
   * @param sql The SQL statement to prepare.
   * @returns A promise that resolves with a PreparedStatement instance.
   */
  public async prepare(sql: string): Promise<PreparedStatement> {
    const stmtHandle = await this.sendPrepareRequest(sql);
    return new PreparedStatement(this, sql, stmtHandle);
  }

  /**
   * Sends a prepare request for the given SQL statement.
   * @param sql The SQL statement to prepare.
   * @returns A promise that resolves with the statement handle.
   */
  private async sendPrepareRequest(sql: string): Promise<string> {
    const prepareMessage = this.constructEXCSQLPREPMessage(sql);
    await this.send(prepareMessage);
    const response = await this.receiveResponse(this.correlationId);

    if (response.type !== DRDAMessageTypes.EXCSQLPREPRM) {
      throw new Error(
        `Unexpected response type during prepare: ${response.type}`,
      );
    }

    const prepareResponse = response as EXCSQLSETResponse; // Adjust based on actual response interface
    const stmtHandle = this.extractStatementHandle(prepareResponse.payload);
    if (!stmtHandle) {
      throw new Error(
        'Failed to retrieve statement handle from EXCSQLPREPRM response',
      );
    }

    return stmtHandle;
  }

  /**
   * Constructs the EXCSQLPREP (Execute SQL Prepare) message.
   * @param sql The SQL statement to prepare.
   * @returns The constructed EXCSQLPREP message buffer.
   */
  private constructEXCSQLPREPMessage(sql: string): Buffer {
    const sqlBuffer = Buffer.from(sql, 'utf8');
    const parameters: Buffer[] = [];

    // SQL Statement
    parameters.push(
      this.messageBuilder.constructParameter(
        DRDACodePoints.EXCSQLPREP,
        sqlBuffer,
      ),
    );

    const parametersBuffer = Buffer.concat(parameters);

    // EXCSQLPREP Object
    const excsqlprepLength = 4 + parametersBuffer.length;
    const excsqlprepBuffer = Buffer.alloc(4);
    excsqlprepBuffer.writeUInt16BE(excsqlprepLength, 0);
    excsqlprepBuffer.writeUInt16BE(DRDACodePoints.EXCSQLPREP, 2);

    const excsqlprepObject = Buffer.concat([
      excsqlprepBuffer,
      parametersBuffer,
    ]);

    // DSS Header
    const totalLength = 6 + excsqlprepObject.length;
    this.correlationId++;
    const dssHeader = this.messageBuilder.constructDSSHeader(
      totalLength,
      this.correlationId,
    );

    // Final EXCSQLPREP message with DSS header
    const message = Buffer.concat([dssHeader, excsqlprepObject]);
    this.logger.info(
      `Constructed EXCSQLPREP message: ${message.toString('hex')}`,
    );
    return message;
  }

  /**
   * Sends an EXCSQLEXP (Execute SQL Statement) request.
   * @param statementHandle The handle of the prepared statement.
   * @param params The parameters to bind to the SQL statement.
   */
  public async sendExecuteRequest(
    statementHandle: string,
    params: any[],
  ): Promise<number> {
    this.correlationId++;
    const currentCorrelationId = this.correlationId;
    const executeMessage = this.constructEXCSQLEXPMessage(
      statementHandle,
      params,
      currentCorrelationId,
    );
    this.logger.info('Sending EXCSQLEXP message...');
    await this.send(executeMessage);
    return currentCorrelationId;
  }

  /**
   * Constructs the EXCSQLEXP (Execute SQL Statement) message.
   * @param statementHandle The handle of the prepared statement.
   * @param params The parameters to bind to the SQL statement.
   * @returns The constructed EXCSQLEXP message buffer.
   */
  private constructEXCSQLEXPMessage(
    statementHandle: string,
    params: any[],
    correlationId: number,
  ): Buffer {
    const parameters: Buffer[] = [];

    // STMTHDL (Statement Handle)
    parameters.push(
      this.messageBuilder.constructParameter(
        DRDACodePoints.STMTHDL,
        Buffer.from(statementHandle, 'utf8'),
      ),
    );

    // Parameters Binding
    params.forEach((param) => {
      const paramBuffer = Buffer.from(this.serializeParam(param), 'utf8');
      parameters.push(
        this.messageBuilder.constructParameter(
          DRDACodePoints.PARAMETER,
          paramBuffer,
        ),
      );
    });

    const parametersBuffer = Buffer.concat(parameters);

    // EXCSQLEXP Object
    const excsqlexpLength = 4 + parametersBuffer.length;
    const excsqlexpBuffer = Buffer.alloc(4);
    excsqlexpBuffer.writeUInt16BE(excsqlexpLength, 0);
    excsqlexpBuffer.writeUInt16BE(DRDACodePoints.EXCSQLEXP, 2);

    const excsqlexpObject = Buffer.concat([excsqlexpBuffer, parametersBuffer]);

    // DSS Header
    const totalLength = 6 + excsqlexpObject.length;
    const dssHeader = this.messageBuilder.constructDSSHeader(
      totalLength,
      correlationId,
    );

    // Final EXCSQLEXP message with DSS header
    const message = Buffer.concat([dssHeader, excsqlexpObject]);
    this.logger.info(
      `Constructed EXCSQLEXP message: ${message.toString('hex')}`,
    );
    return message;
  }

  /**
   * Serializes a parameter for binding.
   * @param param The parameter to serialize.
   * @returns The serialized parameter as a string.
   */
  private serializeParam(param: any): string {
    if (typeof param === 'string') {
      return param.replace(/'/g, "''"); // Simple escaping
    } else if (typeof param === 'number') {
      return param.toString();
    } else if (param === null) {
      return 'NULL';
    }
    // Handle other types as needed
    return param.toString();
  }

  /**
   * Processes the EXCSQLSET (Execute SQL Statement Set) response.
   * @param payload The response payload buffer.
   * @returns The parsed result set.
   */
  public processExecuteResponse(payload: Buffer): Row[] {
    // Implement the parsing logic based on your DRDAParser implementation
    // Assuming your DRDAParser can parse the payload into a structured response
    const parsedResponse = this.parser.parsePayload(
      payload,
      DRDAMessageTypes.EXCSQLSET,
    ) as EXCSQLSETResponse;

    if (!parsedResponse.success) {
      throw new Error(
        `Execute statement failed with SVRCOD: ${parsedResponse.parameters.svrcod}`,
      );
    }

    return parsedResponse.result; // Assuming 'result' contains the rows
  }
  /**
   * Extracts the statement handle from the prepare response payload.
   * @param payload The response payload buffer.
   * @returns The statement handle as a string or null if not found.
   */
  private extractStatementHandle(payload: Buffer): string | null {
    let offset = 0;

    while (offset + 4 <= payload.length) {
      const paramLength = payload.readUInt16BE(offset);
      const paramCodePoint = payload.readUInt16BE(offset + 2);
      const data = payload.slice(offset + 4, offset + paramLength);

      if (paramCodePoint === DRDACodePoints.STMTHDL) {
        return data.toString('utf8').trim();
      }

      offset += paramLength;
    }

    return null;
  }

  /**
   * Formats the SQL query by replacing placeholders with escaped parameters.
   * @param query The SQL query string with placeholders.
   * @param params An array of parameters to replace the placeholders.
   * @returns The formatted SQL query string.
   */
  private formatQuery(query: string, params: any[]): string {
    let formattedQuery = query;
    params.forEach((param) => {
      const safeParam = this.escapeSQLParam(param);
      formattedQuery = formattedQuery.replace('?', safeParam);
    });
    return formattedQuery;
  }

  /**
   * Escapes SQL parameters to prevent injection attacks.
   * @param param The parameter to escape.
   * @returns The escaped parameter as a string.
   */
  private escapeSQLParam(param: any): string {
    if (typeof param === 'string') {
      return `'${param.replace(/'/g, "''")}'`;
    } else if (typeof param === 'number') {
      return param.toString();
    } else if (param === null) {
      return 'NULL';
    }
    // Handle other types as needed
    return param;
  }

  /**
   * Closes the connection with an optional callback.
   * @param callback Optional callback to handle closure result.
   */
  public async closeConnection(
    callback?: (err: Error | null) => void,
  ): Promise<void> {
    try {
      await this.close();
      if (callback) callback(null);
    } catch (err) {
      if (callback) callback(err);
      else throw err;
    }
  }
}
