// DRDAParser.ts

import { DRDAHeader } from '../interfaces/drda-header.interface';
import {
  DRDACodePoints,
  DRDAMessageTypes,
  DB2DataTypes,
} from '../enums/drda-codepoints.enum';
import { Logger } from '../utils/logger';
import { DRDAResponseType } from '../interfaces/drda-response.interface';
import { ColumnMetadata } from '../interfaces/column-metadata.interface';
import { Row } from '../interfaces/row.interface';
import {
  CHNRQSDSSResponse,
  EXCSATRDResponse,
  ACCSECRMResponse,
  ACCRDBResponse,
  EXCSQLSETResponse,
  SECCHKRMResponse,
  EXTNAMResponse,
  SVRCODResponse,
} from '../interfaces/drda-specific-responses.interface';
import { MessageHandlers } from './message-handlers';

/**
 * Utility class for parsing DRDA messages.
 */
export class DRDAParser {
  private readonly logger = new Logger(DRDAParser.name);

  constructor() {}

  /**
   * Parses the DRDA message header from the given data buffer.
   * @param data The buffer containing the DRDA message.
   * @returns A DRDAHeader object with parsed header information.
   */
  parseHeader(data: Buffer): DRDAHeader {
    if (data.length < 6) {
      throw new Error('Invalid DRDA response header.');
    }

    const length = data.readUInt16BE(0);
    const dssFlags = data.readUInt8(2);
    const dssType = data.readUInt8(3);
    const correlationId = data.readUInt16BE(4);

    const dssfmt = (dssFlags & 0x80) !== 0; // DSSFMT is bit 7 (MSB)

    let headerLength = 6;
    if (dssfmt) {
      if (data.length < 10) {
        throw new Error('Invalid DRDA response header (extended format).');
      }
      headerLength = 10;
      // If there are additional fields in the extended header, parse them here
      // For example:
      // const additionalField = data.readUInt32BE(6);
    }

    if (data.length < length) {
      const error = new Error('Incomplete DRDA message received.');
      (error as any).correlationId = correlationId;
      throw error;
    }

    const payload = data.slice(headerLength, length);
    this.logger.debug(
      `Parsed Header: length=${length}, dssFlags=${dssFlags}, dssType=${dssType}, correlationId=${correlationId}`,
    );
    return { length, correlationId, dssFlags, dssType, payload };
  }

  /**
   * Parses multiple DRDA messages from the given data buffer.
   * @param data The buffer containing one or more DRDA messages.
   * @param messageHandlers An instance of MessageHandlers to handle parsed responses.
   */

  public parseMessages(
    data: Buffer,
    messageHandlers: MessageHandlers,
    correlationId: number,
  ): DRDAResponseType {
    try {
      const header = this.parseHeader(data);
      const correlationId = header.correlationId;
      const responsePayload = header.payload;

      // Identify and parse the response type
      const responseType = this.identifyResponseType(responsePayload);
      const parsedResponse = this.parsePayload(
        responsePayload,
        responseType,
        correlationId,
      );

      this.logger.info(
        `Received DRDA response with correlationId: ${correlationId}`,
      );

      // Use the MessageHandlers to process the parsed message
      messageHandlers.handleMessage(parsedResponse);

      // Return the parsed response
      return parsedResponse;
    } catch (error) {
      this.logger.error('Error parsing DRDA message:', error);
      throw error; // Let handleData catch and handle it
    }
  }

