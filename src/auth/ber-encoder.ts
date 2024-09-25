// src/auth/ber-encoder.ts

export class BerEncoder {
  static encodeLength(length: number): Buffer {
    if (length < 0x80) {
      return Buffer.from([length]);
    }
    const buffer = [];
    let tempLength = length;
    while (tempLength > 0) {
      buffer.unshift(tempLength & 0xff);
      tempLength >>= 8;
    }
    const firstByte = 0x80 | buffer.length;
    return Buffer.from([firstByte, ...buffer]);
  }

  static encodeString(tag: number, value: string): Buffer {
    const strBuffer = Buffer.from(value, 'utf-8');
    const lengthBuffer = this.encodeLength(strBuffer.length);
    return Buffer.from([tag, ...lengthBuffer, ...strBuffer]);
  }

  static encodeInteger(tag: number, value: number): Buffer {
    // For simplicity, assume value fits in one byte
    return Buffer.from([tag, 1, value]);
  }

  static encodeSequence(contents: Buffer): Buffer {
    const lengthBuffer = this.encodeLength(contents.length);
    return Buffer.from([0x30, ...lengthBuffer, ...contents]);
  }

  static encodeBindRequest(
    messageID: number,
    version: number,
    name: string,
    authentication: Buffer,
  ): Buffer {
    const messageIDBuffer = this.encodeInteger(0x02, messageID); // INTEGER
    const protocolVersion = this.encodeInteger(0x02, version); // INTEGER
    const nameBuffer = this.encodeString(0x04, name); // OCTET STRING
    const authenticationBuffer = authentication; // Context-specific (Simple)
    const bindRequestContent = Buffer.concat([
      protocolVersion,
      nameBuffer,
      authenticationBuffer,
    ]);
    const bindRequestSequence = this.encodeSequence(bindRequestContent);
    const bindRequest = this.encodeSequence(
      Buffer.concat([messageIDBuffer, bindRequestSequence]),
    );
    return bindRequest;
  }

  static encodeSimpleAuthentication(password: string): Buffer {
    const tag = 0x80; // [0] OCTET STRING
    const authValue = this.encodeString(tag, password);
    return authValue;
  }
}
