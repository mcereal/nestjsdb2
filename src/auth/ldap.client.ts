// src/auth/ldap.client.ts

import { Socket } from 'net';
import { Logger } from '@nestjs/common';
import { BerEncoder } from './ber-encoder';

export interface LdapConfig {
  ldapUrl: string;
  username: string;
  password: string;
}

export class LdapClient {
  private socket: Socket;
  private logger: Logger;
  private messageID: number;
  private responseBuffer: Buffer;
  private resolveBind: () => void;
  private rejectBind: (reason?: any) => void;

  constructor(private config: LdapConfig) {
    this.logger = new Logger(LdapClient.name);
    this.socket = new Socket();
    this.messageID = 1;
    this.responseBuffer = Buffer.alloc(0);
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { hostname, port, protocol } = this.parseLdapUrl(
        this.config.ldapUrl,
      );

      this.socket.connect(port, hostname, () => {
        this.logger.log(`Connected to LDAP server at ${hostname}:${port}`);
        resolve();
      });

      this.socket.on('error', (err) => {
        this.logger.error(`LDAP connection error: ${err.message}`);
        reject(err);
      });
    });
  }

  bind(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.resolveBind = resolve;
      this.rejectBind = reject;

      this.socket.on('data', this.handleData.bind(this));

      const bindRequest = BerEncoder.encodeBindRequest(
        this.messageID++,
        3, // LDAP protocol version
        this.config.username,
        BerEncoder.encodeSimpleAuthentication(this.config.password),
      );

      this.logger.log('Sending LDAP Bind request');
      this.socket.write(bindRequest);
    });
  }

  close(): void {
    this.socket.end();
    this.socket.destroy();
    this.logger.log('LDAP connection closed');
  }

  private handleData(data: Buffer): void {
    this.responseBuffer = Buffer.concat([this.responseBuffer, data]);

    // Minimal parsing to detect the LDAP Bind Response
    // LDAP Bind Response has a tag of 0x61 (Application 1)
    // It should contain a resultCode

    // Check if we have at least the header (first 2 bytes for tag and length)
    if (this.responseBuffer.length < 2) {
      return; // Wait for more data
    }

    const tag = this.responseBuffer[0];
    if (tag !== 0x61) {
      this.logger.error(`Unexpected LDAP response tag: ${tag.toString(16)}`);
      this.rejectBind(new Error('Unexpected LDAP response'));
      this.socket.removeListener('data', this.handleData.bind(this));
      return;
    }

    const length = this.decodeLength(this.responseBuffer.slice(1));

    const totalLength = 1 + this.lengthOfLength(length) + length;

    if (this.responseBuffer.length < totalLength) {
      return; // Wait for more data
    }

    const response = this.responseBuffer.slice(0, totalLength);
    this.responseBuffer = this.responseBuffer.slice(totalLength);

    // Minimal parsing to extract resultCode
    // Structure:
    // BindResponse ::= [APPLICATION 1] SEQUENCE {
    //   COMPONENTS...
    //   resultCode      ENUMERATED { ... }
    // }

    // For simplicity, search for the ENUMERATED type (0x0A)
    const resultCodeIndex = response.indexOf(0x0a);
    if (resultCodeIndex === -1 || resultCodeIndex + 2 >= response.length) {
      this.logger.error('Malformed LDAP Bind Response');
      this.rejectBind(new Error('Malformed LDAP Bind Response'));
      this.socket.removeListener('data', this.handleData.bind(this));
      return;
    }

    const resultCode = response[resultCodeIndex + 2];
    if (resultCode === 0) {
      this.logger.log('LDAP Bind successful');
      this.resolveBind();
    } else {
      this.logger.error(`LDAP Bind failed with resultCode: ${resultCode}`);
      this.rejectBind(
        new Error(`LDAP Bind failed with resultCode: ${resultCode}`),
      );
    }

    // Remove listener after handling response
    this.socket.removeListener('data', this.handleData.bind(this));
  }

  private parseLdapUrl(url: string): {
    protocol: string;
    hostname: string;
    port: number;
  } {
    const match = url.match(/^(ldap|ldaps):\/\/([^:/]+):?(\d+)?$/);
    if (!match) {
      throw new Error(`Invalid LDAP URL: ${url}`);
    }

    const protocol = match[1];
    const hostname = match[2];
    const port = match[3]
      ? parseInt(match[3], 10)
      : protocol === 'ldaps'
        ? 636
        : 389;

    return { protocol, hostname, port };
  }

  private decodeLength(buffer: Buffer): number {
    const firstByte = buffer[0];
    if (firstByte < 0x80) {
      return firstByte;
    }
    const numBytes = firstByte & 0x7f;
    let length = 0;
    for (let i = 1; i <= numBytes; i++) {
      length = (length << 8) + buffer[i];
    }
    return length;
  }

  private lengthOfLength(length: number): number {
    if (length < 0x80) {
      return 1;
    }
    let numBytes = 0;
    let tempLength = length;
    while (tempLength > 0) {
      numBytes++;
      tempLength >>= 8;
    }
    return 1 + numBytes;
  }
}
