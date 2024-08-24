// src/install/install-driver.ts

import fs from "fs-extra";
import os from "os";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";
import tar from "tar";
import crypto from "crypto";
import { Logger } from "@nestjs/common";
import {
  DownloadOptions,
  InstallOptions,
} from "./interfaces/install-driver.interface";
import { Platform, Architecture } from "./enums/install-driver.enum";
import { platformConfig } from "./constants/platform-config";
import { ErrorCode } from "./enums/error-codes.enum";

const DEFAULT_DOWNLOAD_URL =
  "https://public.dhe.ibm.com/ibmdl/export/pub/software/data/db2/drivers/odbc_cli";
const MAX_RETRIES = 3;

const logger = new Logger("DB2 Driver Installer");

const LICENSE_AGREEMENT = `
****************************************
You are downloading a package which includes the Node.js module for IBM DB2/Informix. The module is licensed under the Apache License 2.0. The package also includes IBM ODBC and CLI Driver from IBM, which is automatically downloaded as the node module is installed on your system/device. The license agreement to the IBM ODBC and CLI Driver is available in <license-file>. Check for additional dependencies, which may come with their own license agreement(s). Your use of the components of the package and dependencies constitutes your acceptance of their respective license agreements. If you do not accept the terms of any license agreement(s), then delete the relevant component(s) from your device.
****************************************
`;

const handleError = (error: Error): void => {
  switch ((error as any).code) {
    case ErrorCode.PERMISSION_DENIED:
      logger.error(
        "Permission denied. Try running the command with elevated privileges (e.g., using 'sudo') or specify a different installation directory."
      );
      break;
    case ErrorCode.NETWORK_ERROR:
      logger.error(
        "Network error. Check your internet connection and try again."
      );
      break;
    case ErrorCode.FILE_NOT_FOUND:
      logger.error("File not found. Ensure that the download URL is correct.");
      break;
    case ErrorCode.CHECKSUM_MISMATCH:
      logger.error(
        "Checksum validation failed. The downloaded file may be corrupted. Try downloading again."
      );
      break;
    case ErrorCode.UNSUPPORTED_PLATFORM:
      logger.error(
        "Unsupported platform or architecture. Please check the documentation for supported platforms."
      );
      break;
    default:
      logger.error(`An unexpected error occurred: ${error.message}`);
      break;
  }
  process.exit(1);
};

/**
 * Determine the default installation directory based on the OS.
 * @returns {string} The default installation directory path.
 */
export const getDefaultInstallDir = (): string => {
  const platform = getPlatform();
  const config = platformConfig[platform];
  return config
    ? config.defaultInstallDir
    : path.resolve(process.cwd(), "installer");
};

/**
 * Determine the appropriate driver file name based on the platform and architecture.
 * @param platform - The current platform.
 * @param arch - The current architecture.
 * @returns {string} The driver file name.
 */
const getDriverFileName = (platform: Platform, arch: Architecture): string => {
  const config = platformConfig[platform];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  const driverFileName = config.driverFileName;
  if (typeof driverFileName === "string") {
    return driverFileName;
  }

  if (driverFileName[arch] !== undefined) {
    if (platform === Platform.MACOS && arch === Architecture.ARM64) {
      logger.warn(
        "Apple Silicon (ARM64) detected. To run this installer, you must use Rosetta."
      );
      logger.warn(
        "Please run the following command to install Rosetta if you haven't already:"
      );
      logger.warn(`\n  softwareupdate --install-rosetta\n`);
      logger.warn(
        "Then, you can run this script using Rosetta by running the following command:"
      );
      logger.warn(`\n  arch -x86_64 node src/install/install-driver.js\n`);
      process.exit(1);
    }
    return driverFileName[arch] || "";
  }

  throw new Error(
    `Unsupported architecture: ${arch} for platform: ${platform}`
  );
};
/**
 * Get the current platform as a Platform enum.
 * @returns {Platform} The current platform.
 */
const getPlatform = (): Platform => {
  return os.platform() as Platform;
};

/**
 * Get the current architecture as an Architecture enum.
 * @returns {Architecture} The current architecture.
 */
const getArchitecture = (): Architecture => {
  return os.arch() as Architecture;
};

