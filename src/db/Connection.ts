import { Socket } from 'net';
import { connect as tlsConnect, TLSSocket } from 'tls';
import {
  DRDAHeader,
  DRDAResponseType,
  EXCSQLSETResponse,
} from './drda.interface';

import { readFileSync } from 'fs';
import { DRDAConstants } from './drda.constants';
import { constants, publicEncrypt } from 'crypto';

export class Connection {
  private socket: Socket | TLSSocket | null = null;
  private connectionString: string;
  private connectionTimeout: number = 10000;
  private isConnected: boolean = false;
  private serverPublicKey: Buffer | null = null;

  private dbName: string; // this value is a number: 0
  private hostName: string;
  private port: number;
  private userId: string;
  private password: string;
  private useSSL: boolean;
  private correlationId: number = 1;

  constructor(connectionString: string, timeout?: number) {
    this.connectionString = connectionString;
    this.connectionTimeout = timeout || 10000;
    this.parseConnectionString();
  }

  // Parse the DB2 connection string into components
  private parseConnectionString(): void {
    const params = this.connectionString.split(';');
    params.forEach((param) => {
      const [key, value] = param.split('=');
      switch (key.trim().toUpperCase()) {
        case 'DATABASE':
          this.dbName = value; // Capture the database name here
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
          break;
      }
    });
  }

  // Open the TCP connection (supports SSL)
  public async open(): Promise<void> {
    if (this.isConnected) {
      console.log(`Already connected to DB2 at ${this.hostName}:${this.port}.`);
      return; // Skip re-opening if already connected
    }

    try {
      // Use the existing retryConnection method
      await this.retryConnection(3); // You can adjust the number of retries if needed
    } catch (error) {
      console.error(`Failed to connect to DB2 after retries: ${error.message}`);
      throw error;
    }
  }
  parseDRDAEXTNAM(payload: Buffer): any {
    let offset = 0;
    const result: any = {};

    // Read the length (2 bytes)
    const length = payload.readUInt16BE(offset);
    offset += 2;
    result.length = length;

    // Read the codePoint (2 bytes)
    const codePoint = payload.readUInt16BE(offset);
    offset += 2;
    result.codePoint = `0x${codePoint.toString(16)}`;

    // Extract the EXTNAM string
    const extnamLength = 20; // Adjust this length based on DRDA specifications (usually no more than 64 bytes)
    const extnam = payload
      .slice(offset, offset + extnamLength)
      .toString('utf8')
      .replace(/\x00/g, '');
    offset += extnamLength;
    result.extnam = extnam;

    // Handle the remaining binary data (parsing control codes or other fields)
    const remainingBytes = payload.slice(offset);
    result.remainingData = remainingBytes.toString('hex'); // Represent the remaining binary data as hex for further analysis

    return result;
  }

  // Authentication logic using DRDA
  private async authenticate(): Promise<void> {
    console.log(`Authenticating as user ${this.userId}...`);

    try {
      // Step 1: Send EXCSAT message
      const excsatMessage = this.createEXCSATMessage();
      console.log('Sending EXCSAT message...');
      await this.send(excsatMessage);

      // Wait for response from the server
      let response = await this.receiveResponse();
      console.log('Received response:', response);

      // Handle EXTNAM explicitly
      if (response.type === 'EXTNAM') {
        console.log('Received EXTNAM response, proceeding...');
        const payload = this.parseDRDAEXTNAM(response.payload);
        console.log('Received DRDA payload:', payload);
      } else if (response.type !== 'EXCSATRD') {
        throw new Error('Unexpected response to EXCSAT message');
      }

      // Proceed with ACCSEC after handling EXTNAM
      const accsecMessage = this.createACCSECMessage();
      console.log('Sending ACCSEC message...');
      await this.send(accsecMessage);

      // Wait for ACCSECRM response from the server
      response = await this.receiveResponse();
      console.log('Received ACCSECRM response:', response);

      // Handle the SVRCOD (Server Code) response
      if (response.type === 'SVRCOD') {
        const svrcod = this.extractSVRCOD(response.payload);
        console.log(`SVRCOD received: ${svrcod}`);

        // Check if the SVRCOD indicates success (usually 0 means success)
        if (svrcod !== 0) {
          throw new Error(`Server returned error code: ${svrcod}`);
        }
      } else if (response.type !== 'ACCSECRM') {
        throw new Error('Unexpected response to ACCSEC message');
      }

      // Step 3: Send SECCHK message with username and password
      const secchkMessage = this.createSECCHKMessage();
      console.log('Sending SECCHK message...');
      await this.send(secchkMessage);

      // Wait for SECCHKRM response from the server
      response = await this.receiveResponse();
      console.log('Received SECCHKRM response:', response);

      // Step 4: Send ACCRDB message
      const accrdbMessage = this.createACCRDBMessage();
      console.log('Sending ACCRDB message...');
      await this.send(accrdbMessage);

      // Wait for ACCRDBRM response from the server
      response = await this.receiveResponse();
      console.log('Received ACCRDBRM response:', response);

      console.log('Authentication successful for user', this.userId);
    } catch (error) {
      console.error('Error during authentication:', error);
      throw error;
    }
  }

