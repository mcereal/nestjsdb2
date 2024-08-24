// src/db/socket-utils.ts

import { Socket } from "net";
import { Logger } from "@nestjs/common";
import { Db2ConfigOptions } from "src/interfaces/db2.interface";
import { TLSSocket } from "tls";
import { SocketManager } from "./socket-manager";

export class SocketUtils {
  static logger = new Logger(SocketUtils.name);

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
