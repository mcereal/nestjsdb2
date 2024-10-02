// MessageHandlers.ts

import {
  ACCRDBResponse,
  CHNRQSDSSResponse,
  EXCSATRDResponse,
  ACCSECRMResponse,
  SECCHKRMResponse,
  EXCSQLSETResponse,
} from '../interfaces/drda-specific-responses.interface';
import { Connection } from './Connection';
import { Logger } from '../utils/logger';
import {
  DRDACodePoints,
  DRDAMessageTypes,
} from '../enums/drda-codepoints.enum';
import { DRDAParser } from './drda-parser';

/**
 * Class for handling parsed DRDA message responses.
 * Implements business logic based on the parsed responses.
 * @class
 * @public
 * @exports
 * @version 1.0.0
 * @since 1.3.0
 * @category Message Handlers
 * @param {Connection} connection - The connection object.
 * @param {Logger} logger - The logger object.
 * @example
 * const handlers = new MessageHandlers(connection, logger);
 * handlers.handleMessage(data);
 */
export class MessageHandlers {
  private connection: Connection;
  private logger = new Logger(MessageHandlers.name);
  private parser: DRDAParser;

  /**
   * Constructs a new MessageHandlers instance.
   * @param {Connection} connection - The connection object.
   * @param {Logger} logger - The logger object.
   */
  constructor(connection: Connection) {
    this.connection = connection;
    this.parser = new DRDAParser();
  }