  /**
   * Identifies the DRDA response type based on the payload's code point.
   * @param payload The payload buffer from the DRDA message.
   * @returns The identified DRDAMessageTypes or 'UNKNOWN' if not recognized.
   */
  identifyResponseType(payload: Buffer): DRDAMessageTypes | 'UNKNOWN' {
    if (payload.length < 4) {
      this.logger.warn('Payload too short to identify response type.');
      return 'UNKNOWN';
    }

    const ddmLength = payload.readUInt16BE(0);
    const messageCodePoint = payload.readUInt16BE(2);

    // Validate that the payload contains at least the DDM length
    if (payload.length < ddmLength) {
      this.logger.warn('Incomplete DDM object received.');
      return 'UNKNOWN';
    }

    this.logger.info(
      `Identifying response type for code point: 0x${messageCodePoint.toString(16)}`,
    );

    // Map codePoint to DRDAMessageTypes
    switch (messageCodePoint) {
      case DRDACodePoints.CHRNRQSDSS:
        return DRDAMessageTypes.CHRNRQSDSS;
      case DRDACodePoints.EXCSATRD:
        return DRDAMessageTypes.EXCSATRD;
      case DRDACodePoints.ACCSECRM:
        return DRDAMessageTypes.ACCSECRM;
      case DRDACodePoints.SECCHKRM:
        return DRDAMessageTypes.SECCHKRM;
      case DRDACodePoints.ACCRDBRM:
        return DRDAMessageTypes.ACCRDBRM;
      case DRDACodePoints.EXCSQLSET:
        return DRDAMessageTypes.EXCSQLSET;
      case DRDACodePoints.EXTNAM:
        return DRDAMessageTypes.EXTNAM;
      case DRDACodePoints.SVRCOD:
        return DRDAMessageTypes.SVRCOD;
      case DRDACodePoints.MGRLVLLS:
        return DRDAMessageTypes.MGRLVLLS;
      case DRDACodePoints.SRVCLSNM:
        return DRDAMessageTypes.SRVCLSNM;
      case DRDACodePoints.SRVNAM:
        return DRDAMessageTypes.SRVNAM;
      case DRDACodePoints.SRVRLSLV:
        return DRDAMessageTypes.SRVRLSLV;
      default:
        this.logger.warn(
          `Unknown message code point: 0x${messageCodePoint.toString(16)}`,
        );
        return 'UNKNOWN';
    }
  }
  /**
   * Parses the DRDA payload based on the identified response type.
   * @param payload The payload buffer from the DRDA message.
   * @param responseType The identified DRDAMessageTypes.
   * @returns A DRDAResponseType object with parsed data or null if unknown.
   */
  parsePayload(
    payload: Buffer,
    responseType: DRDAMessageTypes | 'UNKNOWN',
    correlationId: number,
  ): DRDAResponseType | null {
    if (responseType === 'UNKNOWN') {
      this.logger.warn('Unknown response type. Cannot parse payload.');
      return null;
    }

    // Initialize a base response object
    let response: DRDAResponseType = {
      length: payload.length,
      type: responseType,
      payload: payload,
      success: true, // Default to true, modify based on parsed data
      correlationId: correlationId,
    };

    try {
      switch (responseType) {
        case DRDAMessageTypes.CHRNRQSDSS:
          const chrnqsdssResponse = this.handleCHNRQSDSS(
            payload,
            correlationId,
          );
          return chrnqsdssResponse;

        case DRDAMessageTypes.EXCSATRD:
          const excsatrdResponse = this.handleEXCSATRD(payload, correlationId);
          return excsatrdResponse;

        case DRDAMessageTypes.ACCSECRM:
          const accsecrmResponse = this.handleACCSECRM(payload, correlationId);
          return accsecrmResponse;

        case DRDAMessageTypes.SECCHKRM:
          const secchkrmResponse = this.handleSECCHKRM(payload, correlationId);
          return secchkrmResponse;

        case DRDAMessageTypes.ACCRDBRM:
          const accrdbrmResponse = this.handleACCRDBRM(payload, correlationId);
          return accrdbrmResponse;

        case DRDAMessageTypes.EXCSQLSET:
          const excsqlsetResponse = this.handleEXCSQLSET(
            payload,
            correlationId,
          );
          return excsqlsetResponse;

        case DRDAMessageTypes.EXTNAM:
          const extnamResponse = this.handleEXTNAM(payload, correlationId);
          return extnamResponse;

        case DRDAMessageTypes.SVRCOD:
          const svrcodResponse = this.extractSVRCOD(payload, correlationId);
          return svrcodResponse;

        default:
          this.logger.warn(
            `No parser implemented for response type: ${responseType}`,
          );
          response.success = false;
          return response;
      }
    } catch (error) {
      this.logger.error(
        `Error parsing payload for type ${responseType}:`,
        error,
      );
      response.success = false;
      return response;
    }
  }

  /**
   * Extracts the server public key from the EXCSATRD payload.
   * @param data The payload buffer.
   * @returns The server's public key as a Buffer.
   */
  private extractServerPublicKey(data: Buffer): Buffer {
    // Assuming the public key is within a parameter with code point SERVER_KEY
    let offset = 0;
    while (offset + 4 <= data.length) {
      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      const paramData = data.slice(offset + 4, offset + paramLength);

      if (paramCodePoint === DRDACodePoints.SERVER_KEY) {
        // The public key might be in a specific format (e.g., DER-encoded)
        this.logger.debug('Server public key extracted.');
        return paramData;
      }

      offset += paramLength;
    }

    throw new Error('Server public key not found in EXCSATRD response.');
  }

