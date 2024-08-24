// src/db/socket-utils.ts

/**
 * @fileoverview This file contains utility functions for managing socket connections.
 * The SocketUtils class provides methods for applying custom socket options and handling
 * socket events, such as connection, data reception, error, and closure. These methods are
 * used to configure and manage socket connections in the Db2 module, ensuring consistent
 * behavior and error handling across different connection scenarios.
 *
 * @class SocketUtils
 *
 * @requires Logger from "@nestjs/common"
 * @requires Socket from "net"
 * @requires TLSSocket from "tls"
 * @requires Db2ConfigOptions from "src/interfaces/db2.interface"
 * @requires SocketManager from "./socket-manager"
 *
 * @exports SocketUtils
 */

import { Socket } from "net";
import { Logger } from "@nestjs/common";
import { Db2ConfigOptions } from "src/interfaces/db2.interface";
import { TLSSocket } from "tls";
import { SocketManager } from "./socket-manager";

/**
 * Utility class for managing socket connections.
 * This class provides methods for applying custom socket options and handling socket events.
 *
 * @class SocketUtils
 *
 * @static
 * @public
 * @exports SocketUtils
 *
 * @requires Logger
 *
 * @param {Socket | TLSSocket} socket - The socket connection to configure.
 * @param {Db2ConfigOptions} options - The configuration options for the socket connection.
 *
 * @property {Logger} logger - The logger instance for logging socket events and errors.
 *
 * @method applySocketOptions - Applies custom socket options to the socket connection.
 * @method setupSocketEvents - Sets up event listeners for socket connection events.
 *
 */
export class SocketUtils {
  static logger = new Logger(SocketUtils.name);

  /**
   * Applies custom socket options to the socket connection.
   * This method checks the configuration options and sets the socket options accordingly.
   *
   * @param {Socket | TLSSocket} socket - The socket connection to configure.
   * @param {Db2ConfigOptions} options - The configuration options for the socket connection.
   *
   * @returns {void}
   */
  static applySocketOptions(
    socket: Socket | TLSSocket,
    options: Db2ConfigOptions
  ): void {
    if (socket && options.socketOptions) {
      this.logger.log("Applying custom socket options.");

      if (options.socketOptions.keepAlive !== undefined) {
        const initialDelay = options.socketOptions.keepAliveInitialDelay || 0;
        socket.setKeepAlive(options.socketOptions.keepAlive, initialDelay);
        this.logger.log(
          `Socket keep-alive set to ${options.socketOptions.keepAlive} with initial delay ${initialDelay} ms.`
        );
      }

      if (options.socketOptions.noDelay !== undefined) {
        socket.setNoDelay(options.socketOptions.noDelay);
        this.logger.log(
          `Socket noDelay set to ${options.socketOptions.noDelay}.`
        );
      }
    }
  }

  /**
   * Sets up event listeners for socket connection events.
   * This method defines event handlers for connection, data reception, error, and closure events.
   *
   * @param {Socket | TLSSocket} socket - The socket connection to configure.
   * @param {SocketManager} socketManager - The socket manager instance for handling socket events.
   *
   * @returns {void}
   */
  static setupSocketEvents(
    socket: Socket | TLSSocket,
    socketManager: SocketManager
  ): void {
    socket.on("connect", () => {
      this.logger.log("Socket connected.");
    });

    socket.on("data", (data) => {
      this.logger.log(`Received data: ${data.toString()}`);
    });

    socket.on("error", (err) => {
      this.logger.error(`Socket error: ${err.message}`);
      socketManager.handleError(err, socket);
    });

    socket.on("close", () => {
      this.logger.log("Socket closed.");
    });
  }
}
