// interfaces/drda-header.interface.ts
export interface DRDAHeader {
  length: number; // Total length of the message in bytes
  correlationId: number; // Correlation ID to match requests and responses
  dssFlags: number; // DSS Flags indicating message properties
  dssType: number; // DSS Type indicating the message type (e.g., RQSDSS)
  payload: Buffer; // The actual data or response content
}
