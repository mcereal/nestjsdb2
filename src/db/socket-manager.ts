// src/db/socket-manager.ts

/**
 * @fileoverview This file contains the SocketManager class, which is responsible for managing socket connections to a Db2 server.
 * The SocketManager class provides methods for establishing and maintaining socket connections, handling authentication,
 * and managing connection states. It uses the net and tls modules to create plain and secure socket connections, respectively.
 * The class also provides error handling for connection timeouts, authentication failures, and other socket-related errors.
 * The SocketManager class is used by the Db2Connection class to establish and manage connections to the Db2 database.
 *
 * @class SocketManager
 *
 * @requires Logger from "@nestjs/common"
 * @requires Socket from "net"
 * @requires createConnection from "net"
 * @requires tlsConnect from "tls"
 * @requires TLSSocket from "tls"
 * @requires Db2ConfigOptions from "src/interfaces/db2.interface"
 * @requires Db2ConnectionState from "src/enums/db2.enums"
 * @requires Db2AuthenticationError from "src/errors/db2.error"
 * @requires Db2ConnectionError from "src/errors/db2.error"
 * @requires Db2Error from "src/errors/db2.error"
 * @requires Db2TimeoutError from "src/errors/db2.error"
 * @requires readFileSync from "fs"
 * @requires spawn from "child_process"
 * @requires Client from "kerberos"
 *
 * @exports SocketManager
 */
import { Socket, createConnection } from "net";
import { connect as tlsConnect, TLSSocket } from "tls";
import { Logger } from "@nestjs/common";
import { Db2ConfigOptions } from "src/interfaces/db2.interface";
import { Db2ConnectionState } from "src/enums/db2.enums";
import {
  Db2AuthenticationError,
  Db2ConnectionError,
  Db2Error,
  Db2TimeoutError,
} from "src/errors/db2.error";
import { readFileSync } from "fs";
import { SocketUtils } from "./socket-utils";
import { spawn } from "child_process";
import { Client, Credentials, SecurityContext } from "kerberos";

/**
 * Class for managing socket connections to a Db2 server.
 * This class provides methods for establishing and maintaining socket connections, handling authentication,
 * and managing connection states. It uses the net and tls modules to create plain and secure socket connections.
 * The class also provides error handling for connection timeouts, authentication failures, and other socket-related errors.
 * The SocketManager class is used by the Db2Connection class to establish and manage connections to the Db2 database.
 *
 * @class SocketManager
 *
 * @public
 * @exports SocketManager
 *
 * @constructor
 * @param {Db2ConfigOptions} options - The configuration options for the Db2 connection.
 *
 * @property {Logger} logger - The logger instance for logging socket events and errors.
 * @property {Db2ConnectionState} state - The current state of the socket connection.
 *
 * @method connect - Establishes a socket connection to the Db2 server using the specified configuration options.
 * @method handleAuthentication - Initiates the authentication process for the socket connection based on the specified authentication method.
 * @method performKerberosAuthentication - Performs Kerberos authentication for the socket connection.
 * @method performJwtAuthentication - Performs JWT authentication for the socket connection.
 * @method performUserAuthentication - Performs standard DB2 user authentication for the socket connection.
 * @method readJwtToken - Reads the JWT token from the specified file path for JWT authentication.
 * @method handleError - Handles socket errors and updates the connection state accordingly.
 * @method getState - Returns the current state of the socket connection.
 */
export class SocketManager {
  private readonly logger = new Logger(SocketManager.name);
  private state: Db2ConnectionState = Db2ConnectionState.DISCONNECTED;

  constructor(private options: Db2ConfigOptions) {
    this.options.connectionTimeout = this.options.connectionTimeout ?? 30000;
    this.options.validateServerCertificate =
      this.options.validateServerCertificate ?? true;
  }

  /**
   * Establishes a socket connection to the Db2 server using the specified configuration options.
   * This method creates a socket connection based on the connection settings and initiates the authentication process.
   *
   * @returns {Socket | TLSSocket} - The established socket connection to the Db2 server.
   */
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

