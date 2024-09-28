import { Socket } from 'net';
import { connect as tlsConnect, TLSSocket } from 'tls';
import {
  CHNRQSDSSResponse,
  ColumnMetadata,
  DRDAHeader,
  DRDAResponseType,
  EXCSQLSETResponse,
  Row,
} from '../interfaces/drda.interface';
import { DRDAConstants } from '../constants/drda.constants';
import { constants, publicEncrypt } from 'crypto';
import { PreparedStatement } from './PreparedStatement';
import { Logger } from '../utils';

const DRDA_CODEPOINT_MAP: { [key: number]: string } = {
  [DRDAConstants.EXCSAT]: 'EXCSAT',
  [DRDAConstants.EXTNAM]: 'EXTNAM',
  [DRDAConstants.CHRNRQSDSS]: 'CHNRQSDSS',
  [DRDAConstants.EXCSATRD]: 'EXCSATRD',
  [DRDAConstants.ACCSECRM]: 'ACCSECRM',
  [DRDAConstants.SECCHKRM]: 'SECCHKRM',
  [DRDAConstants.ACCRDBRM]: 'ACCRDBRM',
};

export class Connection {
  private socket: Socket | TLSSocket | null = null;
  private connectionString: string;
  private connectionTimeout = 10000;
  private isConnected = false;
  private serverPublicKey: Buffer | null = null;

  private dbName: string; // this value is a number: 0
  private hostName: string;
  private port: number;
  private userId: string;
  private password: string;
  private useSSL: boolean;
  private correlationId = 1;

  private rsmd: ColumnMetadata[] = [];
  private receiveBuffer: Buffer = Buffer.alloc(0);
  private responseResolvers: Array<(response: DRDAResponseType) => void> = [];
  private responseRejectors: Array<(error: Error) => void> = [];

  private logger = new Logger(Connection.name);

  constructor(connectionString: string, timeout?: number) {
    this.connectionString = connectionString;
    this.connectionTimeout = timeout || 10000;
    this.useSSL = false;
    this.parseConnectionString();
    this.setupSocketListeners();
  }

  private setupSocketListeners(): void {
    if (this.socket) {
      this.socket.on('data', (data: Buffer) => this.handleData(data));
      this.socket.on('error', (err: Error) => this.handleError(err));
      this.socket.on('close', (hadError: boolean) =>
        this.handleClose(hadError),
      );
    }
  }

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
        const header = this.parseDRDAHeader(messageBuffer);
        const payload = this.parseDRDAPayload(header.payload);
        this.logger.info('Received DRDA payload:', payload);
        const response = this.decodeDRDAResponse(header);

