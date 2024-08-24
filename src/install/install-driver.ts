// src/install/install-driver.ts

import fs from "fs-extra";
import os from "os";
import path from "path";
import axios from "axios";
import AdmZip from "adm-zip";
import readline from "readline";
import crypto from "crypto";
import { Logger } from "@nestjs/common";
import {
  DownloadOptions,
  InstallOptions,
} from "./interfaces/install-driver.interface";
import { Platform, Architecture } from "./enums/install-driver.enum";
import { platformConfig } from "./constants/platform-config";
import { ErrorCode } from "./enums/error-codes.enum";
import { exec, execSync } from "child_process";
import { fetchAvailableVersions } from "../cli/db2-cli";
import { CLIOptions } from "../cli/interfaces";

const DRIVER_BASE_URL =
  "https://public.dhe.ibm.com/ibmdl/export/pub/software/data/db2/drivers/odbc_cli/";
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
 * Determine the default installation directory based on the OS and configuration file,
 * and check if the driver is already installed.
 * @param config - The loaded configuration options.
 * @returns {Promise<{installDir: string, isInstalled: boolean}>} - The default installation directory path and whether the driver is installed.
 */
export const getOrCheckDriverInstallation = async (
  config: InstallOptions = {}
): Promise<{ installDir: string; isInstalled: boolean }> => {
  const installDir =
    config.installDir ||
    process.env.IBM_DB_HOME ||
    (platformConfig[os.platform()]?.defaultInstallDir ??
      path.resolve(process.cwd(), "installer"));

  // Use version-specific directory directly
  const version = config.version || "v11.5.9"; // Replace with dynamic versioning logic as needed
  const driverPath = path.join(installDir, version);
  const isInstalled = await fs.pathExists(driverPath);

  logger.log(`Checking installation directory: ${installDir}`);
  logger.log(`Driver installed: ${isInstalled ? "Yes" : "No"}`);

  return { installDir, isInstalled };
};

/**
 * Determine the appropriate driver file name based on the platform and architecture.
 * @param platform - The current platform.
 * @param arch - The current architecture.
 * @returns {string} The driver file name.
 */
export const getDriverFileName = (
  platform: Platform,
  arch: Architecture
): string => {
  const config = platformConfig[platform];
  if (!config) {
    throw new Error(`Unsupported platform: ${platform}`);
  }

  // Correctly access the driver file name from the configuration
  const driverFileName = config.driverFileName[arch];
  if (!driverFileName) {
    logger.error(
      `No driver file found for platform ${platform} with architecture ${arch}`
    );
    process.exit(1);
  }

  if (platform === Platform.MACOS && arch === Architecture.ARM64) {
    try {
      // Check if currently running under Rosetta (x86_64) and if ts-node is available
      const isRosetta = execSync("arch").toString().trim() === "i386";
      const tsNodeExists = execSync("which ts-node").toString().trim();

      if (!isRosetta) {
        if (tsNodeExists) {
          // Construct the command to switch to Rosetta using ts-node with env variables
          const command = `env LICENSE_AGREEMENT_SHOWN=true arch -x86_64 ts-node ${path.resolve(
            process.argv[1]
          )} ${process.argv.slice(2).join(" ")}`;
          logger.log(
            `Switching to Rosetta (x86_64) environment using ts-node...`
          );
          logger.log(`Running command: ${command}`);

          // Execute the command to restart under Rosetta
          execSync(command, {
            stdio: "inherit",
            env: { ...process.env, LICENSE_AGREEMENT_SHOWN: "true" },
          });
          process.exit(0); // Exit the current script to avoid running further in the wrong architecture
        } else {
          logger.error(
            "ts-node is required but not found. Please install ts-node globally using npm."
          );
          process.exit(1);
        }
      } else {
        logger.log(
          "Running under Rosetta (x86_64) with ts-node available. Continuing installation..."
        );
        return driverFileName; // Use the correct driver file name for ARM under Rosetta
      }
    } catch (error) {
      logger.error(
        "Error checking Rosetta environment or ts-node availability:",
        error.message
      );
      process.exit(1);
    }
  }

  return driverFileName; // Return the resolved driver file name
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
 * @returns {Promise<void>}
 */
const extractFile = async (
  filePath: string,
  extractPath: string
): Promise<void> => {
  logger.log(`Extracting ${filePath} to ${extractPath}`);

  try {
    // Ensure the extraction path exists
    fs.ensureDirSync(extractPath);

    if (filePath.endsWith(".zip")) {
      const zip = new AdmZip(filePath);
      zip.extractAllTo(extractPath, true);
    } else if (filePath.endsWith(".tar.gz")) {
      // Extract directly into the final extractPath
      const command = `/usr/bin/tar -xzf "${filePath}" -C "${extractPath}"`;
      await new Promise<void>((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
          if (error) {
            logger.error(`Error during extraction: ${stderr}`);
            reject(
              new Error(`Extraction failed for ${filePath} to ${extractPath}`)
            );
          } else {
            logger.log(`Extraction output: ${stdout}`);
            resolve();
          }
        });
      });
    } else {
      throw new Error(`Unsupported file type for extraction: ${filePath}`);
    }

    logger.log(`Extracted successfully to ${extractPath}`);
  } catch (error) {
    logger.error(`Error during extraction: ${error.message}`);
    throw new Error(`Extraction failed for ${filePath} to ${extractPath}`);
  }
};

