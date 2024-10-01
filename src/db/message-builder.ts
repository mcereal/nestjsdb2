import { DRDACodePoints } from '../enums/drda-codepoints.enum';
import { constants, publicEncrypt } from 'crypto';
import { Logger } from '../utils';

export class MessageBuilder {
  private correlationId: number;
  private logger: Logger;

  constructor(correlationId: number, logger: Logger) {
    this.correlationId = correlationId;
    this.logger = logger;
  }

  constructParameter(codePoint: number, dataBuffer: Buffer): Buffer {
    const length = 4 + dataBuffer.length; // Length includes itself and code point
    const parameterBuffer = Buffer.alloc(length);
    parameterBuffer.writeUInt16BE(length, 0); // Length
    parameterBuffer.writeUInt16BE(codePoint, 2); // Code Point
    dataBuffer.copy(parameterBuffer, 4);
    return parameterBuffer;
  }

  constructDSSHeader(
    messageLength: number,
    dssFlags: number = 0xd0,
    dssType: number = 0x01,
  ): Buffer {
    const dssHeader = Buffer.alloc(6);
    dssHeader.writeUInt16BE(messageLength, 0); // Total Length including DSS Header
    dssHeader.writeUInt8(dssFlags, 2); // DSS Flags
    dssHeader.writeUInt8(dssType, 3); // DSS Type
    dssHeader.writeUInt16BE(this.correlationId, 4); // Correlation ID
    return dssHeader;
  }

  /**
   * Constructs the ACCSEC message.
   * @returns The constructed ACCSEC message buffer.
   */
  public constructACCSECMessage(dbName: string): Buffer {
    const parameters: Buffer[] = [];

    // SECMEC (Security Mechanism)
    const secmecData = Buffer.alloc(2);
    secmecData.writeUInt16BE(DRDACodePoints.SECMEC_USRIDPWD, 0);
    parameters.push(this.constructParameter(DRDACodePoints.SECMEC, secmecData));

    // RDBNAM (Relational Database Name)
    const rdbnamData = Buffer.from(dbName, 'utf8');
    parameters.push(this.constructParameter(DRDACodePoints.RDBNAM, rdbnamData));

    // EXTNAM (External Name)
    const extnamData = Buffer.from('MyApp', 'utf8');
    parameters.push(this.constructParameter(DRDACodePoints.EXTNAM, extnamData));

    // MGRLVLLS (Manager Level List)
    const mgrlvllsData = this.constructMgrlvlls();
    parameters.push(
      this.constructParameter(DRDACodePoints.MGRLVLLS, mgrlvllsData),
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
    const dssHeader = this.constructDSSHeader(totalLength);

    // Final ACCSEC message with DSS header
    const message = Buffer.concat([dssHeader, accsecObject]);
    this.logger.info(`Constructed ACCSEC message: ${message.toString('hex')}`);
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
   * Constructs the EXCSAT message.
   * @returns The constructed EXCSAT message buffer.
   */
  public constructEXCSATMessage(dbName: string): Buffer {
    const parameters: Buffer[] = [];

    // SRVNAM (Server Name)
    const srvnamData = Buffer.from(dbName, 'utf8');
    parameters.push(this.constructParameter(DRDACodePoints.SRVNAM, srvnamData));

    // MGRLVLLS (Manager Level List)
    const mgrlvllsData = this.constructMgrlvlls();
    parameters.push(
      this.constructParameter(DRDACodePoints.MGRLVLLS, mgrlvllsData),
    );

    // PRDID (Product ID)
    const prdidData = Buffer.from('JDB42', 'utf8');
    parameters.push(this.constructParameter(DRDACodePoints.PRDID, prdidData));

    // SRVRLSLV (Server Release Level)
    const srvrlslvData = Buffer.from('11.5', 'utf8');
    parameters.push(
      this.constructParameter(DRDACodePoints.SRVRLSLV, srvrlslvData),
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
    const dssHeader = this.constructDSSHeader(totalLength);

    // Final EXCSAT message with DSS header
    const message = Buffer.concat([dssHeader, excsatObject]);
    this.logger.info(`Constructed EXCSAT message: ${message.toString('hex')}`);
    return message;
  }

  /**
   * Constructs the SECCHK message.
   * @returns The constructed SECCHK message buffer.
   */
  public constructSECCHKMessage(
    userId: string,
    serverPublicKey: Buffer | null = null,
    password: string,
  ): Buffer {
    const parameters: Buffer[] = [];

    // SECMEC (Security Mechanism)
    const secmecData = Buffer.alloc(2);
    secmecData.writeUInt16BE(DRDACodePoints.SECMEC_EUSRIDPWD, 0);
    parameters.push(this.constructParameter(DRDACodePoints.SECMEC, secmecData));

    // USRID (User ID)
    const userIdData = Buffer.from(userId, 'utf8');
    parameters.push(this.constructParameter(DRDACodePoints.USRID, userIdData));

    // PASSWORD (encrypted)
    if (!serverPublicKey) {
      throw new Error('Server public key is missing for encryption');
    }

    const encryptedPassword = publicEncrypt(
      { key: serverPublicKey, padding: constants.RSA_PKCS1_PADDING },
      Buffer.from(password, 'utf8'),
    );

    parameters.push(
      this.constructParameter(DRDACodePoints.PASSWORD, encryptedPassword),
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
    const dssHeader = this.constructDSSHeader(totalLength);

    // Final SECCHK message with DSS header
    const message = Buffer.concat([dssHeader, secchkObject]);
    this.logger.info(`Constructed SECCHK message: ${message.toString('hex')}`);
    return message;
  }

  /**
   * Constructs the ACCRDB message.
   * @returns The constructed ACCRDB message buffer.
   */
  public constructACCRDBMessage(dbName: string): Buffer {
    const parameters: Buffer[] = [];

    // RDBNAM (Relational Database Name)
    const rdbnamData = Buffer.from(dbName, 'utf8');
    parameters.push(this.constructParameter(DRDACodePoints.RDBNAM, rdbnamData));

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
    const dssHeader = this.constructDSSHeader(totalLength);

    // Final ACCRDB message with DSS header
    const message = Buffer.concat([dssHeader, accrdbObject]);
    this.logger.info(`Constructed ACCRDB message: ${message.toString('hex')}`);
    return message;
  }

  /**
   * Constructs the CLOSESTM (Close Statement) message.
   * @param statementHandle The handle of the statement to close.
   * @returns The constructed CLOSESTM message buffer.
   */
  public constructCloseStatementMessage(statementHandle: string): Buffer {
    const parameters: Buffer[] = [];

    // Statement Handle
    const stmtHandleParam = this.constructParameter(
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
    const dssHeader = this.constructDSSHeader(totalLength);

    // Final CLOSESTM message with DSS header
    const message = Buffer.concat([dssHeader, closeStmtObject]);
    this.logger.info(
      `Constructed CLOSESTM message: ${message.toString('hex')}`,
    );
    return message;
  }
}