  // Helper method to extract SVRCOD from the payload
  private extractSVRCOD(payload: Buffer): number {
    if (payload.length < 6) {
      throw new Error('Invalid SVRCOD response payload');
    }

    // SVRCOD is usually located at the start of the payload
    return payload.readUInt16BE(4); // Adjust the offset as necessary
  }

  // Helper function to construct parameters
  private constructParameter(codePoint: number, dataBuffer: Buffer): Buffer {
    const length = 4 + dataBuffer.length; // Length includes itself and code point
    const parameterBuffer = Buffer.alloc(length);
    parameterBuffer.writeUInt16BE(length, 0); // Length
    parameterBuffer.writeUInt16BE(codePoint, 2); // Code Point
    dataBuffer.copy(parameterBuffer, 4);
    return parameterBuffer;
  }

  private nextCorrelationId(): number {
    return this.correlationId++;
  }

  // Helper function to construct MGRLVLLS
  private constructMgrlvlls(): Buffer {
    const mgrlvllsData = Buffer.alloc(4 * 4); // Adjusting for only 4 managers, 4 bytes each (code point + level)
    let offset = 0;

    // AGENT Manager
    mgrlvllsData.writeUInt16BE(DRDAConstants.AGENT, offset);
    mgrlvllsData.writeUInt16BE(0x07, offset + 2); // Level for AGENT Manager (Version 7)
    offset += 4;

    // SQLAM Manager
    mgrlvllsData.writeUInt16BE(DRDAConstants.SQLAM, offset);
    mgrlvllsData.writeUInt16BE(0x04, offset + 2); // Level for SQLAM Manager (Version 4)
    offset += 4;

    // RDB Manager
    mgrlvllsData.writeUInt16BE(DRDAConstants.RDB, offset);
    mgrlvllsData.writeUInt16BE(0x07, offset + 2); // Level for RDB Manager (Version 7)
    offset += 4;

    // SECMGR Manager
    mgrlvllsData.writeUInt16BE(DRDAConstants.SECMGR, offset);
    mgrlvllsData.writeUInt16BE(0x03, offset + 2); // Level for Security Manager (Version 3)
    offset += 4;

    const mgrlvllsParameter = this.constructParameter(
      DRDAConstants.MGRLVLLS,
      Buffer.from(new Uint8Array(mgrlvllsData).slice(0, offset)),
    );
    return mgrlvllsParameter;
  }

  private parseMgrlvlls(data: Buffer): any[] {
    const mgrlvlls = [];
    let offset = 0;
    while (offset + 4 <= data.length) {
      const mgrCodePoint = data.readUInt16BE(offset);
      const mgrLevel = data.readUInt16BE(offset + 2);
      mgrlvlls.push({ codePoint: mgrCodePoint, level: mgrLevel });
      offset += 4;
    }
    return mgrlvlls;
  }