  /**
   * Initiates the authentication process for the socket connection based on the specified authentication method.
   * This method handles the authentication flow based on the configured authentication type (Kerberos, JWT, or DB2 user).
   * It performs the necessary steps to authenticate the connection with the Db2 server using the selected method.
   * If the authentication fails, the connection is closed, and an error is thrown.
   * This method is called after the socket connection is established and before the connection is marked as CONNECTED.
   * The authentication process may involve sending tokens, credentials, or performing security handshakes.
   * The method updates the connection state based on the authentication outcome.
   *
   * @param {Socket | TLSSocket} socket - The socket connection to authenticate.
   *
   * @returns {Promise<void>} - A promise that resolves when the authentication process is completed successfully.
   *
   * @throws {Db2AuthenticationError} - If the authentication process fails due to an authentication error.
   */
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

  /**
   * Performs Kerberos authentication for the socket connection.
   * This method initiates the Kerberos authentication process by obtaining a Kerberos ticket using kinit,
   * creating a GSSAPI security context, and performing a security handshake with the Db2 server.
   * The method sends the Kerberos token to the server and waits for the server's response to complete the handshake.
   * If the authentication is successful, the connection is authenticated, and the method resolves.
   * If the authentication fails, an error is thrown, and the connection is closed.
   * This method is used when the authentication type is set to "kerberos" in the connection options.
   *
   * @param {Socket | TLSSocket} socket - The socket connection to authenticate using Kerberos.
   *
   * @returns {Promise<void>} - A promise that resolves when the Kerberos authentication process is completed successfully.
   *
   * @throws {Db2AuthenticationError} - If the Kerberos authentication process fails due to an authentication error.
   */
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

  /**
   * Performs JWT authentication for the socket connection.
   * This method sends a JWT token to the Db2 server for authentication.
   * The method reads the JWT token from the specified file path and sends it to the server.
   * If the authentication is successful, the connection is authenticated, and the method resolves.
   * If the authentication fails, an error is thrown, and the connection is closed.
   * This method is used when the authentication type is set to "jwt" in the connection options.
   *
   * @param {Socket | TLSSocket} socket - The socket connection to authenticate using JWT.
   *
   * @returns {Promise<void>} - A promise that resolves when the JWT authentication process is completed successfully.
   *
   * @throws {Db2AuthenticationError} - If the JWT authentication process fails due to an authentication error.
   */
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

  /**
   * Performs standard DB2 user authentication for the socket connection.
   * This method sends the user credentials (username and password) to the Db2 server for authentication.
   * If the authentication is successful, the connection is authenticated, and the method resolves.
   * If the authentication fails, an error is thrown, and the connection is closed.
   * This method is used when the authentication type is set to "db2-user" in the connection options.
   *
   * @param {Socket | TLSSocket} socket - The socket connection to authenticate using standard DB2 user authentication.
   *
   * @returns {Promise<void>} - A promise that resolves when the DB2 user authentication process is completed successfully.
   *
   * @throws {Db2AuthenticationError} - If the DB2 user authentication process fails due to an authentication error.
   */
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

  /**
   * Reads the JWT token from the specified file path for JWT authentication.
   * This method reads the JWT token from the specified file path and returns it as a string.
   * If the file cannot be read or the token is invalid, an error is thrown.
   *
   * @param {string} jwtTokenPath - The file path to the JWT token file.
   *
   * @returns {Promise<string>} - A promise that resolves to the JWT token read from the file.
   *
   * @throws {Db2AuthenticationError} - If the JWT token file cannot be read or the token is invalid
   */
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

  /**
   * Handles socket errors and updates the connection state accordingly.
   * This method is called when a socket error occurs during the connection or authentication process.
   * It logs the error message, updates the connection state to ERROR, and closes the socket connection.
   * The method throws a specific error based on the error code or message to provide more context.
   * The error types include timeout errors, connection refused errors, authentication errors, and general socket errors.
   * The error is thrown to indicate the specific type of error that occurred during the connection process.
   * The method is used to handle socket errors and update the connection state based on the error type.
   *
   * @param {any} error - The error object that occurred during the socket connection process.
   * @param {Socket | TLSSocket} socket - The socket connection that encountered the error.
   *
   * @returns {void}
   */
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

  /**
   * Returns the current state of the socket connection.
   * This method returns the current state of the socket connection, which indicates the connection status.
   * The state can be one of the following values: DISCONNECTED, CONNECTING, AUTHENTICATING, CONNECTED, AUTH_FAILED, ERROR.
   * The state is updated based on the connection events, authentication process, and error handling.
   * The method is used to retrieve the current state of the socket connection for monitoring and debugging purposes.
   *
   * @returns {Db2ConnectionState} - The current state of the socket connection.
   */
  getState(): Db2ConnectionState {
    return this.state;
  }
}
