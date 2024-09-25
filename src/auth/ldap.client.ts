// src/auth/simple-ldap-client.ts

import { Socket, connect as netConnect } from 'net';
import { TLSSocket, connect as tlsConnect, ConnectionOptions } from 'tls';
import { Logger } from '@nestjs/common';
import { BerEncoder } from './ber-encoder';
import { URL } from 'url';

export interface LdapConfig {
  ldapUrl: string; // e.g., ldap://localhost:389 or ldaps://localhost:636
  username: string;
  password: string;
  tlsOptions?: ConnectionOptions; // Optional TLS configurations
}

export class SimpleLdapClient {
  private socket: Socket | TLSSocket;
  private logger: Logger;
  private messageID: number;
  private responseBuffer: Buffer;
  private resolveBind!: () => void;
  private rejectBind!: (reason?: any) => void;

  constructor(private config: LdapConfig) {
    this.logger = new Logger(SimpleLdapClient.name);
    this.socket = new Socket();
    this.messageID = 1;
    this.responseBuffer = Buffer.alloc(0);
  }

  /**
   * Establishes a connection to the LDAP server.
   * Supports both LDAP (plain TCP) and LDAPS (TLS).
   */
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      const { hostname, port, protocol, tlsOptions } = this.parseLdapUrl(
        this.config.ldapUrl,
      );

      if (protocol === 'ldaps') {
        // Establish a secure TLS connection
        this.socket = tlsConnect(port, hostname, tlsOptions || {}, () => {
          if ((this.socket as TLSSocket).authorized) {
            this.logger.log(
              `Securely connected to LDAPS server at ${hostname}:${port}`,
            );
            resolve();
          } else {
            this.logger.warn(
              `TLS connection not authorized: ${(this.socket as TLSSocket).authorizationError}`,
            );
            reject(
              new Error(
                `TLS connection not authorized: ${(this.socket as TLSSocket).authorizationError}`,
              ),
            );
          }
        });
      } else {
        // Establish a plain TCP connection
        this.socket = netConnect(port, hostname, () => {
          this.logger.log(`Connected to LDAP server at ${hostname}:${port}`);
          resolve();
        });
      }

      // Handle connection errors
      this.socket.on('error', (err) => {
        this.logger.error(`LDAP connection error: ${err.message}`);
        reject(err);
      });
    });
  }

  /**
   * Performs the LDAP bind (authentication) operation.
   */
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

  /**
   * Closes the LDAP connection gracefully.
   */
  close(): void {
    if (this.socket) {
      this.socket.end();
      this.socket.destroy();
      this.logger.log('LDAP connection closed');
    }
  }

  /**
   * Handles incoming data from the LDAP server.
   */
  private handleData(data: Buffer): void {
    this.responseBuffer = Buffer.concat([this.responseBuffer, data]);

    // Minimal parsing to detect the LDAP Bind Response
    if (this.responseBuffer.length < 2) {
      return; // Wait for more data
    }

    const tag = this.responseBuffer[0];
    if (tag !== 0x61) {
      // BindResponse tag
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

    // Extract resultCode (ENUMERATED type 0x0A)
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

  /**
   * Parses the LDAP URL and extracts protocol, hostname, and port.
   */
  private parseLdapUrl(urlString: string): {
    protocol: string;
    hostname: string;
    port: number;
    tlsOptions?: ConnectionOptions;
  } {
    try {
      const url = new URL(urlString);

      // Extract protocol without the trailing colon
      const protocol = url.protocol.slice(0, -1).toLowerCase();
      if (protocol !== 'ldap' && protocol !== 'ldaps') {
        throw new Error(`Unsupported protocol: ${protocol}`);
      }

      const hostname = url.hostname;
      const port = url.port
        ? parseInt(url.port, 10)
        : protocol === 'ldaps'
          ? 636
          : 389;

      // Optional: Configure TLS options if using ldaps
      let tlsOptions: ConnectionOptions | undefined = undefined;
      if (protocol === 'ldaps') {
        tlsOptions = {
          // Example TLS options (customize as needed)
          rejectUnauthorized: true, // Ensure server certificate is valid
          // ca: [fs.readFileSync('path/to/ca.pem')], // Optional: Trusted CA certificates
          // key: fs.readFileSync('path/to/client-key.pem'), // Optional: Client key
          // cert: fs.readFileSync('path/to/client-cert.pem'), // Optional: Client certificate
        };
      }

      return { protocol, hostname, port, tlsOptions };
    } catch (error) {
      throw new Error(`Invalid LDAP URL: ${urlString}`);
    }
  }

  /**
   * Decodes the ASN.1 BER length field.
   */
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

  /**
   * Calculates the number of bytes used to encode the length.
   */
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