  /**
   * Parses the server version from the EXCSATRD payload.
   * @param {Buffer} data - The buffer containing the server version data.
   * @returns {string} The parsed server version string.
   */
  parseServerVersion(data: Buffer): string {
    this.logger.debug('Parsing Server Version.');
    // Assume server version is a null-terminated UTF-8 string starting at a specific offset
    // Adjust the offset based on the actual payload structure

    // Example: If server version starts at byte 4 and is 10 bytes long
    const versionStart = 4;
    const versionLength = 10; // Adjust as per specification
    const versionBuffer = data.slice(
      versionStart,
      versionStart + versionLength,
    );
    const version = this.parseMessageText(versionBuffer);
    this.logger.info(`Parsed Server Version: ${version}`);
    return version;
  }

  /**
   * Extracts the SVRCOD (Server Code) from the payload.
   * @param payload The payload buffer.
   * @returns The server code as a number.
   */
  private extractSVRCOD(payload: Buffer, correlationId): SVRCODResponse {
    let offset = 0;
    while (offset + 4 <= payload.length) {
      const paramLength = payload.readUInt16BE(offset);
      const paramCodePoint = payload.readUInt16BE(offset + 2);
      const paramData = payload.slice(offset + 4, offset + paramLength);

      if (paramCodePoint === DRDACodePoints.SVRCOD) {
        if (paramData.length < 2) {
          throw new Error('Invalid SVRCOD parameter data length');
        }
        const svrcod = paramData.readUInt16BE(0);
        const success = svrcod === 0;
        return {
          parameters: { svrcod },
          type: DRDAMessageTypes.SVRCOD,
          length: paramData.length,
          payload: paramData,
          correlationId: correlationId,
          success,
        };
      }

      offset += paramLength;
    }

    throw new Error('SVRCOD parameter not found in payload');
  }

  private handleCHNRQSDSS(
    data: Buffer,
    correlationId: number,
  ): CHNRQSDSSResponse {
    let offset = 0;
    const chrnqsdssResponse: CHNRQSDSSResponse = {
      length: data.length,
      type: DRDAMessageTypes.CHRNRQSDSS,
      payload: data,
      success: true, // Initialize as true, modify based on parameters
      isChained: true,
      chainedData: [],
      parameters: {
        svrcod: 0,
      },
      correlationId: correlationId,
    };

    while (offset + 4 <= data.length) {
      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      const paramData = data.slice(offset + 4, offset + paramLength);
      offset += paramLength;

      switch (paramCodePoint) {
        case DRDACodePoints.EXCSATRD:
          const serverPublicKey = this.extractServerPublicKey(paramData);
          chrnqsdssResponse.chainedData.push({
            codePoint: DRDACodePoints.EXCSATRD,
            data: serverPublicKey,
          });
          break;
        case DRDACodePoints.EXTNAM:
          const extnam = this.handleEXTNAM(paramData, correlationId);
          chrnqsdssResponse.chainedData.push({
            codePoint: DRDACodePoints.EXTNAM,
            data: Buffer.from(extnam.parameters.extnam, 'utf8'),
          });
          break;
        case DRDACodePoints.ODBC_ERROR:
          const svrcod = this.extractSVRCOD(paramData, correlationId);
          chrnqsdssResponse.chainedData.push({
            codePoint: DRDACodePoints.ODBC_ERROR,
            data: Buffer.from(svrcod.toString()),
          });
          chrnqsdssResponse.success = svrcod.parameters.svrcod === 0;
          break;
        // Handle other code points as needed
        default:
          this.logger.warn(
            `Unknown chained parameter code point: 0x${paramCodePoint.toString(16)}`,
          );
          break;
      }
    }

    return chrnqsdssResponse;
  }