/**
 * Downloads a file from the specified URL and saves it to the given output path.
 * @param options - Object containing URL, output path, and retry count.
 * @returns {Promise<void>}
 */
const downloadFile = async (options: DownloadOptions): Promise<void> => {
  const {
    url,
    outputPath,
    retryCount = MAX_RETRIES,
    checksum,
    skipSslVerification,
  } = options;
  logger.log(`Downloading from ${url} to ${outputPath}`);

  for (let attempt = 1; attempt <= retryCount; attempt++) {
    try {
      const response = await axios({
        url,
        method: "GET",
        responseType: "stream",
        timeout: 60000,
        httpsAgent: skipSslVerification
          ? new (require("https").Agent)({ rejectUnauthorized: false })
          : undefined,
      });

      await new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(outputPath);
        response.data.pipe(writer);
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      logger.log(`Downloaded successfully to ${outputPath}`);

      if (checksum) {
        await validateChecksum(outputPath, checksum);
      }

      return;
    } catch (error) {
      logger.warn(`Attempt ${attempt} failed: ${error.message}`);
      if (attempt === retryCount) {
        logger.error(`Failed to download after ${retryCount} attempts`);
        throw new Error(`Download failed: ${error.message}`);
      }
    }
  }
};

/**
 * Validates the checksum of a downloaded file.
 * @param filePath - The path of the downloaded file.
 * @param expectedChecksum - The expected checksum value.
 * @returns {Promise<void>}
 */
const validateChecksum = async (
  filePath: string,
  expectedChecksum: string
): Promise<void> => {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash("sha256");
  hashSum.update(fileBuffer);
  const fileChecksum = hashSum.digest("hex");

  if (fileChecksum !== expectedChecksum) {
    const error = new Error("Checksum mismatch");
    (error as any).code = ErrorCode.CHECKSUM_MISMATCH;
    throw error;
  }

  logger.log(`Checksum validation passed for ${filePath}`);
};

/**
 * Extracts a zip or tar.gz file to the specified directory.
 * @param filePath - The path of the zip or tar.gz file to extract.
 * @param extractPath - The directory to extract the files to.
 * @returns {void}
 */
const extractFile = (filePath: string, extractPath: string): void => {
  logger.log(`Extracting ${filePath} to ${extractPath}`);
  if (filePath.endsWith(".zip")) {
    const zip = new AdmZip(filePath);
    zip.extractAllTo(extractPath, true);
  } else if (filePath.endsWith(".tar.gz")) {
    tar.x({
      file: filePath,
      cwd: extractPath,
      sync: true,
    });
  }
  logger.log(`Extracted successfully to ${extractPath}`);
};

/**
 * Main function to handle driver installation.
 * Downloads the DB2 CLI driver based on the platform and architecture.
 * Extracts the driver files and sets the IBM_DB_HOME environment variable.
 * Cleans up the downloaded driver file after installation.
 * Logs the installation status.
 * Exits the process with an error code if installation fails.
 * @param options - The installation options.
 * @returns {Promise<void>}
 */
export const installDriver = async (
  options: InstallOptions = {}
): Promise<void> => {
  try {
    logger.log(LICENSE_AGREEMENT);

    const installDir = options.outputPath || getDefaultInstallDir();
    const clidriverDir = path.join(installDir, "clidriver");

    if (options.force) {
      logger.warn(
        "Force mode enabled: Existing installation will be overwritten."
      );
      await fs.remove(clidriverDir);
    }

    await fs.ensureDir(installDir);

    const platform = getPlatform();
    const arch = getArchitecture();

    const driverFileName = getDriverFileName(platform, arch);
    const driverUrl = `${
      options.downloadUrl || DEFAULT_DOWNLOAD_URL
    }/${driverFileName}`;
    const driverFilePath = path.join(installDir, driverFileName);

    await downloadFile({
      url: driverUrl,
      outputPath: driverFilePath,
      retryCount: options.retryCount || MAX_RETRIES,
      checksum: options.checksum,
      skipSslVerification: options.skipSslVerification,
    });

    extractFile(driverFilePath, clidriverDir);

    process.env.IBM_DB_HOME = clidriverDir;

    await fs.remove(driverFilePath);

    logger.log("DB2 CLI driver installed successfully.");
  } catch (error) {
    handleError(error);
  }
};
