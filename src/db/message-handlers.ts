// MessageHandlers.ts

import {
  ACCRDBResponse,
  CHNRQSDSSResponse,
  EXCSATRDResponse,
  ACCSECRMResponse,
  SECCHKRMResponse,
  EXCSQLSETResponse,
  EXTNAMResponse,
} from '../interfaces/drda-specific-responses.interface';
import { Connection } from './Connection';
import { Logger } from '../utils/logger';
import {
  DRDACodePoints,
  DRDAMessageTypes,
} from '../enums/drda-codepoints.enum';
import { DRDAResponseType } from '../interfaces/drda-response.interface';

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

  /**
   * Constructs a new MessageHandlers instance.
   * @param {Connection} connection - The connection object.
   * @param {Logger} logger - The logger object.
   */
  constructor(connection: Connection) {
    this.connection = connection;
  }

  /**
   * Handles incoming DRDA messages by dispatching to specific handlers.
   * @param {DRDAResponseType} parsedResponse - The parsed DRDA response object.
   * @returns {void}
   * @public
   * @method
   * @instance
   * @memberof MessageHandlers
   * @example
   * handlers.handleMessage(parsedResponse);
   */
  public handleMessage(parsedResponse: DRDAResponseType): void {
    try {
      if (!parsedResponse) {
        this.logger.warn('Parsed response is null. Skipping handling.');
        return;
      }

      this.logger.debug(`Handling response of type: ${parsedResponse.type}`);

      if (parsedResponse.correlationId === 0) {
        this.handleDefaultResponse(parsedResponse);
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
        case DRDAMessageTypes.EXTNAM:
          this.handleEXTNAM(parsedResponse as EXTNAMResponse);
        case DRDAMessageTypes.SVRCOD:
          this.logger.info(
            `Server returned error code: ${JSON.stringify(parsedResponse)}`,
          );
          break;
        default:
          this.logger.warn(`Unhandled response type: ${parsedResponse.type}`);
      }
    } catch (error) {
      this.logger.error('Error handling message:', error);
    }
  }

  private handleDefaultResponse(response: DRDAResponseType): void {
    this.logger.info(`Received global response: ${JSON.stringify(response)}`);
    if (!response.success) {
      if ('parameters' in response) {
        if ('svrcod' in response.parameters) {
          this.logger.error(
            `Protocol error with SVRCOD: ${response.parameters.svrcod}`,
          );
        } else {
          this.logger.error('Protocol error with unknown SVRCOD');
        }
      } else {
        this.logger.error('Protocol error with unknown SVRCOD');
      }
      this.handleError(
        new Error(
          `Protocol error with SVRCOD: ${(response as any).parameters.svrcod}`,
        ),
      );
    }
  }

  private handleError(error: Error): void {
    this.logger.error('Protocol error:', {
      message: error.message,
      stack: error.stack,
    });
    this.connection.closeConnection().catch((err) => {
      this.logger.error('Error closing connection after protocol error:', err);
    });
  }

  /**
   * Handles the EXTNAM (Extended Name Response) response.
   * @param {EXTNAMResponse} response - The parsed EXTNAM response.
   * @returns {void}
   * @private
   * @method
   * @instance
   * @memberof MessageHandlers
   * @example
   * this.handleEXTNAM(parsedResponse as EXTNAMResponse);
   */
  private handleEXTNAM(response: EXTNAMResponse): void {
    this.logger.info('Handling EXTNAM response.');

    // Check for success or errors
    if (!response.success) {
      throw new Error(
        `EXTNAM response indicates failure with code: ${response.parameters.svrcod}`,
      );
    }

    // Log messages from server
    response.parameters.message.forEach((message) => {
      this.logger.info(`EXTNAM Message: ${message}`);
    });
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

    // Iterate over chained data and handle accordingly
    response.chainedData.forEach((chainedParam) => {
      switch (chainedParam.codePoint) {
        case DRDACodePoints.EXCSATRD:
          // Handle Exchange Server Attributes Response Data Structure
          const pemKey = this.connection.extractServerPublicKey(
            chainedParam.data,
          );
          this.connection.setServerPublicKey(Buffer.from(pemKey, 'utf8'));
          this.logger.info('Server public key acquired and formatted.');
          break;

        case DRDACodePoints.EXTNAM:
          // Handle External Name
          const extnamStr = this.connection.parseEXTNAM(chainedParam.data);
          this.connection.externalName = extnamStr;
          this.logger.info(`Received EXTNAM: ${extnamStr}`);
          break;

        // Handle other chained code points as needed
        default:
          this.logger.warn(
            `Unhandled chained code point in CHNRQSDSS: 0x${chainedParam.codePoint.toString(16)}`,
          );
      }
    });

    // Check for success or errors
    if (!response.success) {
      throw new Error(
        `CHNRQSDSS response indicates failure with code: ${response.parameters.svrcod}`,
      );
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
    this.connection.resolvePendingResponse(response);
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
  // MessageHandlers.ts

  private handleACCSECRM(response: ACCSECRMResponse): void {
    this.logger.info('Handling ACCSECRM response.');

    if (response.success) {
      this.logger.info('ACCSECRM indicates success.');
      // Log messages from server
      response.parameters.message.forEach((message) => {
        this.logger.info(`ACCSECRM Message: ${message}`);
      });
    } else {
      this.logger.error('ACCSECRM indicates failure.');
      // Implement failure handling logic, e.g., throw an error or emit an event
      this.connection.handleError(response.parameters.svrcod);
    }
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