  /**
   * Handles the EXCSATRD (Exchange Server Attributes Response Data Structure) response.
   * @param data The data buffer containing the response.
   * @returns EXCSATRDResponse object.
   */
  private handleEXCSATRD(
    data: Buffer,
    correlationId: number,
  ): EXCSATRDResponse {
    let offset = 0;
    const parameters = {
      serverPublicKey: Buffer.alloc(0),
      serverVersion: '',
      managerLevels: [] as string[],
      serverClassName: '',
      serverName: '',
      serverReleaseLevel: '',
      extnam: '',
    };

    // Skip the top-level DDM object's length and code point
    const ddmLength = data.readUInt16BE(offset);
    const ddmCodePoint = data.readUInt16BE(offset + 2);
    offset += 4;

    if (ddmCodePoint !== DRDACodePoints.EXCSATRD) {
      throw new Error(
        `Expected EXCSATRD code point, but found 0x${ddmCodePoint.toString(16)}`,
      );
    }
    const ddmEnd = offset + ddmLength - 4;

    while (offset + 4 <= ddmEnd) {
      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      if (offset + paramLength > data.length) {
        this.logger.warn('Parameter length exceeds data length.');
        break;
      }

      const paramData = data.slice(offset + 4, offset + paramLength);

      offset += paramLength;
      switch (paramCodePoint) {
        case DRDACodePoints.EXTNAM:
          parameters.extnam = paramData.toString('utf8').replace(/\x00/g, '');
          break;
        case DRDACodePoints.MGRLVLLS:
          parameters.managerLevels = this.parseMGRLVLLS(paramData);
          break;
        case DRDACodePoints.SRVCLSNM:
          parameters.serverClassName = this.parseSRVCLSNM(paramData);
          break;
        case DRDACodePoints.SRVNAM:
          parameters.serverName = this.parseSRVNAM(paramData);
          break;
        case DRDACodePoints.SRVRLSLV:
          parameters.serverReleaseLevel = this.parseSRVRLSLV(paramData);
          break;
        // Handle other parameters...
        default:
          this.logger.warn(
            `Unknown EXCSATRD parameter code point: 0x${paramCodePoint.toString(16)}`,
          );
          break;
      }
    }
    parameters.serverPublicKey = this.extractServerPublicKey(data);
    parameters.serverVersion = this.parseServerVersion(data);

    return {
      type: DRDAMessageTypes.EXCSATRD,
      length: data.length,
      payload: data,
      success: true,
      correlationId: correlationId,
      parameters,
    };
  }

  /**
   * Handles the ACCSECRM (Access Security Response Message) response.
   * @param data The data buffer containing the response.
   * @returns ACCSECRMResponse object.
   */
  // DRDAParser.ts

  private handleACCSECRM(
    data: Buffer,
    correlationId: number,
  ): ACCSECRMResponse {
    let offset = 0;
    const accsecrmResponse: ACCSECRMResponse = {
      length: data.length,
      type: DRDAMessageTypes.ACCSECRM,
      payload: data,
      success: true,
      parameters: {
        svrcod: 0,
        message: [],
      },
      correlationId: correlationId,
    };

    while (offset + 4 <= data.length) {
      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      const paramData = data.slice(offset + 4, offset + paramLength);
      offset += paramLength;

      switch (paramCodePoint) {
        case DRDACodePoints.SVRCOD:
          const svrcod = this.extractSVRCOD(paramData, correlationId);
          accsecrmResponse.success = svrcod.parameters.svrcod === 0;
          accsecrmResponse.parameters.svrcod = svrcod.parameters.svrcod;
          break;
        case DRDACodePoints.SECMEC:
          // Handle security mechanism if needed
          this.logger.debug('SECMEC parameter detected.');
          break;
        case DRDACodePoints.MSG_TEXT:
          const message = this.parseMessageText(paramData);
          accsecrmResponse.parameters.message.push(message);
          break;
        default:
          this.logger.warn(
            `Unknown ACCSECRM parameter code point: 0x${paramCodePoint.toString(16)}`,
          );
          break;
      }
    }

    return accsecrmResponse;
  }

  /**
   * Handles the SECCHKRM (Security Check Response Message) response.
   * @param data The data buffer containing the response.
   * @returns SECCHKRMResponse object.
   */
  private handleSECCHKRM(
    data: Buffer,
    correlationId: number,
  ): SECCHKRMResponse {
    let offset = 0;
    const secchkrmResponse: SECCHKRMResponse = {
      length: data.length,
      type: DRDAMessageTypes.SECCHKRM,
      payload: data,
      success: true,
      parameters: {
        svrcod: 0,
      },
      correlationId: correlationId,
    };

    while (offset + 4 <= data.length) {
      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      const paramData = data.slice(offset + 4, offset + paramLength);
      offset += paramLength;

      switch (paramCodePoint) {
        case DRDACodePoints.SVRCOD:
          const svrcod = this.extractSVRCOD(paramData, correlationId);
          secchkrmResponse.success = svrcod.parameters.svrcod === 0;
          secchkrmResponse.parameters.svrcod = svrcod.parameters.svrcod;
          break;
        case DRDACodePoints.MSG_TEXT:
          const message = this.parseMessageText(paramData);
          secchkrmResponse.parameters.message = [message];
          break;
        // Handle other code points as needed
        default:
          this.logger.warn(
            `Unknown SECCHKRM parameter code point: 0x${paramCodePoint.toString(16)}`,
          );
          break;
      }
    }

    return secchkrmResponse;
  }