  private extractMgrlvllsData(payload: Buffer): Buffer {
    let offset = 0;

    while (offset + 4 <= payload.length) {
      const paramLength = payload.readUInt16BE(offset);
      const paramCodePoint = payload.readUInt16BE(offset + 2);

      if (paramCodePoint === DRDAConstants.MGRLVLLS) {
        // Found MGRLVLLS, return the associated data
        return Uint8Array.prototype.slice.call(
          payload,
          offset + 4,
          offset + paramLength,
        );
      }

      offset += paramLength;
    }

    throw new Error('MGRLVLLS not found in response payload');
  }

  // Create EXCSAT message (Exchange Server Attributes) with DRDA version
  private createEXCSATMessage(): Buffer {
    const buffers: Buffer[] = [];

    // EXTNAM (External Name) - Optional but included for client identification
    // Make sure this is short, valid, and identifiable. Typically, it's a short name for the application.
    const extnamData = Buffer.from('MyApp', 'utf8'); // Adjust to a valid name
    const extnamParameter = this.constructParameter(
      DRDAConstants.EXTNAM,
      extnamData,
    );
    buffers.push(extnamParameter);

    // SRVNAM (Server Name) - Should match the database name
    // Ensure that the database name is correctly specified.
    const srvnamData = Buffer.from(this.dbName, 'utf8');
    const srvnamParameter = this.constructParameter(
      DRDAConstants.SRVNAM,
      srvnamData,
    );
    buffers.push(srvnamParameter);

    // MGRLVLLS (Manager Level List) - Critical for DRDA compliance
    // We've already improved this in the previous steps. Ensure all managers are correctly included.
    const mgrlvllsData = this.constructMgrlvlls();
    buffers.push(mgrlvllsData);

    // PRDID (Product ID) - Identifies the client product
    // This should be a valid identifier for your client software. DRDA expects something like 'JDB42' or other DB2 clients.
    const prdidData = Buffer.from('JDB42', 'utf8'); // Replace with the correct product ID
    const prdidParameter = this.constructParameter(
      DRDAConstants.PRDID,
      prdidData,
    );
    buffers.push(prdidParameter);

    // SRVCLSNM (Server Class Name) - Should identify the class of the server
    // This can be 'QDB2/NT', for example, to identify the platform of the server.
    // const srvclsnmData = Buffer.from('QDB2/NT', 'utf8'); // Adjust if necessary
    // const srvclsnmParameter = this.constructParameter(
    //   DRDAConstants.SRVCLSNM,
    //   srvclsnmData,
    // );
    // buffers.push(srvclsnmParameter);

    // SRVRLSLV (Server Release Level) - Identifies the DRDA version or release level
    // Make sure this version aligns with the server's expected protocol version.
    const srvrlslvData = Buffer.from('11.5', 'utf8'); // Adjust to the correct release level (example: '11.5' for DB2 v11.5)
    const srvrlslvParameter = this.constructParameter(
      DRDAConstants.SRVRLSLV,
      srvrlslvData,
    );
    buffers.push(srvrlslvParameter);

    // Combine all parameters into one buffer
    const parametersBuffer = Buffer.concat(buffers);

    // EXCSAT Object - Combine EXCSAT header with parameters
    const excsatLength = 4 + parametersBuffer.length;
    const excsatBuffer = Buffer.alloc(4);
    excsatBuffer.writeUInt16BE(excsatLength, 0);
    excsatBuffer.writeUInt16BE(DRDAConstants.EXCSAT, 2);

    const excsatObject = Buffer.concat([excsatBuffer, parametersBuffer]);

    // DSS Header - Prepares the DRDA message header
    const totalLength = 6 + excsatObject.length;
    const dssHeader = Buffer.alloc(6);
    dssHeader.writeUInt16BE(totalLength, 0); // Total length including DSS header
    dssHeader.writeUInt8(0xd0, 2); // DSS Flags (0xD0 indicates request)
    dssHeader.writeUInt8(0x01, 3); // DSS Type (0x01 for RQSDSS)
    dssHeader.writeUInt16BE(this.nextCorrelationId(), 4); // Correlation ID

    // Final EXCSAT message with DSS header
    const message = Buffer.concat([dssHeader, excsatObject]);
    console.log('Constructed EXCSAT message:', message.toString('hex'));
    return message;
  }

