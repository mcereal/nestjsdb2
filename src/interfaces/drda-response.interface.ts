// interfaces/drda-response.interface.ts
import { DRDAMessageTypes } from '../enums/drda-codepoints.enum';
import {
  ACCRDBResponse,
  CHNRQSDSSResponse,
  EXCSATRDResponse,
  EXCSQLSETResponse,
  SECCHKResponse,
  SECCHKRMResponse,
} from './drda-specific-responses.interface';

/**
 * Base interface for all DRDA responses.
 */
export interface BaseDRDAResponse {
  length: number; // Message length
  type: DRDAMessageTypes; // Message type
  payload: Buffer; // The actual data or response content
  success: boolean; // Indicates if the operation was successful
  correlationId: number; // Correlation ID for the request
}

/**
 * Extended interface for responses that include additional parameters.
 */
/**
 * Discriminated union for DRDA responses without additional parameters.
 */
export interface IDRDAResponse extends BaseDRDAResponse {
  type: Exclude<
    DRDAMessageTypes,
    | DRDAMessageTypes.EXCSATRD
    | DRDAMessageTypes.ACCRDBRM
    | DRDAMessageTypes.EXCSQLSET
    | DRDAMessageTypes.SECCHKRM
    | DRDAMessageTypes.CHRNRQSDSS
  >;
}

/**
 * Discriminated union of all possible DRDA response types.
 */
export type DRDAResponseType =
  | CHNRQSDSSResponse
  | EXCSQLSETResponse
  | SECCHKResponse
  | ACCRDBResponse
  | BaseDRDAResponse
  | ACCRDBResponse
  | SECCHKResponse
  | EXCSATRDResponse
  | SECCHKRMResponse;
