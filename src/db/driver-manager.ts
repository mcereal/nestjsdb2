// src/db/driver-manager.ts

import fs from "fs-extra";
import path from "path";
import { Logger } from "@nestjs/common";
import { Architecture, Platform } from "../install/enums/install-driver.enum";
import { platformConfig } from "../install/constants/platform-config";

export class DriverManager {
  private readonly logger = new Logger(DriverManager.name);
  private driverHome: string;
  private verified: boolean = false; // Cache the verification status

  constructor(customInstallDir?: string) {
    // Use custom installation directory if provided, otherwise locate based on default logic
    this.driverHome = customInstallDir || this.locateDriverHome();

    // Set the environment variable for the driver home
    this.setEnvironmentVariable("IBM_DB_HOME", this.driverHome);

    // Verify the driver installation
    this.verifyDriver();
  }

  /**
   * Locate the DB2 driver home directory automatically based on platform and architecture.
   * Checks the default installation paths for the current platform and architecture.
   * Falls back to common paths if not found.
   * @returns {string} The path to the driver home directory.
   * @throws Error if the driver cannot be located.
   */
  private locateDriverHome(): string {
    const platform = this.getPlatform();
    const arch = this.getArchitecture();
    const config = platformConfig[platform];

    if (!config) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const defaultDir = config.defaultInstallDir;

    // Define platform-specific paths
    const platformSpecificPaths = this.getPlatformSpecificPaths(
      platform,
      defaultDir
    );

    // Check environment variables for dynamic driver locations
    const envPaths = [
      process.env.DB2_HOME,
      process.env.IBM_DB_HOME,
      process.env.DB2_DIR,
    ].filter(Boolean); // Filter out undefined or null values

    platformSpecificPaths.push(...envPaths);

    for (const dir of platformSpecificPaths) {
      if (fs.existsSync(dir)) {
        this.logger.log(`DB2 CLI driver found at ${dir}`);
        return dir;
      } else {
        this.logger.debug(`DB2 CLI driver not found at ${dir}`);
      }
    }

    throw new Error("DB2 CLI driver directory could not be found.");
  }

  /**
   * Get the current platform as a Platform enum.
   * @returns {Platform} The current platform.
   */
  private getPlatform(): Platform {
    return process.platform as Platform;
  }

  /**
   * Get the current architecture as an Architecture enum.
   * @returns {Architecture} The current architecture.
   */
  private getArchitecture(): Architecture {
    return process.arch as Architecture;
  }

  /**
   * Get platform-specific paths to check for the driver installation.
   * This method defines common installation paths based on the platform.
   * @param platform The platform enum.
   * @param defaultDir The default installation directory for the platform.
   * @returns {string[]} An array of possible installation paths.
   */
  private getPlatformSpecificPaths(
    platform: Platform,
    defaultDir: string
  ): string[] {
    switch (platform) {
      case Platform.WINDOWS:
        return [
          defaultDir,
          path.join(defaultDir, "clidriver"),
          path.resolve(process.cwd(), "clidriver"),
          path.join(process.env.APPDATA || "", "ibm_db2", "clidriver"),
          "C:\\Program Files\\IBM\\db2\\clidriver",
        ];
      case Platform.MACOS:
        return [
          defaultDir,
          path.join(defaultDir, "clidriver"),
          path.resolve(process.cwd(), "clidriver"),
          path.join(process.env.HOME || "", "clidriver"),
          "/usr/local/lib/nestjs-ibm-db2/clidriver",
          "/opt/nestjs-ibm-db2/clidriver",
        ];
      case Platform.LINUX:
      case Platform.AIX:
        return [
          defaultDir,
          path.join(defaultDir, "clidriver"),
          path.resolve(process.cwd(), "clidriver"),
          path.join(process.env.HOME || "", "clidriver"),
          "/usr/local/nestjs-ibm-db2/clidriver",
          "/opt/nestjs-ibm-db2/clidriver",
          "/usr/lib/nestjs-ibm-db2/clidriver",
          "/usr/lib64/nestjs-ibm-db2/clidriver",
          "/usr/share/nestjs-ibm-db2/clidriver",
        ];
      case Platform.ZOS:
        return [
          defaultDir,
          path.join(defaultDir, "clidriver"),
          path.resolve(process.cwd(), "clidriver"),
          "/usr/local/nestjs-ibm-db2/clidriver",
        ];
      default:
        return [defaultDir]; // Fallback for other/unknown platforms
    }
  }

  /**
   * Set an environment variable.
   * @param key The environment variable key.
   * @param value The environment variable value.
   */
  private setEnvironmentVariable(key: string, value: string): void {
    process.env[key] = value;
    this.logger.log(`Environment variable ${key} set to ${value}`);
  }

  /**
   * Get the driver home path.
   * @returns {string} The path to the driver home directory.
   */
  public getDriverHome(): string {
    return this.driverHome;
  }

  /**
   * Verify if the driver is correctly installed and accessible.
   * Caches the verification result to avoid redundant checks.
   * Throws an error if verification fails.
   * @throws Error if required files are missing.
   */
  public verifyDriver(): void {
    if (this.verified) {
      this.logger.log("Driver already verified.");
      return;
    }

    if (!fs.existsSync(this.driverHome)) {
      throw new Error(`DB2 CLI driver not found at ${this.driverHome}`);
    }

    // Get platform and architecture to determine required files
    const platform = this.getPlatform();
    const arch = this.getArchitecture();
    const requiredFiles = this.getRequiredFilesForPlatform(platform, arch);

    requiredFiles.forEach((file) => {
      const filePath = path.join(this.driverHome, file);
      if (!fs.existsSync(filePath)) {
        throw new Error(`Required driver file not found: ${filePath}`);
      }
    });

    this.logger.log(
      `DB2 CLI driver verified successfully at ${this.driverHome}`
    );
    this.verified = true; // Mark as verified
  }

  /**
   * Get the list of required files based on platform and architecture.
   * @param platform The platform enum.
   * @param arch The architecture enum.
   * @returns {string[]} List of required files.
   */
  private getRequiredFilesForPlatform(
    platform: Platform,
    arch: Architecture
  ): string[] {
    switch (platform) {
      case Platform.WINDOWS:
        return ["db2cli.dll", "clidriver\\bin\\db2cli.exe"];
      case Platform.MACOS:
        return arch === Architecture.ARM64
          ? ["libdb2.dylib", "clidriver/bin/db2cli"]
          : ["libdb2.dylib", "clidriver/bin/db2cli"];
      case Platform.LINUX:
        return ["libdb2.so", "clidriver/bin/db2cli"];
      case Platform.AIX:
        return ["libdb2.a", "clidriver/bin/db2cli"];
      case Platform.ZOS:
        return ["libdb2.so", "clidriver/bin/db2cli"]; // Update with actual z/OS driver files as needed
      default:
        return ["db2cli", "libdb2.so"]; // General default case
    }
  }

  /**
   * Refresh the driver location and re-verify if needed.
   * This method is useful if the environment or driver installation changes after initialization.
   * @param customInstallDir Optional custom installation directory to re-locate the driver.
   */
  public refreshDriverLocation(customInstallDir?: string): void {
    this.driverHome = customInstallDir || this.locateDriverHome();
    this.setEnvironmentVariable("IBM_DB_HOME", this.driverHome);
    this.verified = false; // Reset verification status
    this.verifyDriver(); // Re-verify
  }
}
