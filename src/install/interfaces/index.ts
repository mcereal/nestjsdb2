// src/install/interfaces/index.ts

/**
 * @fileoverview This file serves as the entry point for the install interfaces module.
 * It exports all the interfaces available in the module, including InstallDriver, PlatformConfig.
 * This allows consumers of the module to easily import and use the interfaces in their applications.
 *
 * @requires InstallDriver from "./install-driver.interface"
 * @requires PlatformConfig from "./platform-config.interface"
 *
 * @exports InstallDriver
 * @exports PlatformConfig
 */

export * from "./install-driver.interface";
export * from "./platform-config.interface";