  /**
   * Handles the ACCRDBRM (Access RDB Response Message) response.
   * @param data The data buffer containing the response.
   * @returns ACCRDBResponse object.
   */
  private handleACCRDBRM(data: Buffer, correlationId: number): ACCRDBResponse {
    let offset = 0;
    const accrdbResponse: ACCRDBResponse = {
      length: data.length,
      type: DRDAMessageTypes.ACCRDBRM,
      payload: data,
      success: true, // Initialize as true, modify based on parameters
      parameters: {
        messages: [],
        svrcod: 0,
      },
      correlationId: correlationId,
    };

    while (offset + 4 <= data.length) {
      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      const paramData = data.slice(offset + 4, offset + paramLength);
      offset += paramLength;

      switch (paramCodePoint) {
        case DRDACodePoints.SVRCOD:
          const svrcod = this.extractSVRCOD(paramData, correlationId);
          accrdbResponse.success = svrcod.parameters.svrcod === 0;
          accrdbResponse.parameters.svrcod = svrcod.parameters.svrcod;
          break;
        case DRDACodePoints.MSG_TEXT:
          const message = this.parseMessageText(paramData);
          accrdbResponse.parameters.messages.push(message);
          break;
        // Handle other code points as needed
        default:
          this.logger.warn(
            `Unknown ACCRDBRM parameter code point: 0x${paramCodePoint.toString(16)}`,
          );
          break;
      }
    }

    return accrdbResponse;
  }

  /**
   * Handles the EXCSQLSET (Execute SQL Statement Response) response.
   * @param data The data buffer containing the response.
   * @returns EXCSQLSETResponse object.
   */
  private handleEXCSQLSET(
    data: Buffer,
    correlationId: number,
  ): EXCSQLSETResponse {
    let offset = 0;
    const excsqlsetResponse: EXCSQLSETResponse = {
      length: data.length,
      type: DRDAMessageTypes.EXCSQLSET,
      payload: data,
      success: true, // Initialize as true, modify based on parameters
      parameters: {
        rsmd: [],
        svrcod: 0,
      },
      result: [],
      correlationId: correlationId,
    };

    while (offset + 4 <= data.length) {
      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      const paramData = data.slice(offset + 4, offset + paramLength);
      offset += paramLength;

      switch (paramCodePoint) {
        case DRDACodePoints.SVRCOD:
          const svrcod = this.extractSVRCOD(paramData, correlationId);
          excsqlsetResponse.success = svrcod.parameters.svrcod === 0;
          excsqlsetResponse.parameters.svrcod = svrcod.parameters.svrcod;
          break;
        case DRDACodePoints.RSMD:
          const rsmd = this.parseRSMD(paramData);
          excsqlsetResponse.parameters.rsmd = rsmd;
          break;
        case DRDACodePoints.QRYDTA:
          const rows = this.parseResultSet(
            paramData,
            excsqlsetResponse.parameters.rsmd,
          );
          excsqlsetResponse.result = rows;
          break;
        // Handle other code points as needed
        default:
          this.logger.warn(
            `Unknown EXCSQLSET parameter code point: 0x${paramCodePoint.toString(16)}`,
          );
          break;
      }
    }

    return excsqlsetResponse;
  }

  /**
   * Parses the Result Set Metadata (RSMD) from the payload.
   * @param {Buffer} data - The buffer containing the RSMD data.
   * @returns {ColumnMetadata[]} An array of column metadata.
   */

  private parseRSMD(data: Buffer): ColumnMetadata[] {
    this.logger.debug('Parsing RSMD.');
    const rsmd: ColumnMetadata[] = [];
    let offset = 0;

    while (offset < data.length) {
      if (offset + 4 > data.length) {
        this.logger.warn('Incomplete RSMD parameter detected.');
        break;
      }

      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      const paramData = data.slice(offset + 4, offset + paramLength);
      offset += paramLength;

      switch (paramCodePoint) {
        case DRDACodePoints.COLNAM: {
          // Column Name
          const columnName = this.parseMessageText(paramData);
          rsmd.push({
            name: columnName,
            dataType: '',
            length: 0,
            nullable: false,
            typeId: 0,
            scale: 0,
          });
          break;
        }
        case DRDACodePoints.TYPID: {
          // Type ID
          const typeId = paramData.readUInt16BE(0);
          if (rsmd.length > 0) {
            rsmd[rsmd.length - 1].typeId = typeId;
          }
          break;
        }
        case DRDACodePoints.LENGTH: {
          // Column Length
          const length = paramData.readUInt32BE(0);
          if (rsmd.length > 0) {
            rsmd[rsmd.length - 1].length = length;
          }
          break;
        }
        case DRDACodePoints.SCALE: {
          // Scale
          const scale = paramData.readUInt16BE(0);
          if (rsmd.length > 0) {
            rsmd[rsmd.length - 1].scale = scale;
          }
          break;
        }
        case DRDACodePoints.NULLS: {
          // Nullable
          const nullable = paramData.readUInt8(0) === 1;
          if (rsmd.length > 0) {
            rsmd[rsmd.length - 1].nullable = nullable;
          }
          break;
        }
        // Handle additional RSMD parameters as needed
        default:
          this.logger.warn(
            `Unknown RSMD parameter code point: 0x${paramCodePoint.toString(16)}`,
          );
          break;
      }
    }

    // After parsing, map type IDs to data type strings
    rsmd.forEach((column) => {
      const dataType = this.mapTypeIdToDataType(column.typeId);
      column.dataType = dataType;
    });

    this.logger.info('Parsed RSMD:', rsmd);
    return rsmd;
  }

