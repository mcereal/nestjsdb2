// Connection.ts
import { Socket } from 'net';
import { connect as tlsConnect, TLSSocket } from 'tls';
import {
  DRDACodePoints,
  DRDAMessageTypes,
} from '../enums/drda-codepoints.enum';
import { constants, publicEncrypt } from 'crypto';
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
import { MessageHandlers } from './message-handlers';
import { MessageBuilder } from './message-builder';
import { DRDAParser } from './drda-parser';

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

  private rsmd: ColumnMetadata[] = [];
  private receiveBuffer: Buffer = Buffer.alloc(0);

  private responseResolvers: Array<(response: DRDAResponseType) => void> = [];
  private responseRejectors: Array<(error: Error) => void> = [];

  private logger: Logger;
  private messageBuilder: MessageBuilder;
  private parser: DRDAParser;
  private handlers: MessageHandlers;

  private externalName: string = '';
  private serverVersion: string = '';
  private securityChecked: boolean = false;

  constructor(connectionString: string, timeout?: number) {
    super();
    this.connectionString = connectionString;
    this.connectionTimeout = timeout || 10000;
    this.logger = new Logger(Connection.name);
    this.messageBuilder = new MessageBuilder(this.correlationId, this.logger);
    this.parser = new DRDAParser(this.logger);
    this.handlers = new MessageHandlers(this, this.logger);
    this.parseConnectionString();
    // Socket listeners are set up after connection
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
      // Minimum header size
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
        const responsePayload = header.payload;
        const responseType = this.parser.identifyResponseType(responsePayload);

        const parsedResponse = this.parser.parsePayload(
          responsePayload,
          responseType,
        );

        this.logger.info('Received DRDA payload:', parsedResponse);

        if (this.responseResolvers.length > 0) {
          const resolve = this.responseResolvers.shift()!;
          const reject = this.responseRejectors.shift()!;
          resolve(parsedResponse);
        } else {
          this.logger.warn(
            'No pending response resolver to handle the response.',
          );
        }
      } catch (err) {
        this.logger.error('Error decoding DRDA response:', err);
        if (this.responseRejectors.length > 0) {
          const reject = this.responseRejectors.shift()!;
          reject(err);
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
   * Handles socket errors by logging and closing the connection.
   * @param err The encountered error.
   */
  private handleSocketError(err: Error): void {
    this.logger.error('Socket error:', err);
    this.close().catch((closeErr) =>
      this.logger.error('Error closing socket:', closeErr),
    );
    // Emit an error event for external handling
    this.emit('error', err);
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
    const excsatMessage = this.constructEXCSATMessage();
    this.logger.info('Sending EXCSAT message...');
    await this.send(excsatMessage);
    const response = await this.receiveResponse();

    if (response.type !== DRDAMessageTypes.CHRNRQSDSS) {
      throw new Error(
        `Unexpected response type during EXCSAT: ${response.type}`,
      );
    }

    const chainedResponse = response as CHNRQSDSSResponse;
    if (
      chainedResponse.parameters.svrcod &&
      chainedResponse.parameters.svrcod !== 0
    ) {
      throw new Error(
        `Server returned error code: ${chainedResponse.parameters.svrcod}`,
      );
    }

    const excsatrd = chainedResponse.chainedData.find(
      (param) => param.codePoint === DRDACodePoints.EXCSATRD,
    );
    if (excsatrd) {
      this.setServerPublicKey(excsatrd.data);
      this.logger.info('Server public key acquired.');
    } else {
      this.logger.warn('EXCSATRD not found in CHNRQSDSS response.');
    }

    const extnam = chainedResponse.chainedData.find(
      (param) => param.codePoint === DRDACodePoints.EXTNAM,
    );
    if (extnam) {
      const extnamStr = this.parseEXTNAM(extnam.data);
      this.setExternalName(extnamStr);
      this.logger.info(`Received EXTNAM: ${extnamStr}`);
      // Handle EXTNAM as needed
    }
  }

  /**
   * Sends the ACCSEC message as the second step of authentication.
   */
  private async sendACCSEC(): Promise<void> {
    const accsecMessage = this.constructACCSECMessage();
    this.logger.info('Sending ACCSEC message...');
    await this.send(accsecMessage);
    const response = await this.receiveResponse();

    if (response.type !== DRDAMessageTypes.ACCSECRM) {
      throw new Error(
        `Unexpected response type during ACCSEC: ${response.type}`,
      );
    }

    const accsecResponse = response as ACCSECRMResponse;
    const svrcod = accsecResponse.parameters.svrcod;
    this.logger.info(`ACCSECRM SVRCOD received: ${svrcod}`);

    if (svrcod !== 0) {
      throw new Error(`Server returned error code during ACCSEC: ${svrcod}`);
    }
  }

  /**
   * Sends the SECCHK message as the third step of authentication.
   */
  private async sendSECCHK(): Promise<void> {
    const secchkMessage = this.constructSECCHKMessage();
    this.logger.info('Sending SECCHK message...');
    await this.send(secchkMessage);
    const response = await this.receiveResponse();

    if (response.type !== DRDAMessageTypes.SECCHKRM) {
      throw new Error(
        `Unexpected response type during SECCHK: ${response.type}`,
      );
    }

    const secchkResponse = response as SECCHKRMResponse;
    const svrcod = secchkResponse.parameters.svrcod;
    this.logger.info(`SECCHKRM SVRCOD received: ${svrcod}`);

    if (svrcod !== 0) {
      throw new Error(`Security check failed with code: ${svrcod}`);
    }

    this.setSecurityChecked(true);
    this.logger.info('Security check passed.');
  }

  /**
   * Sends the ACCRDB message as the final step of authentication.
   */
  private async sendACCRDB(): Promise<void> {
    const accrdbMessage = this.constructACCRDBMessage();
    this.logger.info('Sending ACCRDB message...');
    await this.send(accrdbMessage);
    const response = await this.receiveResponse();

    if (response.type !== DRDAMessageTypes.ACCRDBRM) {
      throw new Error(
        `Unexpected response type during ACCRDB: ${response.type}`,
      );
    }

    const accrdbResponse = response as ACCRDBResponse;
    const svrcod = accrdbResponse.parameters.svrcod;
    this.logger.info(`ACCRDBRM SVRCOD received: ${svrcod}`);

    if (svrcod !== 0) {
      throw new Error(`Access RDB failed with code: ${svrcod}`);
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

  /**
   * Sets the external name.
   * @param {string} name - The external name.
   */
  public setExternalName(name: string): void {
    this.externalName = name;
    this.logger.debug(`External name set to: ${name}`);
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
   * Constructs the EXCSAT message.
   * @returns The constructed EXCSAT message buffer.
   */
  private constructEXCSATMessage(): Buffer {
    const parameters: Buffer[] = [];

    // SRVNAM (Server Name)
    const srvnamData = Buffer.from(this.dbName, 'utf8');
    parameters.push(
      this.messageBuilder.constructParameter(DRDACodePoints.SRVNAM, srvnamData),
    );

    // MGRLVLLS (Manager Level List)
    const mgrlvllsData = this.constructMgrlvlls();
    parameters.push(
      this.messageBuilder.constructParameter(
        DRDACodePoints.MGRLVLLS,
        mgrlvllsData,
      ),
    );

    // PRDID (Product ID)
    const prdidData = Buffer.from('JDB42', 'utf8');
    parameters.push(
      this.messageBuilder.constructParameter(DRDACodePoints.PRDID, prdidData),
    );

    // SRVRLSLV (Server Release Level)
    const srvrlslvData = Buffer.from('11.5', 'utf8');
    parameters.push(
      this.messageBuilder.constructParameter(
        DRDACodePoints.SRVRLSLV,
        srvrlslvData,
      ),
    );

    const parametersBuffer = Buffer.concat(parameters);

    // EXCSAT Object
    const excsatLength = 4 + parametersBuffer.length;
    const excsatBuffer = Buffer.alloc(4);
    excsatBuffer.writeUInt16BE(excsatLength, 0);
    excsatBuffer.writeUInt16BE(DRDACodePoints.EXCSAT, 2);

    const excsatObject = Buffer.concat([excsatBuffer, parametersBuffer]);

    // DSS Header
    const totalLength = 6 + excsatObject.length;
    const dssHeader = this.messageBuilder.constructDSSHeader(totalLength);

    // Final EXCSAT message with DSS header
    const message = Buffer.concat([dssHeader, excsatObject]);
    this.logger.info(`Constructed EXCSAT message: ${message.toString('hex')}`);
    return message;
  }

  /**
   * Constructs the Manager Level List (MGRLVLLS) parameter.
   * @returns The constructed MGRLVLLS buffer.
   */
  private constructMgrlvlls(): Buffer {
    const mgrlvllsData = Buffer.alloc(16); // 4 managers * 4 bytes each
    let offset = 0;

    // AGENT Manager
    mgrlvllsData.writeUInt16BE(DRDACodePoints.AGENT, offset);
    mgrlvllsData.writeUInt16BE(0x07, offset + 2); // Level 7
    offset += 4;

    // SQLAM Manager
    mgrlvllsData.writeUInt16BE(DRDACodePoints.SQLAM, offset);
    mgrlvllsData.writeUInt16BE(0x04, offset + 2); // Level 4
    offset += 4;

    // RDB Manager
    mgrlvllsData.writeUInt16BE(DRDACodePoints.RDB, offset);
    mgrlvllsData.writeUInt16BE(0x07, offset + 2); // Level 7
    offset += 4;

    // SECMGR Manager
    mgrlvllsData.writeUInt16BE(DRDACodePoints.SECMGR, offset);
    mgrlvllsData.writeUInt16BE(0x03, offset + 2); // Level 3
    offset += 4;

    return mgrlvllsData.slice(0, offset);
  }

  /**
   * Constructs the ACCSEC message.
   * @returns The constructed ACCSEC message buffer.
   */
  private constructACCSECMessage(): Buffer {
    const parameters: Buffer[] = [];

    // SECMEC (Security Mechanism)
    const secmecData = Buffer.alloc(2);
    secmecData.writeUInt16BE(DRDACodePoints.SECMEC_USRIDPWD, 0);
    parameters.push(
      this.messageBuilder.constructParameter(DRDACodePoints.SECMEC, secmecData),
    );

    // RDBNAM (Relational Database Name)
    const rdbnamData = Buffer.from(this.dbName, 'utf8');
    parameters.push(
      this.messageBuilder.constructParameter(DRDACodePoints.RDBNAM, rdbnamData),
    );

    // EXTNAM (External Name)
    const extnamData = Buffer.from('MyApp', 'utf8');
    parameters.push(
      this.messageBuilder.constructParameter(DRDACodePoints.EXTNAM, extnamData),
    );

    // MGRLVLLS (Manager Level List)
    const mgrlvllsData = this.constructMgrlvlls();
    parameters.push(
      this.messageBuilder.constructParameter(
        DRDACodePoints.MGRLVLLS,
        mgrlvllsData,
      ),
    );

    const parametersBuffer = Buffer.concat(parameters);

    // ACCSEC Object
    const accsecLength = 4 + parametersBuffer.length;
    const accsecBuffer = Buffer.alloc(4);
    accsecBuffer.writeUInt16BE(accsecLength, 0);
    accsecBuffer.writeUInt16BE(DRDACodePoints.ACCSEC, 2);

    const accsecObject = Buffer.concat([accsecBuffer, parametersBuffer]);

    // DSS Header
    const totalLength = 6 + accsecObject.length;
    const dssHeader = this.messageBuilder.constructDSSHeader(totalLength);

    // Final ACCSEC message with DSS header
    const message = Buffer.concat([dssHeader, accsecObject]);
    this.logger.info(`Constructed ACCSEC message: ${message.toString('hex')}`);
    return message;
  }
  /**
   * Constructs the SECCHK message.
   * @returns The constructed SECCHK message buffer.
   */
  private constructSECCHKMessage(): Buffer {
    const parameters: Buffer[] = [];

    // SECMEC (Security Mechanism)
    const secmecData = Buffer.alloc(2);
    secmecData.writeUInt16BE(DRDACodePoints.SECMEC_EUSRIDPWD, 0);
    parameters.push(
      this.messageBuilder.constructParameter(DRDACodePoints.SECMEC, secmecData),
    );

    // USRID (User ID)
    const userIdData = Buffer.from(this.userId, 'utf8');
    parameters.push(
      this.messageBuilder.constructParameter(DRDACodePoints.USRID, userIdData),
    );

    // PASSWORD (encrypted)
    if (!this.serverPublicKey) {
      throw new Error('Server public key is missing for encryption');
    }

    const encryptedPassword = publicEncrypt(
      { key: this.serverPublicKey, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(this.password, 'utf8'),
    );

    parameters.push(
      this.messageBuilder.constructParameter(
        DRDACodePoints.PASSWORD,
        encryptedPassword,
      ),
    );

    const parametersBuffer = Buffer.concat(parameters);

    // SECCHK Object
    const secchkLength = 4 + parametersBuffer.length;
    const secchkBuffer = Buffer.alloc(4);
    secchkBuffer.writeUInt16BE(secchkLength, 0);
    secchkBuffer.writeUInt16BE(DRDACodePoints.SECCHK, 2);

    const secchkObject = Buffer.concat([secchkBuffer, parametersBuffer]);

    // DSS Header
    const totalLength = 6 + secchkObject.length;
    const dssHeader = this.messageBuilder.constructDSSHeader(totalLength);

    // Final SECCHK message with DSS header
    const message = Buffer.concat([dssHeader, secchkObject]);
    this.logger.info(`Constructed SECCHK message: ${message.toString('hex')}`);
    return message;
  }

  /**
   * Constructs the ACCRDB message.
   * @returns The constructed ACCRDB message buffer.
   */
  private constructACCRDBMessage(): Buffer {
    const parameters: Buffer[] = [];

    // RDBNAM (Relational Database Name)
    const rdbnamData = Buffer.from(this.dbName, 'utf8');
    parameters.push(
      this.messageBuilder.constructParameter(DRDACodePoints.RDBNAM, rdbnamData),
    );

    // Add other required parameters as per DRDA specifications

    const parametersBuffer = Buffer.concat(parameters);

    // ACCRDB Object
    const accrdbLength = 4 + parametersBuffer.length;
    const accrdbBuffer = Buffer.alloc(4);
    accrdbBuffer.writeUInt16BE(accrdbLength, 0);
    accrdbBuffer.writeUInt16BE(DRDACodePoints.ACCRDB, 2);

    const accrdbObject = Buffer.concat([accrdbBuffer, parametersBuffer]);

    // DSS Header
    const totalLength = 6 + accrdbObject.length;
    const dssHeader = this.messageBuilder.constructDSSHeader(totalLength);

    // Final ACCRDB message with DSS header
    const message = Buffer.concat([dssHeader, accrdbObject]);
    this.logger.info(`Constructed ACCRDB message: ${message.toString('hex')}`);
    return message;
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
            this.socket = tlsConnect(
              {
                port: this.port,
                host: this.hostName,
                rejectUnauthorized: false,
                timeout: this.connectionTimeout,
              },
              async () => {
                clearTimeout(connectionTimeout);
                if (
                  this.socket instanceof TLSSocket &&
                  this.socket.authorized
                ) {
                  this.setConnected(true);
                  this.logger.info(
                    `Socket connected securely at ${this.hostName}:${this.port}`,
                  );
                  try {
                    await this.authenticate();
                    resolve();
                  } catch (authErr) {
                    this.logger.error('Authentication failed:', authErr);
                    reject(authErr);
                  }
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
              },
            );
          } else {
            this.logger.info('Using plain TCP for connection');
            this.socket = new Socket();
            this.socket.connect(this.port, this.hostName, async () => {
              clearTimeout(connectionTimeout);
              this.setConnected(true);
              try {
                await this.authenticate();
                resolve();
              } catch (authErr) {
                reject(authErr);
              }
            });
          }

          this.socket!.once('error', onConnectionError);
          this.socket!.once('timeout', () => {
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

  public receiveResponse(): Promise<DRDAResponseType> {
    if (!this.isConnected || !this.socket) {
      return Promise.reject(new Error('Connection is not open.'));
    }

    return new Promise((resolve, reject) => {
      this.responseResolvers.push(resolve);
      this.responseRejectors.push(reject);
      this.logger.info('Awaiting response from DB2 server...');

      const responseTimeout = setTimeout(() => {
        const errorMessage =
          'No response received from DB2 server in a timely manner.';
        this.logger.error(errorMessage);
        reject(new Error(errorMessage));
        // Remove the resolver and rejector to prevent memory leaks
        this.responseResolvers.pop();
        this.responseRejectors.pop();
      }, 40000); // 40 seconds timeout

      // Cleanup on resolve or reject
      const cleanup = () => clearTimeout(responseTimeout);
    });
  }

  /**
   * Extracts the server's public key from the EXCSATRD response.
   * @param data The data buffer containing the public key.
   * @returns The server's public key buffer.
   */
  extractServerPublicKey(data: Buffer): Buffer {
    // Implement extraction logic based on DRDA specifications
    // Placeholder implementation:
    return data; // Modify as per actual data structure
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
    const message = this.constructCloseStatementMessage(statementHandle);
    await this.send(message);
    const response = await this.receiveResponse();

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
   * Constructs the CLOSESTM (Close Statement) message.
   * @param statementHandle The handle of the statement to close.
   * @returns The constructed CLOSESTM message buffer.
   */
  private constructCloseStatementMessage(statementHandle: string): Buffer {
    const parameters: Buffer[] = [];

    // Statement Handle
    const stmtHandleParam = this.messageBuilder.constructParameter(
      DRDACodePoints.STMTHDL,
      Buffer.from(statementHandle, 'utf8'),
    );
    parameters.push(stmtHandleParam);

    const parametersBuffer = Buffer.concat(parameters);

    // CLOSESTM Object
    const closeStmtLength = 4 + parametersBuffer.length;
    const closeStmtBuffer = Buffer.alloc(4);
    closeStmtBuffer.writeUInt16BE(closeStmtLength, 0);
    closeStmtBuffer.writeUInt16BE(DRDACodePoints.CLOSESTM, 2);

    const closeStmtObject = Buffer.concat([closeStmtBuffer, parametersBuffer]);

    // DSS Header
    const totalLength = 6 + closeStmtObject.length;
    const dssHeader = this.messageBuilder.constructDSSHeader(totalLength);

    // Final CLOSESTM message with DSS header
    const message = Buffer.concat([dssHeader, closeStmtObject]);
    this.logger.info(
      `Constructed CLOSESTM message: ${message.toString('hex')}`,
    );
    return message;
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
      const response = await this.receiveResponse();

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
    const response = await this.receiveResponse();

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
    const dssHeader = this.messageBuilder.constructDSSHeader(totalLength);

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
  ): Promise<void> {
    const executeMessage = this.constructEXCSQLEXPMessage(
      statementHandle,
      params,
    );
    this.logger.info('Sending EXCSQLEXP message...');
    await this.send(executeMessage);
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
    const dssHeader = this.messageBuilder.constructDSSHeader(totalLength);

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