  /**
   * Handles incoming DRDA messages by parsing and dispatching to specific handlers.
   * @param {Buffer} data - The data buffer containing the DRDA message.
   * @returns {void}
   * @public
   * @method
   * @instance
   * @memberof MessageHandlers
   * @example
   * handlers.handleMessage(data);
   */
  public handleMessage(data: Buffer): void {
    try {
      // Parse the DRDA message header
      const header = this.parser.parseHeader(data);
      this.logger.debug(`Parsed Header: ${JSON.stringify(header)}`);

      // Identify the response type based on the payload
      const responseType = this.parser.identifyResponseType(header.payload);
      this.logger.debug(`Identified Response Type: ${responseType}`);

      // Parse the payload based on the identified response type
      const parsedResponse = this.parser.parsePayload(
        header.payload,
        responseType,
      );

      if (!parsedResponse) {
        this.logger.warn('Parsed response is null. Skipping handling.');
        return;
      }

      this.logger.debug(`Handling response of type: ${parsedResponse.type}`);

      // Dispatch to specific handler based on response type
      switch (parsedResponse.type) {
        case DRDAMessageTypes.CHRNRQSDSS:
          this.handleCHNRQSDSS(parsedResponse as CHNRQSDSSResponse);
          break;
        case DRDAMessageTypes.ACCRDBRM:
          this.handleACCRDBRM(parsedResponse as ACCRDBResponse);
          break;
        case DRDAMessageTypes.EXCSATRD:
          this.handleEXCSATRD(parsedResponse as EXCSATRDResponse);
          break;
        case DRDAMessageTypes.ACCSECRM:
          this.handleACCSECRM(parsedResponse as ACCSECRMResponse);
          break;
        case DRDAMessageTypes.SECCHKRM:
          this.handleSECCHKRM(parsedResponse as SECCHKRMResponse);
          break;
        case DRDAMessageTypes.EXCSQLSET:
          this.handleEXCSQLSET(parsedResponse as EXCSQLSETResponse);
          break;
        // Add cases for other message types as needed
        default:
          this.logger.warn(`Unhandled response type: ${parsedResponse.type}`);
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
    }
  }

  /**
   * Handles the CHNRQSDSS (Chained Request-Response Data Structure) response.
   * @param {CHNRQSDSSResponse} response - The parsed CHNRQSDSS response.
   * @returns {void}
   * @private
   * @method
   * @instance
   * @memberof MessageHandlers
   */
  private handleCHNRQSDSS(response: CHNRQSDSSResponse): void {
    this.logger.info('Handling CHNRQSDSS response.');
    const chnrqdssResponse = response as CHNRQSDSSResponse;

    // Iterate over chained data and handle accordingly
    chnrqdssResponse.chainedData.forEach((chainedParam) => {
      switch (chainedParam.codePoint) {
        case DRDACodePoints.EXCSATRD:
          // Handle Exchange Server Attributes Response Data Structure
          this.connection.setServerPublicKey(chainedParam.data);
          this.logger.info('Server public key updated.');
          break;

        case DRDACodePoints.EXTNAM:
          // Handle External Name
          const extnam = chainedParam.data.toString('utf8');
          this.connection.externalName = extnam;
          this.logger.info(`External Name set to: ${extnam}`);
          break;

        case DRDACodePoints.ODBC_ERROR:
          // Handle ODBC Error
          const svrcod = parseInt(chainedParam.data.toString(), 10);
          if (svrcod !== 0) {
            this.logger.error(`ODBC Error with SVRCOD: ${svrcod}`);
            this.connection.handleError(svrcod);
          } else {
            this.logger.info('ODBC Error indicates success.');
          }
          break;

        // Handle other chained code points as needed
        default:
          this.logger.warn(
            `Unhandled chained code point in CHNRQSDSS: 0x${chainedParam.codePoint.toString(16)}`,
          );
      }
    });

    // Handle overall success status
    if (response.success) {
      this.logger.info('CHNRQSDSS indicates success.');
      // Implement success handling logic, e.g., proceed with next steps
    } else {
      this.logger.error('CHNRQSDSS indicates failure.');
      // Implement failure handling logic, e.g., terminate connection
      this.connection.handleError(-1); // Example error code
    }
  }

  /**
   * Handles the ACCRDBRM (Access RDB Response Message) response.
   * @param {ACCRDBResponse} response - The parsed ACCRDBRM response.
   * @returns {void}
   * @private
   * @method
   * @instance
   * @memberof MessageHandlers
   */
  private handleACCRDBRM(response: ACCRDBResponse): void {
    this.logger.info('Handling ACCRDBRM response.');

    // Check success status
    if (response.success) {
      this.logger.info('ACCRDBRM indicates success.');
      // Implement success handling logic, e.g., connection established
      this.connection.setConnected(true);
    } else {
      this.logger.error('ACCRDBRM indicates failure.');
      // Implement failure handling logic, e.g., throw an error
      this.connection.handleError(response.parameters.svrcod);
    }

    // Log messages from server
    response.parameters.messages.forEach((message) => {
      this.logger.info(`ACCRDBRM Message: ${message}`);
    });
  }

  /**
   * Handles the EXCSATRD (Exchange Server Attributes Response Data Structure) response.
   * @param {EXCSATRDResponse} response - The parsed EXCSATRD response.
   * @returns {void}
   * @private
   * @method
   * @instance
   * @memberof MessageHandlers
   */
  private handleEXCSATRD(response: EXCSATRDResponse): void {
    this.logger.info('Handling EXCSATRD response.');

    // Extract server public key and version
    const { serverPublicKey, serverVersion } = response.parameters;

    // Update connection with server attributes
    this.connection.setServerPublicKey(serverPublicKey);
    this.connection.setServerVersion(serverVersion);

    this.logger.info(`Server Version: ${serverVersion}`);
  }

  /**
   * Handles the ACCSECRM (Access Security Response Message) response.
   * @param {ACCSECRMResponse} response - The parsed ACCSECRM response.
   * @returns {void}
   * @private
   * @method
   * @instance
   * @memberof MessageHandlers
   */
  private handleACCSECRM(response: ACCSECRMResponse): void {
    this.logger.info('Handling ACCSECRM response.');

    if (response.success) {
      this.logger.info('ACCSECRM indicates success.');
      // Implement success handling logic, e.g., security check passed
      this.connection.setSecurityChecked(true);
    } else {
      this.logger.error('ACCSECRM indicates failure.');
      // Implement failure handling logic, e.g., invalid credentials
      this.connection.handleError(response.parameters.svrcod);
    }

    // Log messages from server
    response.parameters.message.forEach((message) => {
      this.logger.info(`ACCSECRM Message: ${message}`);
    });
  }

  /**
   * Handles the SECCHKRM (Security Check Response Message) response.
   * @param {SECCHKRMResponse} response - The parsed SECCHKRM response.
   * @returns {void}
   * @private
   * @method
   * @instance
   * @memberof MessageHandlers
   */
  private handleSECCHKRM(response: SECCHKRMResponse): void {
    this.logger.info('Handling SECCHKRM response.');

    if (response.success) {
      this.logger.info('SECCHKRM indicates success.');
      // Implement success handling logic, e.g., security check passed
      this.connection.setSecurityChecked(true);
    } else {
      this.logger.error('SECCHKRM indicates failure.');
      // Implement failure handling logic, e.g., invalid credentials
      this.connection.handleError(response.parameters.svrcod);
    }

    // Log messages from server
    if (response.parameters.message) {
      response.parameters.message.forEach((message) => {
        this.logger.info(`SECCHKRM Message: ${message}`);
      });
    }
  }

  /**
   * Handles the EXCSQLSET (Execute SQL Statement Response) response.
   * @param {EXCSQLSETResponse} response - The parsed EXCSQLSET response.
   * @returns {void}
   * @private
   * @method
   * @instance
   * @memberof MessageHandlers
   */
  private handleEXCSQLSET(response: EXCSQLSETResponse): void {
    this.logger.info('Handling EXCSQLSET response.');

    if (response.success) {
      this.logger.info('EXCSQLSET indicates success.');
      // Implement success handling logic, e.g., handle result set
      // For example, pass result to the connection or emit an event
      this.connection.handleResultSet(
        response.result,
        response.parameters.rsmd,
      );
    } else {
      this.logger.error('EXCSQLSET indicates failure.');
      // Implement failure handling logic, e.g., throw an error or emit an event
      this.connection.handleError(response.parameters.svrcod);
    }

    // Optionally, log additional information from response
    if (response.parameters.rsmd.length > 0) {
      this.logger.info('Result Set Metadata:', response.parameters.rsmd);
    }
  }
}
