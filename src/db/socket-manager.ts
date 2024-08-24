import { Socket, createConnection } from "net";
import { connect as tlsConnect, TLSSocket } from "tls";
import { Logger } from "@nestjs/common";
import { Db2ConfigOptions } from "src/interfaces/db2.interface";
import { Db2ConnectionState } from "../enums/db2.enums";
import {
  Db2AuthenticationError,
  Db2ConnectionError,
  Db2Error,
  Db2TimeoutError,
} from "../errors/db2.error";
import { readFileSync } from "fs";
import { SocketUtils } from "./socket-utils";
import { spawn } from "child_process";
import { GSSAPI, Client, Credentials, SecurityContext } from "kerberos";

export class SocketManager {
  private readonly logger = new Logger(SocketManager.name);
  private state: Db2ConnectionState = Db2ConnectionState.DISCONNECTED;

  constructor(private options: Db2ConfigOptions) {
    this.options.connectionTimeout = this.options.connectionTimeout ?? 30000;
    this.options.validateServerCertificate =
      this.options.validateServerCertificate ?? true;
  }

  connect(): Socket | TLSSocket {
    let socket: Socket | TLSSocket;

    this.logger.log(
      `Attempting to connect to ${this.options.host}:${
        this.options.port
      } using ${this.options.useTls ? "TLS" : "plain"} socket.`
    );

    this.state = Db2ConnectionState.CONNECTING;

    if (this.options.useTls) {
      socket = tlsConnect({
        host: this.options.host,
        port: this.options.port,
        rejectUnauthorized: this.options.validateServerCertificate,
        cert: this.options.sslCertificatePath
          ? readFileSync(this.options.sslCertificatePath)
          : undefined,
      });
    } else {
      socket = createConnection({
        host: this.options.host,
        port: this.options.port,
        timeout: this.options.connectionTimeout,
      });
    }

    SocketUtils.applySocketOptions(socket, this.options);
    SocketUtils.setupSocketEvents(socket, this);

    socket.on("connect", async () => {
      this.state = Db2ConnectionState.AUTHENTICATING;
      this.logger.log("Socket connected. Initiating authentication...");
      try {
        await this.handleAuthentication(socket);
        this.state = Db2ConnectionState.CONNECTED;
        this.logger.log(
          "Authentication successful. State updated to CONNECTED."
        );
      } catch (authError) {
        this.handleError(authError, socket);
      }
    });

    socket.on("close", () => {
      this.state = Db2ConnectionState.DISCONNECTED;
      this.logger.log("Socket closed. State updated to DISCONNECTED.");
    });

    socket.on("error", (error) => {
      this.state = Db2ConnectionState.ERROR;
      this.logger.error(`Socket error: ${error.message}`);
      this.handleError(error, socket);
    });

    return socket;
  }

  private async handleAuthentication(
    socket: Socket | TLSSocket
  ): Promise<void> {
    try {
      if (this.options.authType === "kerberos") {
        await this.performKerberosAuthentication(socket);
      } else if (this.options.authType === "jwt" && this.options.jwtTokenPath) {
        await this.performJwtAuthentication(socket);
      } else if (this.options.authType === "db2-user") {
        await this.performUserAuthentication(socket);
      } else {
        throw new Db2AuthenticationError("Unsupported authentication type.");
      }
    } catch (err) {
      this.logger.error(`Authentication error: ${err.message}`);
      this.state = Db2ConnectionState.AUTH_FAILED;
      socket.destroy();
      throw err;
    }
  }

  private async performKerberosAuthentication(
    socket: Socket | TLSSocket
  ): Promise<void> {
    this.logger.log("Using Kerberos authentication.");

    const kinitProcess = spawn("kinit", [this.options.kerberosServiceName]);

    return new Promise((resolve, reject) => {
      kinitProcess.on("close", (code) => {
        if (code !== 0) {
          return reject(
            new Db2AuthenticationError(
              `Kerberos authentication failed with exit code: ${code}`
            )
          );
        }

        this.logger.log(
          "Kerberos ticket obtained, proceeding with GSSAPI handshake."
        );
        const client = new Client(this.options.kerberosServiceName);
        const credentials = new Credentials(
          this.options.kerberosServiceName,
          "INITIATE"
        );
        const context = new SecurityContext(client, credentials);

        context.initSecContext(null, (err, initToken) => {
          if (err) {
            return reject(
              new Db2AuthenticationError(
                `Failed to initialize Kerberos security context: ${err.message}`
              )
            );
          }

          socket.write(initToken, (err) => {
            if (err) {
              return reject(
                new Db2AuthenticationError(
                  `Failed to send Kerberos token: ${err.message}`
                )
              );
            }
            this.logger.log("Kerberos token sent to the DB2 server.");

            socket.once("data", (data) => {
              context.acceptSecContext(data, (err, verifyToken) => {
                if (err || !verifyToken) {
                  return reject(
                    new Db2AuthenticationError("Kerberos handshake failed.")
                  );
                }
                this.logger.log("Kerberos handshake successful.");
                resolve();
              });
            });
          });
        });
      });

      kinitProcess.on("error", (err) => {
        reject(
          new Db2AuthenticationError(
            `Failed to start kinit process: ${err.message}`
          )
        );
      });
    });
  }

  private async performJwtAuthentication(
    socket: Socket | TLSSocket
  ): Promise<void> {
    this.logger.log("Using JWT authentication.");
    const jwtToken = await this.readJwtToken(this.options.jwtTokenPath);
    return new Promise((resolve, reject) => {
      socket.write(`AUTH JWT ${jwtToken}\n`, (err) => {
        if (err) {
          return reject(
            new Db2AuthenticationError(
              `Failed to send JWT token: ${err.message}`
            )
          );
        }
        this.logger.log("JWT token sent for authentication.");
        resolve();
      });
    });
  }

  private async performUserAuthentication(
    socket: Socket | TLSSocket
  ): Promise<void> {
    this.logger.log("Using standard DB2 user authentication.");
    const authCommand = `USER ${this.options.username} PASS ${this.options.password}\n`;
    return new Promise((resolve, reject) => {
      socket.write(authCommand, (err) => {
        if (err) {
          return reject(
            new Db2AuthenticationError(
              `Failed to send user credentials: ${err.message}`
            )
          );
        }
        this.logger.log("User credentials sent for authentication.");
        resolve();
      });
    });
  }

  private async readJwtToken(jwtTokenPath: string): Promise<string> {
    try {
      return readFileSync(jwtTokenPath, "utf-8");
    } catch (err) {
      this.logger.error(`Failed to read JWT token file: ${err.message}`);
      throw new Db2AuthenticationError(
        `Failed to read JWT token file: ${err.message}`
      );
    }
  }

  handleError(error: any, socket: Socket | TLSSocket): void {
    this.state = Db2ConnectionState.ERROR;
    this.logger.error(`Socket error: ${error.message}`);
    socket.destroy();

    if (error.code === "ETIMEDOUT") {
      throw new Db2TimeoutError(`Timeout occurred: ${error.message}`);
    } else if (error.code === "ECONNREFUSED") {
      throw new Db2ConnectionError(`Connection refused: ${error.message}`);
    } else if (error.message.includes("authentication failed")) {
      throw new Db2AuthenticationError(
        `Authentication error: ${error.message}`
      );
    } else {
      throw new Db2Error(`Socket error: ${error.message}`);
    }
  }

  getState(): Db2ConnectionState {
    return this.state;
  }
}