        if (this.responseResolvers.length > 0) {
          const resolve = this.responseResolvers.shift()!;
          resolve(response);
          this.responseRejectors.shift();
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
          this.responseResolvers.shift();
        }
      }
    }
  }

  private handleError(err: Error): void {
    this.logger.error('Socket error:', err);
    // Handle socket errors

    // Close the socket to prevent further issues
    if (this.socket) {
      this.socket.destroy();
      this.isConnected = false;
    } else {
      this.logger.error('Socket is not available to close.');

      // Handle the error appropriately
      throw new Error('Socket error occurred.');
    }
  }

  private handleClose(hadError: boolean): void {
    if (hadError) {
      this.logger.error('Socket closed due to an error.');
    } else {
      this.logger.info('Socket closed gracefully.');
    }
    this.isConnected = false;
    // Handle socket closure
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

  // Asynchronous prepare method
  public async prepare(sql: string): Promise<PreparedStatement> {
    await this.sendPrepareRequest(sql);
    const stmtHandle = await this.sendPrepareRequest(sql);
    const stmt = new PreparedStatement(this, sql, stmtHandle);
    return stmt;
  }

  public async sendExecuteRequest(
    statementHandle: string,
    params: any[],
  ): Promise<void> {
    const message = this.createExecuteSQLMessage(statementHandle, params);
    await this.send(message);
  }

  private createExecuteSQLMessage(
    statementHandle: string,
    params: any[],
  ): Buffer {
    // Construct parameters
    const buffers: Buffer[] = [];

    // Statement Handle
    const stmtHandleParam = this.constructParameter(
      DRDAConstants.STMTHDL,
      Buffer.from(statementHandle, 'utf8'),
    );
    buffers.push(stmtHandleParam);

    // Parameters (similar to how you handle SQL parameters)
    params.forEach((param) => {
      const paramValue = Buffer.from(this.escapeSQLParam(param), 'utf8');
      const paramBuffer = this.constructParameter(
        DRDAConstants.PARAM, // Define PARAM in DRDAConstants
        paramValue,
      );
      buffers.push(paramBuffer);
    });

    const parametersBuffer = Buffer.concat(buffers);

    // EXCSQLEXPRQ Object
    const excsqlexprqLength = 4 + parametersBuffer.length;
    const excsqlexprqBuffer = Buffer.alloc(4);
    excsqlexprqBuffer.writeUInt16BE(excsqlexprqLength, 0);
    excsqlexprqBuffer.writeUInt16BE(DRDAConstants.EXCSQLEXPRQ, 2); // Define EXCSQLEXPRQ in DRDAConstants

    const excsqlexprqObject = Buffer.concat([
      excsqlexprqBuffer,
      parametersBuffer,
    ]);

    // DSS Header
    const totalLength = 6 + excsqlexprqObject.length;
    const dssHeader = Buffer.alloc(6);
    dssHeader.writeUInt16BE(totalLength, 0);
    dssHeader.writeUInt8(0xd0, 2);
    dssHeader.writeUInt8(0x01, 3);
    dssHeader.writeUInt16BE(this.nextCorrelationId(), 4);

    // Final EXCSQLEXPRQ message with DSS header
    const message = Buffer.concat([dssHeader, excsqlexprqObject]);
    this.logger.info(
      'Constructed EXCSQLEXPRQ message:',
      message.toString('hex'),
    );

    return message;
  }

  private async sendPrepareRequest(sql: string): Promise<string> {
    // Construct the EXCSQLPREP message
    const message = this.createEXCSQLPREPMessage(sql);
    await this.send(message);

    // Receive and parse the response
    const response = await this.receiveResponse();

    if (response.type !== 'EXCSQLPREPRM') {
      throw new Error(`Unexpected response type: ${response.type}`);
    }

    // Extract the statement handle from the response
    const stmtHandle = this.extractStatementHandle(response.payload);
    if (!stmtHandle) {
      throw new Error(
        'Failed to retrieve statement handle from EXCSQLPREPRM response',
      );
    }

    return stmtHandle;
  }

  private extractStatementHandle(payload: Buffer): string | null {
    let offset = 0;

    // Iterate through parameters to find the statement handle
    while (offset + 4 <= payload.length) {
      const paramLength = payload.readUInt16BE(offset);
      const paramCodePoint = payload.readUInt16BE(offset + 2);
      const data = payload.slice(offset + 4, offset + paramLength);

      if (paramCodePoint === DRDAConstants.STMTHDL) {
        // Assume STMTHDL is defined
        const stmtHandle = data.toString('utf8').trim();
        return stmtHandle;
      }

      offset += paramLength;
    }

    return null;
  }

  public processExecuteResponse(payload: Buffer): EXCSQLSETResponse {
    this.logger.info('Processing EXCSQLSETResponse...');
    let offset = 0;
    const response: EXCSQLSETResponse = {
      length: payload.length,
      type: 'EXCSQLSET',
      payload: payload,
      success: true,
      parameters: {},
      result: [],
    };

    while (offset + 4 <= payload.length) {
      const paramLength = payload.readUInt16BE(offset);
      const paramCodePoint = payload.readUInt16BE(offset + 2);
      const paramData = payload.slice(offset + 4, offset + paramLength);

      this.logger.info(
        `Parameter Code Point: 0x${paramCodePoint.toString(16)}, Length: ${paramLength}`,
      );

      switch (paramCodePoint) {
        case DRDAConstants.SVRCOD:
          const svrcod = paramData.readUInt16BE(0);
          response.parameters['SVRCOD'] = svrcod;
          if (svrcod !== 0) {
            response.success = false;
            this.logger.error(`Server returned error code: ${svrcod}`);
          }
          break;

        case DRDAConstants.RSMD:
          const rsmd = this.parseResultSetMetadata(paramData);
          response.parameters['RSMD'] = rsmd;
          break;

        case DRDAConstants.QRYDTA:
          const rows = this.parseQueryData(paramData);
          response.result.push(...rows);
          break;

        // Handle other code points as needed
        default:
          this.logger.warn(
            `Unknown parameter code point: 0x${paramCodePoint.toString(16)}, Data: ${paramData.toString('hex')}`,
          );
          break;
      }

      offset += paramLength;
    }

    this.logger.info('EXCSQLSETResponse processed:', response);
    return response;
  }

  private parseResultSetMetadata(data: Buffer): ColumnMetadata[] {
    const columns: ColumnMetadata[] = [];
    let offset = 0;

    while (offset + 4 <= data.length) {
      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      const paramData = data.slice(offset + 4, offset + paramLength);

      switch (paramCodePoint) {
        case DRDAConstants.CMDCOLNAM: // Column Name
          const columnName = paramData.toString('utf8').trim();
          columns.push({
            name: columnName,
            dataType: 'UNKNOWN', // Placeholder, to be updated
            length: 0, // Placeholder, to be updated
            nullable: true, // Placeholder, to be updated
          });
          break;

        case DRDAConstants.CMDCOLDAT: // Column Data Type
          if (columns.length === 0) {
            this.logger.warn('CMDCOLDAT received before any CMDCOLNAM');
            break;
          }
          const dataType = paramData.toString('utf8').trim();
          columns[columns.length - 1].dataType = dataType;
          break;

        case DRDAConstants.CMDCOLLEN: // Column Length
          if (columns.length === 0) {
            this.logger.warn('CMDCOLLEN received before any CMDCOLNAM');
            break;
          }
          const length = paramData.readUInt16BE(0);
          columns[columns.length - 1].length = length;
          break;

        case DRDAConstants.CMDCOLNUL: // Column Nullable
          if (columns.length === 0) {
            this.logger.warn('CMDCOLNUL received before any CMDCOLNAM');
            break;
          }
          const nullable = paramData.readUInt8(0) === 1;
          columns[columns.length - 1].nullable = nullable;
          break;

        // Handle other RSMD parameters as needed

        default:
          this.logger.warn(
            `Unknown RSMD parameter code point: 0x${paramCodePoint.toString(16)}`,
          );
          break;
      }

      offset += paramLength;
    }

    this.logger.info('Parsed RSMD:', columns);
    return columns;
  }

  private parseQueryData(data: Buffer): Row[] {
    const rows: Row[] = [];
    let offset = 0;

    while (offset + 4 <= data.length) {
      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      const paramData = data.slice(offset + 4, offset + paramLength);

      if (paramCodePoint === DRDAConstants.QRYDTA) {
        // Query Data
        const row = this.parseRowData(paramData);
        rows.push(row);
      }

      // Handle other code points if necessary

      offset += paramLength;
    }

    this.logger.info('Parsed Query Data:', rows);
    return rows;
  }

  private parseRowData(data: Buffer): Row {
    const row: Row = {};
    let offset = 0;
    let columnIndex = 0;

    while (offset + 4 <= data.length) {
      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      const paramData = data.slice(offset + 4, offset + paramLength);

      if (paramCodePoint === DRDAConstants.CMDCOLDAT) {
        // Column Data
        const columnMetadata = this.rsmd[columnIndex];
        if (!columnMetadata) {
          this.logger.warn(`No metadata found for column index ${columnIndex}`);
        }

        let columnValue: any = null;

        // Parse based on data type
        switch (columnMetadata?.dataType.toUpperCase()) {
          case 'INTEGER':
            columnValue = paramData.readInt32BE(0); // Adjust based on actual encoding
            break;
          case 'VARCHAR':
          case 'CHAR':
            columnValue = paramData.toString('utf8').trim();
            break;
          case 'DATE':
            columnValue = this.parseDRDADate(paramData);
            break;
          // Handle other data types as needed
          default:
            columnValue = paramData.toString('utf8').trim();
            break;
        }

        if (columnMetadata) {
          row[columnMetadata.name] = columnValue;
        } else {
          row[`Column${columnIndex + 1}`] = columnValue;
        }

        columnIndex++;
      }

      // Handle other code points as needed

      offset += paramLength;
    }

    this.logger.info('Parsed Row Data:', row);
    return row;
  }

  private parseDRDADate(data: Buffer): Date {
    // Implement date parsing based on DRDA date format
    // Placeholder: assume YYYYMMDD as ASCII
    const dateStr = data.toString('utf8').trim();
    const year = parseInt(dateStr.substr(0, 4), 10);
    const month = parseInt(dateStr.substr(4, 2), 10) - 1; // Months are 0-based in JS
    const day = parseInt(dateStr.substr(6, 2), 10);
    return new Date(year, month, day);
  }

  private createEXCSQLPREPMessage(sql: string): Buffer {
    const sqlBuffer = Buffer.from(sql, 'utf8');

    // Construct the EXCSQLPREP parameters
    const buffers: Buffer[] = [];

    // SQL Statement
    const sqlStmtParam = this.constructParameter(
      DRDAConstants.EXCSQLPREP, // Code point for EXCSQLPREP
      sqlBuffer,
    );
    buffers.push(sqlStmtParam);

    // Combine parameters
    const parametersBuffer = Buffer.concat(buffers);

    // EXCSQLPREP Object
    const excsqlprepLength = 4 + parametersBuffer.length;
    const excsqlprepBuffer = Buffer.alloc(4);
    excsqlprepBuffer.writeUInt16BE(excsqlprepLength, 0);
    excsqlprepBuffer.writeUInt16BE(DRDAConstants.EXCSQLPREP, 2);

    const excsqlprepObject = Buffer.concat([
      excsqlprepBuffer,
      parametersBuffer,
    ]);

    // DSS Header
    const totalLength = 6 + excsqlprepObject.length;
    const dssHeader = Buffer.alloc(6);
    dssHeader.writeUInt16BE(totalLength, 0); // Length including header
    dssHeader.writeUInt8(0xd0, 2); // DSS Flags (0xD0 indicates request)
    dssHeader.writeUInt8(0x01, 3); // DSS Type (0x01 for RQSDSS)
    dssHeader.writeUInt16BE(this.nextCorrelationId(), 4); // Correlation ID

    // Final EXCSQLPREP message with DSS header
    const message = Buffer.concat([dssHeader, excsqlprepObject]);
    this.logger.info(
      'Constructed EXCSQLPREP message:',
      message.toString('hex'),
    );

    return message;
  }

  // Open the TCP connection (supports SSL)
  public async open(): Promise<void> {
    if (this.isConnected) {
      this.logger.info(
        `Already connected to DB2 at ${this.hostName}:${this.port}.`,
      );
      return; // Skip re-opening if already connected
    }

    try {
      // Use the existing retryConnection method
      await this.retryConnection(3); // You can adjust the number of retries if needed
    } catch (error) {
      this.logger.error(
        `Failed to connect to DB2 after retries: ${error.message}`,
      );
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
    this.logger.info(`Authenticating as user ${this.userId}...`);

    try {
      // Step 1: Send EXCSAT message
      const excsatMessage = this.createEXCSATMessage();
      this.logger.info('Sending EXCSAT message...');
      await this.send(excsatMessage);

      // Wait for response
      const response = await this.receiveResponse();

      if (response.type === DRDAConstants.CHRNRQSDSS) {
        this.logger.info('Received CHNRQSDSS response.');

        // Extract parameters from CHNRQSDSS
        const { EXCSATRD, EXTNAM, SVRCOD } = response.parameters;

        if (SVRCOD && SVRCOD !== 0) {
          throw new Error(`Server returned error code: ${SVRCOD}`);
        }

        if (EXCSATRD && EXCSATRD.serverPublicKey) {
          this.serverPublicKey = EXCSATRD.serverPublicKey;
          this.logger.info('Server public key acquired.');
        } else {
          this.logger.warn('EXCSATRD not found in CHNRQSDSS response.');
        }

        if (EXTNAM && EXTNAM.extnam) {
          this.logger.info(`Received EXTNAM: ${EXTNAM.extnam}`);
          // Handle EXTNAM as needed. It might require additional steps or configurations.
          // For now, we'll proceed assuming no additional action is needed.
        }

        // Step 2: Send ACCSEC message
        const accsecMessage = this.createACCSECMessage();
        this.logger.info('Sending ACCSEC message...');
        await this.send(accsecMessage);

        // Wait for ACCSECRM response
        const accsecResponse = await this.receiveResponse();

        if (accsecResponse.type === DRDAConstants.ACCSECRM) {
          const svrcod = this.extractSVRCOD(accsecResponse.payload);
          this.logger.info(`ACCSECRM SVRCOD received: ${svrcod}`);

          if (svrcod !== 0) {
            throw new Error(`Server returned error code: ${svrcod}`);
          }
        } else {
          throw new Error('Unexpected response to ACCSEC message');
        }

        // Step 3: Send SECCHK message with encrypted credentials
        const secchkMessage = this.createSECCHKMessage();
        this.logger.info('Sending SECCHK message...');
        await this.send(secchkMessage);

        // Wait for SECCHKRM response
        const secchkResponse = await this.receiveResponse();

        if (secchkResponse.type === DRDAConstants.SECCHKRM) {
          const svrcod = this.extractSVRCOD(secchkResponse.payload);
          this.logger.info(`SECCHKRM SVRCOD received: ${svrcod}`);

          if (svrcod !== 0) {
            throw new Error(`Security check failed with code: ${svrcod}`);
          }
        } else {
          throw new Error('Unexpected response to SECCHK message');
        }

        // Step 4: Send ACCRDB message
        const accrdbMessage = this.createACCRDBMessage();
        this.logger.info('Sending ACCRDB message...');
        await this.send(accrdbMessage);

        // Wait for ACCRDBRM response
        const accrdbResponse = await this.receiveResponse();

        if (accrdbResponse.type === DRDAConstants.ACCRDBRM) {
          const svrcod = this.extractSVRCOD(accrdbResponse.payload);
          this.logger.info(`ACCRDBRM SVRCOD received: ${svrcod}`);

          if (svrcod !== 0) {
            throw new Error(`Access RDB failed with code: ${svrcod}`);
          }
        } else {
          throw new Error('Unexpected response to ACCRDB message');
        }

        this.logger.info('Authentication successful for user', this.userId);
      } else {
        throw new Error(`Unexpected response type: ${response.type}`);
      }
    } catch (error) {
      this.logger.error('Error during authentication:', error);
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

    // // EXTNAM (External Name)
    // const extnamData = Buffer.from('MyApp', 'utf8');
    // const extnamParameter = this.constructParameter(
    //   DRDAConstants.EXTNAM,
    //   extnamData,
    // );
    // buffers.push(extnamParameter);

    // SRVNAM (Server Name)
    const srvnamData = Buffer.from(this.dbName, 'utf8');
    const srvnamParameter = this.constructParameter(
      DRDAConstants.SRVNAM,
      srvnamData,
    );
    buffers.push(srvnamParameter);

    // MGRLVLLS (Manager Level List)
    const mgrlvllsData = this.constructMgrlvlls();
    buffers.push(mgrlvllsData);

    // PRDID (Product ID)
    const prdidData = Buffer.from('JDB42', 'utf8');
    const prdidParameter = this.constructParameter(
      DRDAConstants.PRDID,
      prdidData,
    );
    buffers.push(prdidParameter);

    // SRVRLSLV (Server Release Level)
    const srvrlslvData = Buffer.from('11.5', 'utf8');
    const srvrlslvParameter = this.constructParameter(
      DRDAConstants.SRVRLSLV,
      srvrlslvData,
    );
    buffers.push(srvrlslvParameter);

    // Combine all parameters
    const parametersBuffer = Buffer.concat(buffers);

    // EXCSAT Object
    const excsatLength = 4 + parametersBuffer.length;
    const excsatBuffer = Buffer.alloc(4);
    excsatBuffer.writeUInt16BE(excsatLength, 0); // Length
    excsatBuffer.writeUInt16BE(DRDAConstants.EXCSAT, 2); // Code Point (0x1041)

    const excsatObject = Buffer.concat([excsatBuffer, parametersBuffer]);

    // DSS Header
    const totalLength = 6 + excsatObject.length;
    const dssHeader = Buffer.alloc(6);
    dssHeader.writeUInt16BE(totalLength, 0); // Total Length including DSS Header
    dssHeader.writeUInt8(0xd0, 2); // DSS Flags (0xD0 indicates request)
    dssHeader.writeUInt8(0x01, 3); // DSS Type (0x01 for RQSDSS)
    dssHeader.writeUInt16BE(this.nextCorrelationId(), 4); // Correlation ID

    // Final EXCSAT message with DSS header
    const message = Buffer.concat([dssHeader, excsatObject]);
    this.logger.info(`Constructed EXCSAT message: ${message.toString('hex')}`);

    // **Corrected Debugging Check**
    if (message.slice(8, 10).toString('hex') !== '1041') {
      this.logger.error(
        `EXCSAT code point mismatch: Expected 1041, Found ${message
          .slice(8, 10)
          .toString('hex')}`,
      );
    } else {
      this.logger.info('EXCSAT message constructed correctly.');
    }

    this.logger.info(`EXCSAT Message Breakdown:
      Total Length: ${totalLength} (0x${totalLength.toString(16)})
      DSS Flags: 0x${dssHeader[2].toString(16)}
      DSS Type: 0x${dssHeader[3].toString(16)}
      Correlation ID: ${this.nextCorrelationId()}
      EXCSAT Length: ${excsatLength} (0x${excsatLength.toString(16)})
      EXCSAT Code Point: 0x${excsatBuffer.readUInt16BE(2).toString(16)}
      Parameters: ${parametersBuffer.toString('hex')}
    `);

    return message;
  }

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
                  this.isConnected = true;
                  this.logger.info(
                    `Socket connected securely at ${this.hostName}:${this.port}`,
                  );
                  try {
                    await this.authenticate();
                    resolve(); // Connection successful
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
              this.logger.error(
                `Connection to DB2 at ${this.hostName}:${this.port} closed due to an error.`,
              );
            } else {
              this.logger.info(
                `Connection to DB2 at ${this.hostName}:${this.port} closed gracefully.`,
              );
            }
            this.isConnected = false;
          });
        });
        break; // Break out of the loop if connection is successful
      } catch (error) {
        this.logger.error(`Attempt ${attempt} failed: ${error.message}`);
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
    secmecData.writeUInt16BE(DRDAConstants.SECMEC_USRIDPWD, 0);
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
    this.logger.info('Constructed ACCSEC message:', message.toString('hex'));
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
    this.logger.info(
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
        this.logger.warn(message);

        if (callback) callback(new Error(message)); // Use the callback to report the error if provided
        resolve(); // No need to close if already closed
        return;
      }

      this.logger.info(
        `Closing connection to DB2 at ${this.hostName}:${this.port}...`,
      );

      // Listen for errors during socket closure
      this.socket!.once('error', (err) => {
        this.logger.error('Error closing connection:', err);

        if (callback) callback(err); // Report the error using the callback
        reject(err); // Also reject the promise to allow promise-based error handling
      });

      // Listen for the close event and update the state accordingly
      this.socket!.once('close', () => {
        this.isConnected = false; // Set the state to disconnected
        this.logger.info('DB2 connection closed.');

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
          this.logger.error(
            'Error occurred while sending data to the socket:',
            err.message,
          );
          reject(new Error(`Failed to send data: ${err.message}`));
        } else {
          this.logger.info(`Data sent to DB2 at ${this.hostName}:${this.port}`);
          resolve(); // Message successfully sent
        }
      });

      // Handle the case where the socket's buffer becomes full
      if (!success) {
        this.logger.info('Socket buffer full, waiting for drain event...');
        this.socket!.once('drain', () => {
          this.logger.info('Socket buffer drained, continuing to send...');
          resolve(); // Resolve once the drain event is emitted
        });
      }
    });
  }

  public async sendCloseStatementRequest(
    statementHandle: string,
  ): Promise<void> {
    const message = this.createCloseStatementMessage(statementHandle);
    await this.send(message);
  }

  private createCloseStatementMessage(statementHandle: string): Buffer {
    // Construct the CLOSE Statement message
    const buffers: Buffer[] = [];

    // Statement Handle
    const stmtHandleParam = this.constructParameter(
      DRDAConstants.STMTHDL,
      Buffer.from(statementHandle, 'utf8'),
    );
    buffers.push(stmtHandleParam);

    const parametersBuffer = Buffer.concat(buffers);

    // CLOSE Statement Object
    const closeStmtLength = 4 + parametersBuffer.length;
    const closeStmtBuffer = Buffer.alloc(4);
    closeStmtBuffer.writeUInt16BE(closeStmtLength, 0);
    closeStmtBuffer.writeUInt16BE(DRDAConstants.CLOSESTM, 2); // Define CLOSESTM in DRDAConstants

    const closeStmtObject = Buffer.concat([closeStmtBuffer, parametersBuffer]);

    // DSS Header
    const totalLength = 6 + closeStmtObject.length;
    const dssHeader = Buffer.alloc(6);
    dssHeader.writeUInt16BE(totalLength, 0);
    dssHeader.writeUInt8(0xd0, 2);
    dssHeader.writeUInt8(0x01, 3);
    dssHeader.writeUInt16BE(this.nextCorrelationId(), 4);

    // Final CLOSESTM message with DSS header
    const message = Buffer.concat([dssHeader, closeStmtObject]);
    this.logger.info('Constructed CLOSESTM message:', message.toString('hex'));

    return message;
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
        this.logger.info('Connection lost. Attempting to reconnect...');
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
      this.logger.info('Connection lost. Reconnecting...');
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
      this.logger.info('Connection lost. Reconnecting...');
      await this.retryConnection(retries);
    }

    return new Promise((resolve, reject) => {
      this.responseResolvers.push(resolve);
      this.responseRejectors.push(reject);
      this.logger.info('Waiting for data from DB2 server...');

      const responseTimeout = setTimeout(() => {
        const errorMessage =
          'No response received from DB2 server in a timely manner.';
        this.logger.error(errorMessage);
        reject(new Error(errorMessage));
      }, 40000);

      const onData = (data: Buffer) => {
        clearTimeout(responseTimeout);
        this.logger.info(
          `Received ${data.length} bytes of data from DB2 server.`,
        );

        try {
          const header = this.parseDRDAHeader(data);
          const payload = this.parseDRDAPayload(data);
          this.logger.info('Received DRDA payload:', payload);
          const response = this.decodeDRDAResponse(header);
          resolve(response);
        } catch (err) {
          this.logger.error('Error decoding DRDA response: ', err);
          reject(err);
        } finally {
          this.socket?.removeListener('data', onData);
          this.socket?.removeListener('error', onError);
          this.socket?.removeListener('close', onClose);
        }
      };

      const onError = (err: Error) => {
        clearTimeout(responseTimeout);
        this.logger.error('Error on socket during data reception:', err);
        reject(err);
        this.socket?.removeListener('data', onData);
        this.socket?.removeListener('error', onError);
        this.socket?.removeListener('close', onClose);
      };

      const onClose = (hadError: boolean) => {
        clearTimeout(responseTimeout);
        this.isConnected = false;
        if (hadError) {
          this.logger.error(
            `Connection to DB2 at ${this.hostName}:${this.port} closed due to an error.`,
          );
        } else {
          this.logger.info(
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
    this.logger.info('Decoding DRDA response...');

    const { payload } = header;
    let offset = 0;
    const parameters: any = {};
    let success = true;

    if (payload.length < 4) {
      this.logger.error('Payload too short:', payload.length);
      throw new Error('Invalid DRDA response payload.');
    }

    const messageLength = payload.readUInt16BE(offset);
    const messageCodePoint = payload.readUInt16BE(offset + 2);
    offset += 4;

    const responseType = this.mapCodePointToResponseType(messageCodePoint);

    this.logger.info(
      `Main code point: 0x${messageCodePoint.toString(16)} (${responseType}), Length: ${messageLength}`,
    );

    // Handle CHNRQSDSS by processing each chained message
    if (responseType === 'CHNRQSDSS') {
      this.logger.info('Handling CHNRQSDSS message...');
      // Process the chained messages within the payload
      while (offset < payload.length) {
        if (offset + 4 > payload.length) {
          throw new Error('Incomplete parameter in payload.');
        }

        const paramLength = payload.readUInt16BE(offset);
        const paramCodePoint = payload.readUInt16BE(offset + 2);
        const data = payload.slice(offset + 4, offset + paramLength);

        this.logger.info(
          `Chained Parameter code point: 0x${paramCodePoint.toString(16)}, Length: ${paramLength}`,
        );

        switch (paramCodePoint) {
          case DRDAConstants.EXCSATRD:
            const serverPublicKey = this.extractServerPublicKey(data);
            parameters['EXCSATRD'] = { serverPublicKey };
            this.serverPublicKey = serverPublicKey;
            this.logger.info('Extracted server public key.');
            break;

          case DRDAConstants.EXTNAM:
            const extnam = this.parseEXTNAM(data);
            parameters['EXTNAM'] = { extnam };
            this.logger.info(`Received EXTNAM: ${extnam}`);
            break;

          case DRDAConstants.ODBC_ERROR:
            const svrcod = data.readInt16BE(0);
            parameters['SVRCOD'] = svrcod;
            success = false;
            this.logger.error(
              `Server returned ODBC error with SVRCOD: ${svrcod}`,
            );
            break;

          // Handle other code points as needed

          default:
            this.logger.warn(
              `Unknown chained parameter code point: 0x${paramCodePoint.toString(
                16,
              )}, Length: ${paramLength}, Raw Data: ${data.toString('hex')}`,
            );
            break;
        }

        offset += paramLength;
      }

      return {
        length: header.length,
        type: responseType,
        payload: header.payload,
        success,
        parameters,
      };
    }

    // Handle other response types as before
    return {
      length: header.length,
      type: responseType,
      payload: header.payload,
      success,
      parameters,
    };
  }

  // Helper method to parse EXTNAM
  private parseEXTNAM(data: Buffer): string {
    // Assuming EXTNAM contains a null-terminated string
    return data.toString('utf8').replace(/\x00/g, '');
  }

  private extractServerPublicKey(data: Buffer): Buffer {
    let offset = 0;
    let publicKey: Buffer | null = null;

    while (offset + 4 <= data.length) {
      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      const paramData = data.slice(offset + 4, offset + paramLength);

      if (paramCodePoint === DRDAConstants.SRVCLSNM_PK) {
        publicKey = paramData;
        break;
      }

      offset += 4 + paramLength;
    }

    if (!publicKey) {
      throw new Error('Server public key not found in EXCSATRD response.');
    }

    return publicKey;
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
      0xf2a1: 'SQLERRRM', // SQL Error
      0xd043: 'CHRNRQSDSS', // Chained Request
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

    if (result.messageType === 'SQLERRRM') {
      // Parse SQL error details
      const sqlErrorCode = payload.readUInt16BE(offset);
      offset += 2;
      result.sqlErrorCode = sqlErrorCode;
      result.sqlErrorMessage = 'Syntax error in SQL statement'; // Example message
    }

    if (result.messageType === 'CHRNRQSDSS') {
      // Parse chained request data
      const chainedData = this.parseChainedRequest(payload, offset);
      result.chainedData = chainedData;
    }
    return result;
  }

  private parseChainedRequest(
    payload: Buffer,
    offset: number,
  ): CHNRQSDSSResponse {
    const chainedData: any = {};
    let chainedOffset = offset;

    while (chainedOffset < payload.length) {
      const paramLength = payload.readUInt16BE(chainedOffset);
      chainedOffset += 2;
      const paramCodePoint = payload.readUInt16BE(chainedOffset);
      chainedOffset += 2;
      const paramData = payload.slice(
        chainedOffset,
        chainedOffset + paramLength - 4,
      );
      chainedOffset += paramLength - 4;

      switch (paramCodePoint) {
        case 0x115e:
          chainedData.extnam = paramData.toString('utf8');
          break;
        case 0xf289:
          chainedData.odbcError = {
            errorCode: paramData.readUInt16BE(0),
            errorMessage: paramData.toString('utf8', 2),
          };
          break;
        case 0xf2a1:
          chainedData.sqlError = {
            sqlErrorCode: paramData.readUInt16BE(0),
            sqlErrorMessage: paramData.toString('utf8', 2),
          };
          break;
        default:
          chainedData[paramCodePoint.toString(16)] = paramData.toString('hex');
          break;
      }
    }

    return chainedData;
  }

  private mapCodePointToResponseType(codePoint: number): string {
    this.logger.info(`Mapping code point 0x${codePoint.toString(16)}...`);
    const responseType = DRDAConstants[codePoint];
    if (responseType !== undefined) {
      this.logger.info(
        `Mapped code point 0x${codePoint.toString(16)} to ${responseType}`,
      );
      return responseType;
    } else {
      this.logger.warn(`Unknown code point: 0x${codePoint.toString(16)}`);
      return 'UNKNOWN';
    }
  }
}
