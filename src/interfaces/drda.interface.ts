// DRDA Message Interface
export interface DRDAResponse {
  length: number; // Message length
  type: string | number; // Message type (e.g., EXCSQLSET, SECCHK, etc.)
  payload: Buffer; // The actual data or response content
}

export interface EXCSATRDResponse extends DRDAResponse {
  success: boolean;
  parameters: any; // You can define a more specific type if you know the structure
}

export interface ACCRDBResponse extends DRDAResponse {
  success: boolean;
  messages?: string[];
}

export interface EXCSQLSETResponse extends DRDAResponse {
  result: any[]; // The result of the SQL execution
}

export interface SECCHKResponse extends DRDAResponse {
  success: boolean; // Whether authentication was successful
  encryptedPassword?: Buffer; // Encrypted password (optional if it doesn't always exist)
}

// General DRDA header interface
export interface DRDAHeader {
  length: number; // Total length of the message
  correlationId: number; // Correlation ID
  dssFlags: number; // DSS flags
  dssType: number; // DSS type
  type?: string; // Message type (e.g., EXCSATRD, ACCSECRM)
  payload?: Buffer; // The actual data or response content
}

// DRDA response types
export type DRDAResponseType =
  | EXCSQLSETResponse
  | SECCHKResponse
  | ACCRDBResponse
  | EXCSATRDResponse
  | DRDAResponse
  | EXCSQLSETResponse;
