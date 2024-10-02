import { DRDACodePoints } from '../enums/drda-codepoints.enum';
import { constants, publicEncrypt } from 'crypto';
import { Logger } from '../utils';

export class MessageBuilder {
  // private correlationId: number;
  private readonly logger = new Logger(MessageBuilder.name);
  constructor() {}

  public constructParameter(codePoint: number, dataBuffer: Buffer): Buffer {
    const parameterLength = 4 + dataBuffer.length;
    const parameterBuffer = Buffer.alloc(parameterLength);
    parameterBuffer.writeUInt16BE(parameterLength, 0);
    parameterBuffer.writeUInt16BE(codePoint, 2);
    dataBuffer.copy(parameterBuffer, 4);
    this.logger.debug(
      `Constructed Parameter - Code Point: 0x${codePoint.toString(16)}, Length: ${parameterLength}, Data: ${dataBuffer.toString('hex')}`,
    );
    return parameterBuffer;
  }

  constructDSSHeader(
    messageLength: number,
    correlationId: number,
    dssFlags: number = 0xd0,
    dssType: number = 0x01,
  ): Buffer {
    const dssHeader = Buffer.alloc(6);
    dssHeader.writeUInt16BE(messageLength, 0); // Total Length including DSS Header
    dssHeader.writeUInt8(dssFlags, 2); // DSS Flags
    dssHeader.writeUInt8(dssType, 3); // DSS Type
    dssHeader.writeUInt16BE(correlationId, 4); // Correlation ID
    return dssHeader;
  }

  public constructACCSECMessage(dbName: string, correlationId: number): Buffer {
    const parameters: Buffer[] = [];

    // SECMEC (Security Mechanism)
    const secmecData = Buffer.alloc(2);
    secmecData.writeUInt16BE(DRDACodePoints.SECMEC_USRIDPWD, 0);
    const secmecParam = this.constructParameter(
      DRDACodePoints.SECMEC,
      secmecData,
    );
    this.logger.debug(
      `Adding SECMEC parameter: ${secmecParam.toString('hex')}`,
    );
    parameters.push(secmecParam);

    // RDBNAM (Relational Database Name)
    const rdbnamData = Buffer.from(dbName, 'utf8');
    const rdbnamParam = this.constructParameter(
      DRDACodePoints.RDBNAM,
      rdbnamData,
    );
    this.logger.debug(
      `Adding RDBNAM parameter: ${rdbnamParam.toString('hex')}`,
    );
    parameters.push(rdbnamParam);

    // EXTNAM (External Name)
    const extnamData = Buffer.from('MyApp', 'utf8');
    const extnamParam = this.constructParameter(
      DRDACodePoints.EXTNAM,
      extnamData,
    );
    this.logger.debug(
      `Adding EXTNAM parameter: ${extnamParam.toString('hex')}`,
    );
    parameters.push(extnamParam);

    // MGRLVLLS (Manager Level List)
    const mgrlvllsData = this.constructMgrlvlls();
    const mgrlvllsParam = this.constructParameter(
      DRDACodePoints.MGRLVLLS,
      mgrlvllsData,
    );
    this.logger.debug(
      `Adding MGRLVLLS parameter: ${mgrlvllsParam.toString('hex')}`,
    );
    parameters.push(mgrlvllsParam);

    // PRDID (Product ID)
    const prdidData = Buffer.from('JDB42', 'utf8');
    const prdidParam = this.constructParameter(DRDACodePoints.PRDID, prdidData);
    this.logger.debug(`Adding PRDID parameter: ${prdidParam.toString('hex')}`);
    parameters.push(prdidParam);

    // SRVRLSLV (Server Release Level)
    const srvrlslvData = Buffer.from('11.5', 'utf8');
    const srvrlslvParam = this.constructParameter(
      DRDACodePoints.SRVRLSLV,
      srvrlslvData,
    );
    this.logger.debug(
      `Adding SRVRLSLV parameter: ${srvrlslvParam.toString('hex')}`,
    );
    parameters.push(srvrlslvParam);

    const parametersBuffer = Buffer.concat(parameters);
    this.logger.debug(
      `Total ACCSEC Parameters Length: ${parametersBuffer.length}`,
    );

    // ACCSEC Object
    const accsecLength = 4 + parametersBuffer.length;
    const accsecBuffer = Buffer.alloc(4);
    accsecBuffer.writeUInt16BE(accsecLength, 0);
    accsecBuffer.writeUInt16BE(DRDACodePoints.ACCSEC, 2);

    const accsecObject = Buffer.concat([accsecBuffer, parametersBuffer]);
    this.logger.debug(`ACCSEC Object Length: ${accsecObject.length}`);

    // DSS Header
    const totalLength = 6 + accsecObject.length;
    const dssHeader = this.constructDSSHeader(totalLength, correlationId);

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
    const mgrlvllsEntries = [
      { codePoint: DRDACodePoints.AGENT, level: 0x0004 },
      { codePoint: DRDACodePoints.SQLAM, level: 0x0007 },
      { codePoint: DRDACodePoints.RDB, level: 0x0005 },
      { codePoint: DRDACodePoints.SECMGR, level: 0x0005 },
    ];

    const buffer = Buffer.alloc(mgrlvllsEntries.length * 4);
    mgrlvllsEntries.forEach((entry, index) => {
      const offset = index * 4;
      buffer.writeUInt16BE(entry.codePoint, offset);
      buffer.writeUInt16BE(entry.level, offset + 2);
    });

    this.logger.debug(
      `Constructed MGRLVLLS parameter: ${buffer.toString('hex')}`,
    );
    return buffer;
  }