  /**
   * Parses the EXTNAM (External Name) parameter from the payload.
   * @param data The data buffer containing the EXTNAM parameter.
   * @returns The parsed external name as a string.
   * @throws Error if the EXTNAM parameter is not valid.
   */
  private handleEXTNAM(data: Buffer, correlationId: number): EXTNAMResponse {
    let offset = 0;
    const parameters = {
      svrcod: 0,
      message: [] as string[],
      extnam: '',
    };

    while (offset + 4 <= data.length) {
      const paramLength = data.readUInt16BE(offset);
      const paramCodePoint = data.readUInt16BE(offset + 2);
      const paramData = data.slice(offset + 4, offset + paramLength);
      offset += paramLength;

      switch (paramCodePoint) {
        case DRDACodePoints.EXTNAM:
          // Parse EXTNAM parameter
          const extnam = paramData.toString('utf8').replace(/\x00/g, '');
          parameters.extnam = extnam;
          break;

        case DRDACodePoints.SVRCOD:
          // Parse SVRCOD parameter
          if (paramData.length >= 2) {
            const svrcod = paramData.readUInt16BE(0);
            parameters.svrcod = svrcod;
          } else {
            this.logger.warn(
              'Invalid SVRCOD parameter length in EXTNAM response.',
            );
          }
          break;

        case DRDACodePoints.MSG_TEXT:
          // Parse MSG_TEXT parameter
          const message = paramData.toString('utf8').replace(/\x00/g, '');
          parameters.message.push(message);
          break;

        case DRDACodePoints.MGRLVLLS:
          // Parse MGRLVLLS parameter
          const managerLevels = this.parseMGRLVLLS(paramData);
          parameters.message.push(managerLevels.join(', '));
          break;
        case DRDACodePoints.SRVCLSNM:
          // Parse SRVCLSNM parameter
          const serverClassName = this.parseSRVCLSNM(paramData);
          parameters.message.push(serverClassName);
          break;
        case DRDACodePoints.SRVNAM:
          // Parse SRVNAM parameter
          const serverName = this.parseSRVNAM(paramData);
          parameters.message.push(serverName);
          break;
        case DRDACodePoints.SRVRLSLV:
          // Parse SRVRLSLV parameter
          const serverReleaseLevel = this.parseSRVRLSLV(paramData);
          parameters.message.push(serverReleaseLevel);
          break;

        default:
          this.logger.warn(
            `Unknown parameter code point in EXTNAM response: 0x${paramCodePoint.toString(16)}`,
          );
          break;
      }
    }

    const success = parameters.svrcod === 0;

    return {
      type: DRDAMessageTypes.EXTNAM,
      length: data.length,
      payload: data,
      success,
      parameters,
      correlationId: correlationId,
    };
  }

  /**
   * Maps a type ID to a DB2 data type string.
   * @param typeId The type ID to map.
   * @returns The corresponding DB2 data type as a string.
   */
  private mapTypeIdToDataType(typeId: number): string {
    const type = DB2DataTypes[typeId as unknown as keyof typeof DB2DataTypes];
    if (type) {
      return DB2DataTypes[
        typeId as unknown as keyof typeof DB2DataTypes
      ].toString();
    } else {
      this.logger.warn(`Unknown DB2 type ID: 0x${typeId.toString(16)}`);
      return 'UNKNOWN';
    }
  }

