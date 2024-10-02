// interfaces/drda-specific-responses.interface.ts
import {
  DRDACodePoints,
  DRDAMessageTypes,
} from '../enums/drda-codepoints.enum';
import { BaseDRDAResponse } from './drda-response.interface';
import { ColumnMetadata } from './column-metadata.interface';
import { Row } from './row.interface';

/**
 * Response for EXCSATRD (Exchange Server Attributes Response Data Structure)
 */
export interface EXCSATRDResponse extends BaseDRDAResponse {
  type: DRDAMessageTypes.EXCSATRD;
  parameters: {
    serverPublicKey: Buffer; // Server's public key for encryption
    serverVersion: string; // Server version
  };
}

/**
 * Response for ACCRDBRM (Access RDB Response Message)
 */
export interface ACCRDBResponse extends BaseDRDAResponse {
  type: DRDAMessageTypes.ACCRDBRM;
  parameters: {
    svrcod: number; // Server code indicating success or error
    messages?: string[]; // Optional messages from the server
  };
}

/**
 * Response for EXCSQLSET (Execute SQL Statement Response)
 */
export interface EXCSQLSETResponse extends BaseDRDAResponse {
  type: DRDAMessageTypes.EXCSQLSET;
  parameters: {
    rsmd: ColumnMetadata[]; // Result set metadata
    svrcod: number; // Server code indicating success or error
    // Add other specific parameters as needed
  };
  result: Row[]; // The result of the SQL execution
  success: boolean; // Indicates if the operation was successful
  length: number; // Message length
  payload: Buffer; // The actual data or response content
}

/**
 * Response for EXTNAMResponse (Extended Name Response)
 */
export interface EXTNAMResponse extends BaseDRDAResponse {
  type: DRDAMessageTypes.EXTNAM;
  parameters: {
    svrcod: number; // Server code indicating success or error
    message: string[]; // Optional message from the server
    extnam: string; // The extended name
  };
}

/**
 * Response for SECCHKRM (Security Check Response Message)
 */
export interface SECCHKResponse extends BaseDRDAResponse {
  type: DRDAMessageTypes.SECCHKRM;
  parameters: {
    svrcod: number; // Server code indicating success or error
    // Add other specific parameters as needed
  };
}

/**
 * Response for CHNRQSDSS (Chained Request-Response Data Structure)
 */
export interface CHNRQSDSSResponse extends BaseDRDAResponse {
  type: DRDAMessageTypes.CHRNRQSDSS;
  isChained: boolean; // Indicates if the message is part of a chained sequence
  chainedData: ChainedParameter[]; // Array of chained parameters
  parameters: {
    svrcod: number; // Server code indicating success or error
    // Add other specific parameters as needed
  };
}

/**
 * Response for ACCSECRM (Access Security Response Message)
 */
export interface ACCSECRMResponse extends BaseDRDAResponse {
  type: DRDAMessageTypes.ACCSECRM;
  parameters: {
    svrcod: number; // Server code indicating success or error
    message?: string[]; // Optional messages from the server
    serverPublicKey: Buffer; // Server's public key for encryption
    serverVersion: string; // Server version
  };
}

/**
 * Response for SVRCOD (Severity Code)
 */
export interface SVRCODResponse extends BaseDRDAResponse {
  type: DRDAMessageTypes.SVRCOD;
  parameters: {
    svrcod: number; // Server code indicating success or error
    // Add other specific parameters as needed
  };
}

/**
 * Response for SECCHKRM (Security Check Reply Message)
 */
export interface SECCHKRMResponse extends BaseDRDAResponse {
  type: DRDAMessageTypes.SECCHKRM;
  parameters: {
    svrcod: number; // Server code indicating success or error
    message?: string[]; // Optional messages from the server
  };
}
/**
 * Represents a single chained parameter within CHNRQSDSS.
 */
export interface ChainedParameter {
  codePoint: DRDACodePoints; // Code point identifying the parameter type
  data: Buffer; // The data associated with the parameter
}
