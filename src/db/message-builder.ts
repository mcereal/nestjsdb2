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
}