// Function to prompt the user
const promptUser = (message: string): Promise<string> => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(message, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
};

/**
 * Function to load the configuration file.
 * This checks for both `.db2configrc` and `db2config.json`, giving
 * precedence to `.db2configrc` if both are present.
 * @returns {Promise<CLIOptions>} - The current configuration options.
 */
const loadConfig = async (): Promise<CLIOptions> => {
  const db2ConfigRcPath = path.resolve(process.cwd(), ".db2configrc");
  const db2ConfigJsonPath = path.resolve(process.cwd(), "db2config.json");

  let config: CLIOptions = {};

  try {
    if (await fs.pathExists(db2ConfigRcPath)) {
      logger.log("Loading configuration from .db2configrc");
      const fileContent = await fs.readFile(db2ConfigRcPath, "utf-8");
      if (fileContent.trim()) {
        config = JSON.parse(fileContent);
      } else {
        logger.warn(".db2configrc is empty. Using default configuration.");
      }
    } else if (await fs.pathExists(db2ConfigJsonPath)) {
      logger.log("Loading configuration from db2config.json");
      const fileContent = await fs.readFile(db2ConfigJsonPath, "utf-8");
      if (fileContent.trim()) {
        config = JSON.parse(fileContent);
      } else {
        logger.warn("db2config.json is empty. Using default configuration.");
      }
    }
  } catch (error) {
    logger.error(`Failed to load configuration: ${error.message}`);
  }

  return config;
};

export const installDriver = async (
  options: InstallOptions = {}
): Promise<void> => {
  try {
    const config = await loadConfig();
    logger.log("Loaded configuration.");

    const { installDir, isInstalled } = await getOrCheckDriverInstallation({
      ...config,
      ...options,
    });

    logger.log(`Determined install directory: ${installDir}`);
    logger.log(`Driver is installed: ${isInstalled ? "Yes" : "No"}`);

    // Fetch available versions if not provided
    let version = options.version;
    if (!version) {
      logger.log(
        "No specific version provided. Fetching the latest version..."
      );
      const availableVersions = await fetchAvailableVersions();
      if (availableVersions.length === 0) {
        throw new Error(
          "No available versions found. Unable to proceed with installation."
        );
      }
      version = availableVersions.sort().pop(); // Default to the latest version
      logger.log(`Defaulting to the latest version: ${version}`);
    }

    const versionDir = path.join(installDir, version);
    logger.log(`Version directory set to: ${versionDir}`);

    if (isInstalled && !options.force) {
      if (
        !process.argv.includes("--skip-prompt") &&
        !process.env.DB2_DRIVER_INSTALL_PROMPT_ANSWERED
      ) {
        logger.log("Driver is already installed.");
        const answer = await promptUser(
          "Do you want to reinstall the driver? (y/N): "
        );
        if (answer.toLowerCase() !== "y") {
          logger.log("Skipping reinstallation.");
          return;
        } else {
          process.env.DB2_DRIVER_INSTALL_PROMPT_ANSWERED = "true";
        }
      }
    }

    if (options.force) {
      logger.warn(
        "Force mode enabled: Existing installation will be overwritten."
      );
      await fs.remove(versionDir);
    }

    await fs.ensureDir(versionDir);

    const driverFileName =
      platformConfig[os.platform()]?.driverFileName[os.arch()];
    const driverFilePath = path.join(installDir, driverFileName);
    logger.log(`Driver file path set to: ${driverFilePath}`);

    if (fs.existsSync(driverFilePath)) {
      logger.log(
        `Driver file already exists at ${driverFilePath}. Skipping download.`
      );
    } else {
      const driverUrl = `${DRIVER_BASE_URL}${version}/${driverFileName}`;
      logger.log(`Starting download from ${driverUrl}`);
      await downloadFile({
        url: driverUrl,
        outputPath: driverFilePath,
        retryCount: options.retryCount || 3,
        checksum: options.checksum,
        skipSslVerification: options.skipSslVerification,
      });
    }

    logger.log(`Extracting driver files to ${versionDir}`);
    await extractFile(driverFilePath, versionDir);
    await fs.remove(driverFilePath);

    logger.log(
      `DB2 CLI driver version ${version} installed successfully at ${versionDir}.`
    );
  } catch (error) {
    handleError(error);
  }
};