  private async retryConnection(retries = 3): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        console.log(`Attempting to connect (Attempt ${attempt})...`);

        await new Promise<void>((resolve, reject) => {
          const connectionTimeout = setTimeout(() => {
            const errorMessage = `Connection to DB2 at ${this.hostName}:${this.port} timed out`;
            console.error(errorMessage);
            reject(new Error(errorMessage));
          }, this.connectionTimeout);

          const onConnectionError = (err: Error) => {
            this.isConnected = false;
            clearTimeout(connectionTimeout);
            console.error(
              `Connection error to DB2 at ${this.hostName}:${this.port}:`,
              err,
            );
            reject(err);
          };

          if (this.useSSL) {
            console.log('Using SSL for connection');
            const completeCertChain = readFileSync(
              './certs/db2-complete-chain.crt',
            );

            this.socket = tlsConnect(
              {
                port: this.port,
                host: this.hostName,
                rejectUnauthorized: true, // Ensure unauthorized certificates are rejected
                ca: completeCertChain, // Use the complete certificate chain
                timeout: this.connectionTimeout,
                // enableTrace: true,
              },
              async () => {
                clearTimeout(connectionTimeout);
                if (
                  this.socket instanceof TLSSocket &&
                  this.socket.authorized
                ) {
                  this.isConnected = true;
                  console.log(
                    `Socket connected securely at ${this.hostName}:${this.port}`,
                  );
                  try {
                    await this.authenticate();
                    resolve(); // Connection successful
                  } catch (authErr) {
                    console.error('Authentication failed:', authErr);
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
            console.log('Using plain TCP for connection');
            this.socket = new Socket();
            this.socket.connect(this.port, this.hostName, async () => {
              clearTimeout(connectionTimeout);
              this.isConnected = true;
              try {
                await this.authenticate();
                resolve(); // Connection successful
              } catch (authErr) {
                reject(authErr);
              }
            });
          }

          this.socket!.on('error', onConnectionError);
          this.socket!.on('timeout', () => {
            reject(
              new Error(
                `Connection to DB2 at ${this.hostName}:${this.port} timed out`,
              ),
            );
          });

          this.socket!.on('close', (hadError: boolean) => {
            if (hadError) {
              console.error(
                `Connection to DB2 at ${this.hostName}:${this.port} closed due to an error.`,
              );
            } else {
              console.log(
                `Connection to DB2 at ${this.hostName}:${this.port} closed gracefully.`,
              );
            }
            this.isConnected = false;
          });
        });
        break; // Break out of the loop if connection is successful
      } catch (error) {
        console.error(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt === retries) {
          throw new Error(
            'Maximum retry attempts reached. Unable to connect to DB2.',
          );
        }
        await this.delay(attempt * 1000); // Exponential backoff before retrying
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Create ACCSEC message (Access Security Request)
  private createACCSECMessage(): Buffer {
    const buffers: Buffer[] = [];

    // SECMEC (Security Mechanism) - We will use EUSRIDPWD, but this can be adjusted
    const secmecData = Buffer.alloc(2);
    secmecData.writeUInt16BE(DRDAConstants.SECMEC_EUSRIDPWD, 0); // Encrypted User ID and Password
    const secmecParameter = this.constructParameter(
      DRDAConstants.SECMEC,
      secmecData,
    );
    buffers.push(secmecParameter);

    // RDBNAM (Relational Database Name) - Required parameter for DB2
    const rdbnamData = Buffer.from(this.dbName, 'utf8');
    const rdbnamParameter = this.constructParameter(
      DRDAConstants.RDBNAM,
      rdbnamData,
    );
    buffers.push(rdbnamParameter);

    // Optional: EXTNAM (External Name) - This can identify the client application.
    // It's optional, but we add it for completeness.
    const extnamData = Buffer.from('MyApp', 'utf8'); // Replace 'MyApp' with your app name
    const extnamParameter = this.constructParameter(
      DRDAConstants.EXTNAM,
      extnamData,
    );
    buffers.push(extnamParameter);

    // MGRLVLLS (Manager Level List) - Specifies the supported manager levels
    const mgrlvllsData = this.constructMgrlvlls(); // This function constructs the list of supported managers
    buffers.push(mgrlvllsData);

    // Combine all parameters
    const parametersBuffer = Buffer.concat(buffers);

    // ACCSEC Object
    const accsecLength = 4 + parametersBuffer.length;
    const accsecBuffer = Buffer.alloc(4);
    accsecBuffer.writeUInt16BE(accsecLength, 0);
    accsecBuffer.writeUInt16BE(DRDAConstants.ACCSEC, 2);

    // Final ACCSEC object with parameters
    const accsecObject = Buffer.concat([accsecBuffer, parametersBuffer]);

    // DSS Header
    const totalLength = 6 + accsecObject.length;
    const dssHeader = Buffer.alloc(6);
    dssHeader.writeUInt16BE(totalLength, 0); // Length including header
    dssHeader.writeUInt8(0xd0, 2); // DSS Flags (0xD0 indicates request)
    dssHeader.writeUInt8(0x01, 3); // DSS Type (0x01 for RQSDSS)
    dssHeader.writeUInt16BE(this.nextCorrelationId(), 4); // Correlation ID

    // Final ACCSEC message with DSS header
    const message = Buffer.concat([dssHeader, accsecObject]);
    console.log('Constructed ACCSEC message:', message.toString('hex'));
    return message;
  }

  private createACCRDBMessage(): Buffer {
    const buffers: Buffer[] = [];

    // RDBNAM (Relational Database Name)
    const rdbnamEbcdic = Buffer.from(this.dbName, 'utf8');
    const rdbnamLength = 4 + rdbnamEbcdic.length;
    const rdbnamBuffer = Buffer.alloc(rdbnamLength);
    rdbnamBuffer.writeUInt16BE(rdbnamLength, 0);
    rdbnamBuffer.writeUInt16BE(DRDAConstants.RDBNAM, 2);
    rdbnamEbcdic.copy(rdbnamBuffer, 4);
    buffers.push(rdbnamBuffer);

    // Other required parameters can be added here following the DRDA specification

    // Combine all parameters
    const parametersBuffer = Buffer.concat(buffers);
    const accrdbLength = 4 + parametersBuffer.length;
    const accrdbBuffer = Buffer.alloc(4);
    accrdbBuffer.writeUInt16BE(accrdbLength, 0);
    accrdbBuffer.writeUInt16BE(DRDAConstants.ACCRDB, 2);

    // Final ACCRDB message
    const message = Buffer.concat([accrdbBuffer, parametersBuffer]);
    return message;
  }

  // Create SECCHK message (Security Check - includes encrypted and padded user and password)
  private createSECCHKMessage(): Buffer {
    const buffers: Buffer[] = [];

    // SECMEC (Security Mechanism)
    const secmecData = Buffer.alloc(2);
    secmecData.writeUInt16BE(DRDAConstants.SECMEC_EUSRIDPWD, 0);
    const secmecParameter = this.constructParameter(
      DRDAConstants.SECMEC,
      secmecData,
    );
    buffers.push(secmecParameter);

    // USRID (User ID)
    const userIdData = Buffer.from(this.userId, 'utf8');
    const userIdParameter = this.constructParameter(
      DRDAConstants.USRID,
      userIdData,
    );
    buffers.push(userIdParameter);

    // PASSWORD (encrypted)
    if (!this.serverPublicKey) {
      throw new Error('Server public key is missing for encryption');
    }

    const encryptedPassword = publicEncrypt(
      { key: this.serverPublicKey, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(this.password, 'utf8'),
    );

    const passwordParameter = this.constructParameter(
      DRDAConstants.PASSWORD,
      encryptedPassword,
    );
    buffers.push(passwordParameter);

    // Combine all parameters
    const parametersBuffer = Buffer.concat(buffers);

    // SECCHK Message
    const secchkLength = 4 + parametersBuffer.length;
    const secchkBuffer = Buffer.alloc(4);
    secchkBuffer.writeUInt16BE(secchkLength, 0);
    secchkBuffer.writeUInt16BE(DRDAConstants.SECCHK, 2);

    // Final SECCHK message
    const message = Buffer.concat([secchkBuffer, parametersBuffer]);
    console.log(
      'Constructed SECCHK message (encrypted):',
      message.toString('hex'),
    );
    return message;
  }

  // Close the TCP connection with error handling via callback
  public close(callback?: (err: Error | null) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.isConnected || !this.socket) {
        const message = 'Connection is already closed or not open.';
        console.warn(message);

        if (callback) callback(new Error(message)); // Use the callback to report the error if provided
        resolve(); // No need to close if already closed
        return;
      }

      console.log(
        `Closing connection to DB2 at ${this.hostName}:${this.port}...`,
      );

      // Listen for errors during socket closure
      this.socket!.once('error', (err) => {
        console.error('Error closing connection:', err);

        if (callback) callback(err); // Report the error using the callback
        reject(err); // Also reject the promise to allow promise-based error handling
      });

      // Listen for the close event and update the state accordingly
      this.socket!.once('close', () => {
        this.isConnected = false; // Set the state to disconnected
        console.log('DB2 connection closed.');

        if (callback) callback(null); // No error, so pass null to the callback
        resolve(); // Resolve the promise to indicate the operation was successful
      });

      // Initiate socket closing
      this.socket!.end();
    });
  }

  // General send method to send any buffer message with better logging and error handling
  async send(data: Buffer): Promise<void> {
    if (!this.isConnected || !this.socket) {
      throw new Error('Connection is not open.');
    }

    return new Promise((resolve, reject) => {
      // Attempt to write the data to the socket
      const success = this.socket!.write(data, (err: Error | null) => {
        if (err) {
          console.error(
            'Error occurred while sending data to the socket:',
            err.message,
          );
          reject(new Error(`Failed to send data: ${err.message}`));
        } else {
          console.log(`Data sent to DB2 at ${this.hostName}:${this.port}`);
          resolve(); // Message successfully sent
        }
      });

      // Handle the case where the socket's buffer becomes full
      if (!success) {
        console.log('Socket buffer full, waiting for drain event...');
        this.socket!.once('drain', () => {
          console.log('Socket buffer drained, continuing to send...');
          resolve(); // Resolve once the drain event is emitted
        });
      }
    });
  }

  // Add this query method to your Connection class
  public async query(
    query: string,
    paramsOrCallback?: any[] | ((err: Error | null, result?: any) => void),
    callback?: (err: Error | null, result?: any) => void,
  ): Promise<void> {
    let params: any[] = [];
    let cb: (err: Error | null, result?: any) => void;

    if (typeof paramsOrCallback === 'function') {
      cb = paramsOrCallback;
    } else {
      params = paramsOrCallback || [];
      cb = callback!;
    }

    try {
      // Check if the connection is alive before executing the query
      if (!this.isConnected) {
        console.log('Connection lost. Attempting to reconnect...');
        await this.retryConnection();
      }

      await this.sendSQL(query, params);
      const response = await this.receiveResponse();

      if (response.type === 'EXCSQLSET') {
        const result = (response as EXCSQLSETResponse).result;
        cb(null, result);
      } else {
        cb(new Error('Unexpected response type from query execution'));
      }
    } catch (err) {
      cb(err);
    }
  }

  // Example helper function to format the query with parameters
  private formatQuery(query: string, params: any[]): string {
    let formattedQuery = query;

    // Replace placeholders '?' with actual parameters, properly escaped
    params.forEach((param, index) => {
      const safeParam = this.escapeSQLParam(param);
      formattedQuery = formattedQuery.replace('?', safeParam);
    });

    return formattedQuery;
  }

  private escapeSQLParam(param: any): string {
    if (typeof param === 'string') {
      // Escape single quotes for strings
      return `'${param.replace(/'/g, "''")}'`;
    } else if (typeof param === 'number') {
      return param.toString();
    } else if (param === null) {
      return 'NULL';
    }
    // Add more type handling as needed
    return param;
  }
  // Send DRDA-encoded SQL request
  async sendSQL(query: string, params: any[]): Promise<void> {
    if (!this.isConnected) {
      console.log('Connection lost. Reconnecting...');
      await this.retryConnection();
    }

    const formattedQuery = this.formatQuery(query, params);
    const message = this.createDRDAMessage(formattedQuery);

    await this.send(message);
  }

  // Create a DRDA message for executing SQL
  private createDRDAMessage(sql: string): Buffer {
    const sqlBuffer = Buffer.from(sql, 'utf8');
    const headerBuffer = Buffer.alloc(10); // Adjust size according to DRDA protocol

    // Construct the DRDA packet:
    headerBuffer.writeUInt16BE(sqlBuffer.length + 10, 0); // Total message length
    headerBuffer.write('EXCSQLSET', 2, 8, 'ascii'); // DRDA operation type

    // Concatenate the header with the actual SQL query buffer
    return Buffer.concat([headerBuffer, sqlBuffer]);
  }

  async receiveResponse(retries = 3): Promise<DRDAResponseType> {
    if (!this.isConnected || !this.socket) {
      console.log('Connection lost. Reconnecting...');
      await this.retryConnection(retries);
    }

    return new Promise((resolve, reject) => {
      console.log('Waiting for data from DB2 server...');

      const responseTimeout = setTimeout(() => {
        const errorMessage =
          'No response received from DB2 server in a timely manner.';
        console.error(errorMessage);
        reject(new Error(errorMessage));
      }, 40000);

      const onData = (data: Buffer) => {
        clearTimeout(responseTimeout);
        console.log(`Received ${data.length} bytes of data from DB2 server.`);

        try {
          const header = this.parseDRDAHeader(data);
          const payload = this.parseDRDAPayload(data);
          console.log('Received DRDA payload:', payload);
          const response = this.decodeDRDAResponse(header);
          resolve(response);
        } catch (err) {
          console.error('Error decoding DRDA response: ', err);
          reject(err);
        } finally {
          this.socket?.removeListener('data', onData);
          this.socket?.removeListener('error', onError);
          this.socket?.removeListener('close', onClose);
        }
      };

      const onError = (err: Error) => {
        clearTimeout(responseTimeout);
        console.error('Error on socket during data reception:', err);
        reject(err);
        this.socket?.removeListener('data', onData);
        this.socket?.removeListener('error', onError);
        this.socket?.removeListener('close', onClose);
      };

      const onClose = (hadError: boolean) => {
        clearTimeout(responseTimeout);
        this.isConnected = false;
        if (hadError) {
          console.error(
            `Connection to DB2 at ${this.hostName}:${this.port} closed due to an error.`,
          );
        } else {
          console.log(
            `Connection to DB2 at ${this.hostName}:${this.port} closed gracefully.`,
          );
        }
        this.socket?.removeListener('data', onData);
        this.socket?.removeListener('error', onError);
        this.socket?.removeListener('close', onClose);
      };

      this.socket!.on('data', onData);
      this.socket!.on('error', onError);
      this.socket!.on('close', onClose);
    });
  }

  // Decode DRDA response
  private decodeDRDAResponse(header: DRDAHeader): DRDAResponseType {
    console.log('Decoding DRDA response...');

    const { payload } = header;
    let offset = 0;
    const parameters: any = {};
    let success = true;

    // Ensure payload has at least 4 bytes for message length and code point
    if (offset + 4 > payload.length) {
      throw new Error('Invalid DRDA response payload.');
    }

    // Read the main message code point
    const messageLength = payload.readUInt16BE(offset);
    const messageCodePoint = payload.readUInt16BE(offset + 2);
    offset += 4; // Move past the code point header

    const responseType = this.mapCodePointToResponseType(messageCodePoint);

    console.log(
      `Main code point: 0x${messageCodePoint.toString(16)} (${responseType}), Length: ${messageLength}`,
    );

    const endOfMessage = offset + messageLength - 4; // Subtract the code point header length

    while (offset + 4 <= endOfMessage) {
      if (offset + 4 > payload.length) {
        throw new Error(
          'Reached the end of the payload unexpectedly while parsing parameters.',
        );
      }
      const paramLength = payload.readUInt16BE(offset);
      const paramCodePoint = payload.readUInt16BE(offset + 2);
      const data = Buffer.from(
        payload.subarray(offset + 4, offset + paramLength),
      );

      console.log(
        `Parameter code point: 0x${paramCodePoint.toString(16)}, Length: ${paramLength}`,
      );

      console.log(
        `Parameter code point: 0x${paramCodePoint.toString(16)}, Length: ${paramLength}`,
      );

      switch (paramCodePoint) {
        case DRDAConstants.SVRCOD:
          const svrcod = data.readInt16BE(0);
          parameters['SVRCOD'] = svrcod;
          if (svrcod > 0) {
            success = false;
            console.error(`Server returned error with SVRCOD: ${svrcod}`);
          }
          break;

        case 0xf289: // Handle the ODBC error
          console.warn('ODBC Error: Recordset is read-only (0xF289).');
          parameters['ODBC_ERROR'] = 'READ_ONLY_RECORDSET';
          success = false;
          break;

        default:
          console.warn(
            `Unknown parameter code point: 0x${paramCodePoint.toString(16)}, Length: ${paramLength}, Raw Data: ${data.toString('hex')}`,
          );
          break;
      }

      offset += 4 + paramLength; // Move offset past the parameter header and data
    }

    return {
      length: header.length,
      type: responseType,
      payload: header.payload,
      success,
      parameters,
    };
  }

  // Parse the DRDA header
  private parseDRDAHeader(data: Buffer): DRDAHeader {
    if (data.length < 6) {
      throw new Error('Invalid DRDA response header.');
    }

    const length = data.readUInt16BE(0); // Length
    const dssFlags = data.readUInt8(2); // DSS Flags
    const dssType = data.readUInt8(3); // DSS Type
    const correlationId = data.readUInt16BE(4); // Correlation ID

    // Check if DSSFMT is set (bit 7 of dssFlags)
    const dssfmt = (dssFlags & 0x80) !== 0; // DSSFMT is bit 7 (MSB)

    let headerLength = 6;
    if (dssfmt) {
      if (data.length < 10) {
        throw new Error('Invalid DRDA response header (extended format).');
      }
      headerLength = 10;
    }

    // The payload starts after the DSS header
    const payload = Uint8Array.prototype.slice.call(data, headerLength);

    return { length, correlationId, dssFlags, dssType, payload };
  }

  parseDRDAPayload(payload: Buffer): any {
    let offset = 0;

    const result: any = {};

    // Parse the first field: assuming it's a length field (2 bytes)
    const length = payload.readUInt16BE(offset);
    offset += 2;
    result.length = length;

    // Parse the code point: assuming it's a 2-byte code point
    const codePoint = payload.readUInt16BE(offset);
    offset += 2;
    result.codePoint = `0x${codePoint.toString(16)}`;

    // Example mapping of code points to meaningful names
    const codePointMap = {
      0x115e: 'EXTNAM', // External Name
      0xf289: 'ODBC_ERROR', // ODBC Error
      // Add other known code points here
    };

    result.messageType = codePointMap[codePoint] || 'UNKNOWN';

    // Now we parse the rest of the payload based on the message type
    if (result.messageType === 'EXTNAM') {
      // Assume that EXTNAM has a string following the code point (example)
      const extnamLength = payload.readUInt16BE(offset);
      offset += 2;
      const extnamValue = payload
        .slice(offset, offset + extnamLength)
        .toString('utf8');
      offset += extnamLength;
      result.extnam = extnamValue;
    }

    if (result.messageType === 'ODBC_ERROR') {
      // Parse ODBC error details
      const errorCode = payload.readUInt16BE(offset);
      offset += 2;
      result.errorCode = errorCode;
      result.errorMessage = 'Recordset is read-only'; // Based on the code point
    }

    // Handle other known message types similarly

    return result;
  }

  private mapCodePointToResponseType(codePoint: number): string {
    const responseType = DRDAConstants[codePoint];
    if (responseType !== undefined) {
      return responseType;
    } else {
      console.warn(`Unknown code point: 0x${codePoint.toString(16)}`);
      return 'UNKNOWN';
    }
  }
}
