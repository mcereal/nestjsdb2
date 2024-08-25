// src/cli/interfaces/index.ts

/**
 * @fileoverview This file serves as the entry point for the cli interfaces module.
 * It exports all the interfaces available in the module, including CliOptions, PlatformConfig, InstallDriver.
 * This allows consumers of the module to easily import and use the interfaces in their applications.
 *
 * @requires CliOptions from "./cli.interface"
 * @requires PlatformConfig from "./platform-config.interface"
 * @requires InstallDriver from "./install-driver.interface"
 *
 *
 * @exports CliOptions
 * @exports PlatformConfig
 * @exports InstallDriver
 */

export * from "./cli.interface";
export * from "./platform-config.interface";
export * from "./install-driver.interface";