  /**
   * Parses the Result Set from the payload.
   * @param {Buffer} data - The buffer containing the result set data.
   * @param {ColumnMetadata[]} rsmd - The result set metadata.
   * @returns {Row[]} An array of rows representing the result set.
   */
  private parseResultSet(data: Buffer, rsmd: ColumnMetadata[]): Row[] {
    this.logger.debug('Parsing Result Set.');
    const rows: Row[] = [];
    let offset = 0;

    while (offset < data.length) {
      if (offset + 2 > data.length) {
        this.logger.warn('Incomplete row length detected.');
        break;
      }

      const rowLength = data.readUInt16BE(offset);
      offset += 2;

      if (offset + rowLength > data.length) {
        this.logger.warn('Incomplete row data detected.');
        break;
      }

      const rowData = data.slice(offset, offset + rowLength);
      offset += rowLength;

      const row: Row = {};
      let colOffset = 0;

      rsmd.forEach((column) => {
        if (colOffset + 2 > rowData.length) {
          this.logger.warn(
            `Incomplete column length for column ${column.name}.`,
          );
          return;
        }

        const colLength = rowData.readUInt16BE(colOffset);
        colOffset += 2;

        if (colOffset + colLength > rowData.length) {
          this.logger.warn(`Incomplete data for column ${column.name}.`);
          return;
        }

        const colData = rowData.slice(colOffset, colOffset + colLength);
        colOffset += colLength;

        // Interpret column data based on typeId from RSMD
        let value: any;
        switch (column.typeId) {
          case DB2DataTypes.INTEGER:
            value = colData.readInt32BE(0);
            break;
          case DB2DataTypes.SMALLINT:
            value = colData.readInt16BE(0);
            break;
          case DB2DataTypes.VARCHAR:
            value = this.parseMessageText(colData);
            break;
          case DB2DataTypes.DECIMAL:
          case DB2DataTypes.NUMERIC:
            value = this.parseDecimal(colData);
            break;
          case DB2DataTypes.DATE:
            value = this.parseDate(colData);
            break;
          case DB2DataTypes.BLOB:
          case DB2DataTypes.VARBINARY:
          case DB2DataTypes.BINARY:
            value = this.parseBlob(colData);
            break;
          case DB2DataTypes.REAL:
            value = colData.readFloatBE(0);
            break;
          case DB2DataTypes.FLOAT:
          case DB2DataTypes.DOUBLE:
            value = colData.readDoubleBE(0);
            break;
          case DB2DataTypes.TIME:
            value = this.parseTime(colData);
            break;
          case DB2DataTypes.TIMESTAMP:
            value = this.parseTimestamp(colData);
            break;
          case DB2DataTypes.CLOB:
          case DB2DataTypes.DBCLOB:
            value = this.parseClob(colData);
            break;
          // Handle other data types as needed
          default:
            this.logger.warn(
              `Unhandled data type ID: ${column.typeId} for column ${column.name}`,
            );
            value = colData.toString('hex'); // Fallback representation
            break;
        }

        row[column.name] = value;
      });

      rows.push(row);
    }

    this.logger.info(`Parsed ${rows.length} rows from Result Set.`);
    return rows;
  }

  /**
   * Parses a DECIMAL or NUMERIC type from binary data.
   * @param {Buffer} data - The buffer containing the decimal data.
   * @returns {number} The parsed decimal number.
   */
  private parseDecimal(data: Buffer): number {
    // Implement decimal parsing based on DB2's encoding
    // DB2 typically encodes DECIMAL as packed decimal (binary-coded decimal)
    // Example implementation (simplistic and may need adjustments):
    const decimalStr = data.toString('hex').replace(/(.)/g, '$1 ').trim();
    // Convert packed decimal to number
    let numberStr = '';
    for (let i = 0; i < decimalStr.length; i += 3) {
      const digit = decimalStr.substr(i, 2);
      numberStr += parseInt(digit, 16).toString();
    }
    const sign = parseInt(decimalStr.slice(-1), 16) === 0xc ? 1 : -1;
    return sign * parseFloat(numberStr);
  }

  /**
   * Parses a DATE type from binary data.
   * @param {Buffer} data - The buffer containing the date data.
   * @returns {Date} The parsed Date object.
   */
  private parseDate(data: Buffer): Date {
    // DB2 encodes DATE as Julian date (integer)
    const julianDate = data.readUInt32BE(0);
    return this.convertJulianToGregorian(julianDate);
  }