  /**
   * Constructs the EXCSAT message.
   * @returns The constructed EXCSAT message buffer.
   */
  public constructEXCSATMessage(dbName: string, correlationId: number): Buffer {
    const parameters: Buffer[] = [];

    // SECMEC (Security Mechanism)
    const secmecData = Buffer.alloc(2);
    secmecData.writeUInt16BE(DRDACodePoints.SECMEC_USRIDPWD, 0);
    const secmecParam = this.constructParameter(
      DRDACodePoints.SECMEC,
      secmecData,
    );
    this.logger.debug(
      `Adding SECMEC parameter: ${secmecParam.toString('hex')}`,
    );
    parameters.push(secmecParam);

    // RDBNAM (Relational Database Name)
    const rdbnamData = Buffer.from(dbName, 'utf8');
    const rdbnamParam = this.constructParameter(
      DRDACodePoints.RDBNAM,
      rdbnamData,
    );
    this.logger.debug(
      `Adding RDBNAM parameter: ${rdbnamParam.toString('hex')}`,
    );
    parameters.push(rdbnamParam);

    // EXTNAM (External Name)
    const extnamData = Buffer.from('MyApp', 'utf8');
    const extnamParam = this.constructParameter(
      DRDACodePoints.EXTNAM,
      extnamData,
    );
    this.logger.debug(
      `Adding EXTNAM parameter: ${extnamParam.toString('hex')}`,
    );
    parameters.push(extnamParam);

    const parametersBuffer = Buffer.concat(parameters);

    // EXCSAT Object
    const excsatLength = 4 + parametersBuffer.length;
    const excsatBuffer = Buffer.alloc(4);
    excsatBuffer.writeUInt16BE(excsatLength, 0);
    excsatBuffer.writeUInt16BE(DRDACodePoints.EXCSAT, 2);

    const excsatObject = Buffer.concat([excsatBuffer, parametersBuffer]);

    // DSS Header
    const totalLength = 6 + excsatObject.length;
    const dssHeader = this.constructDSSHeader(totalLength, correlationId);

    // Final EXCSAT message with DSS header
    const message = Buffer.concat([dssHeader, excsatObject]);

    // Logging and debugging
    this.logger.info(`Constructed EXCSAT message: ${message.toString('hex')}`);

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
      Correlation ID: ${correlationId}
      EXCSAT Length: ${excsatLength} (0x${excsatLength.toString(16)})
      EXCSAT Code Point: 0x${excsatBuffer.readUInt16BE(2).toString(16)}
      Parameters: ${parametersBuffer.toString('hex')}
    `);

    return message;
  }

  /**
   * Constructs the SECCHK message.
   * @returns The constructed SECCHK message buffer.
   */
  public constructSECCHKMessage(
    userId: string,
    password: string,
    correlationId: number,
  ): Buffer {
    const parameters: Buffer[] = [];

    // SECMEC (Security Mechanism) - Set to USRIDPWD (0x03)
    const secmecData = Buffer.alloc(2);
    secmecData.writeUInt16BE(DRDACodePoints.SECMEC_USRIDPWD, 0);
    parameters.push(this.constructParameter(DRDACodePoints.SECMEC, secmecData));

    // USRID (User ID) - Add null terminator if required
    const userIdData = Buffer.from(userId + '\0', 'utf8');
    parameters.push(this.constructParameter(DRDACodePoints.USRID, userIdData));

    // PASSWORD (Unencrypted) - Add null terminator if required
    const passwordData = Buffer.from(password + '\0', 'utf8');
    parameters.push(
      this.constructParameter(DRDACodePoints.PASSWORD, passwordData),
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
    const dssHeader = this.constructDSSHeader(totalLength, correlationId);

    // Final SECCHK message with DSS header
    const message = Buffer.concat([dssHeader, secchkObject]);
    this.logger.info(`Constructed SECCHK message: ${message.toString('hex')}`);
    return message;
  }

  /**
   * Constructs the ACCRDB message.
   * @returns The constructed ACCRDB message buffer.
   */
  public constructACCRDBMessage(dbName: string, correlationId: number): Buffer {
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
    const dssHeader = this.constructDSSHeader(totalLength, correlationId);

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
  public constructCloseStatementMessage(
    statementHandle: string,
    correlationId: number,
  ): Buffer {
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
    const dssHeader = this.constructDSSHeader(totalLength, correlationId);

    // Final CLOSESTM message with DSS header
    const message = Buffer.concat([dssHeader, closeStmtObject]);
    this.logger.info(
      `Constructed CLOSESTM message: ${message.toString('hex')}`,
    );
    return message;
  }
}