  /**
   * Converts a Julian date to a Gregorian Date object.
   * @param {number} julian - The Julian date.
   * @returns {Date} The Gregorian Date.
   */
  private convertJulianToGregorian(julian: number): Date {
    // Julian date is the number of days since January 1, 4713 BC
    // Implement conversion logic or use a library if available
    // Placeholder implementation:
    // Note: Implement accurate conversion based on DRDA/DB2 specifications
    // Here's a basic approximation:
    // Reference: https://en.wikipedia.org/wiki/Julian_day

    let j = julian + 32044;
    let g = Math.floor(j / 146097);
    let dg = j % 146097;
    let c = Math.floor(((dg / 36524 + 1) * 3) / 4);
    let dc = dg - c * 36524;
    let b = Math.floor(dc / 1461);
    let db = dc % 1461;
    let a = Math.floor(((db / 365 + 1) * 3) / 4);
    let da = db - a * 365;
    let y = g * 400 + c * 100 + b * 4 + a;
    let m = Math.floor((da * 5 + 308) / 153) - 2;
    let d = da - Math.floor(((m + 4) * 153) / 5) + 122;

    let year = y - 4800 + Math.floor((m + 2) / 12);
    let month = ((m + 2) % 12) + 1;
    let day = d + 1;

    return new Date(year, month - 1, day);
  }

  /**
   * Parses a TIME type from binary data.
   * @param {Buffer} data - The buffer containing the time data.
   * @returns {string} The parsed time in HH:MM:SS format.
   */
  private parseTime(data: Buffer): string {
    const hours = data.readUInt8(0);
    const minutes = data.readUInt8(1);
    const seconds = data.readUInt8(2);
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  }

  /**
   * Parses a TIMESTAMP type from binary data.
   * @param {Buffer} data - The buffer containing the timestamp data.
   * @returns {Date} The parsed Date object with time.
   */
  private parseTimestamp(data: Buffer): Date {
    // DB2 encodes TIMESTAMP as Julian date followed by time components
    const julianDate = data.readUInt32BE(0);
    const hours = data.readUInt8(4);
    const minutes = data.readUInt8(5);
    const seconds = data.readUInt8(6);
    const fractions = data.readUInt32BE(7); // Fractions of a second

    const date = this.convertJulianToGregorian(julianDate);
    date.setHours(hours, minutes, seconds, fractions / 1000000);
    return date;
  }

  /**
   * Parses a BLOB type from binary data.
   * @param {Buffer} data - The buffer containing the BLOB data.
   * @returns {Buffer} The parsed binary data.
   */
  private parseBlob(data: Buffer): Buffer {
    return data; // Binary data can be handled as-is or converted as needed
  }

  /**
   * Parses a CLOB type from binary data.
   * @param {Buffer} data - The buffer containing the CLOB data.
   * @returns {string} The parsed character data.
   */
  private parseClob(data: Buffer): string {
    return this.parseMessageText(data);
  }

  /**
   * Parses the message text from the payload.
   * @param {Buffer} data - The buffer containing the message text.
   * @returns {string} The parsed message text.
   */
  private parseMessageText(data: Buffer): string {
    this.logger.debug('Parsing message text.');
    return data.toString('utf8').replace(/\x00/g, '');
  }

  private managerLevelMap: { [key: number]: string } = {
    [DRDACodePoints.SQLAM << 16]: 'SQLAM Level', // Shift left to match the format
    [DRDACodePoints.AGENT << 16]: 'AGENT Level',
    [DRDACodePoints.RDB << 16]: 'RDB Level',
    [DRDACodePoints.SECMGR << 16]: 'SECMGR Level',
    // Add other manager levels as needed
  };

  private parseMGRLVLLS(data: Buffer): string[] {
    this.logger.debug('Parsing MGRLVLLS.');
    const managerLevels: string[] = [];
    let offset = 0;

    while (offset + 4 <= data.length) {
      const codePoint = data.readUInt16BE(offset);
      const level = data.readUInt16BE(offset + 2);
      const key = (codePoint << 16) | level;
      const mgrName =
        this.managerLevelMap[key] ||
        `Unknown Manager Level 0x${codePoint.toString(16)}${level
          .toString(16)
          .padStart(4, '0')}`;
      managerLevels.push(mgrName);
      offset += 4;
    }

    return managerLevels;
  }

  private parseSRVCLSNM(data: Buffer): string {
    this.logger.debug('Parsing SRVCLSNM.');
    const srvclsnm = data.toString('utf8').replace(/\x00/g, '');
    return srvclsnm;
  }

  private parseSRVNAM(data: Buffer): string {
    this.logger.debug('Parsing SRVNAM.');
    const srvnam = data.toString('utf8').replace(/\x00/g, '');
    return srvnam;
  }

  private parseSRVRLSLV(data: Buffer): string {
    this.logger.debug('Parsing SRVRLSLV.');
    const srvrlslv = data.toString('utf8').replace(/\x00/g, '');
    return srvrlslv;
  }
}
