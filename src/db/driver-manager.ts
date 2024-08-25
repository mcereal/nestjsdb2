import fs from "fs-extra";
import path from "path";
import os from "os";
import axios from "axios";
import crypto from "crypto";
import AdmZip from "adm-zip";
import readline from "readline";
import { exec, execSync } from "child_process";
import { Logger } from "@nestjs/common";
import { Platform, Architecture } from "../cli/enums/install-driver.enum";
import { platformConfig } from "../cli/constants/platform-config";
import { ErrorCode } from "../cli/enums/error-codes.enum";
import {
  InstallOptions,
  DownloadOptions,
} from "../cli/interfaces/install-driver.interface";
import { CLIOptions } from "src/cli/interfaces";
import { t } from "tar";

const MAX_RETRIES = 3;
const DRIVER_BASE_URL =
  "https://public.dhe.ibm.com/ibmdl/export/pub/software/data/db2/drivers/odbc_cli/";

const LICENSE_AGREEMENT = `
****************************************
You are downloading a package which includes the Node.js module for IBM DB2/Informix. The module is licensed under the Apache License 2.0. The package also includes IBM ODBC and CLI Driver from IBM, which is automatically downloaded as the node module is installed on your system/device. The license agreement to the IBM ODBC and CLI Driver is available in <license-file>. Check for additional dependencies, which may come with their own license agreement(s). Your use of the components of the package and dependencies constitutes your acceptance of their respective license agreements. If you do not accept the terms of any license agreement(s), then delete the relevant component(s) from your device.
****************************************
`;

export class DriverManager {
  private readonly logger = new Logger(DriverManager.name);
  private driverHome: string;
  private verified: boolean = false; // Cache the verification status
  private DRIVER_BASE_URL = DRIVER_BASE_URL;
  private LICENSE_AGREEMENT = LICENSE_AGREEMENT;
  private MAX_RETRIES = MAX_RETRIES;
  private config: CLIOptions = {};
  private cachedVersions: string[] = [];

  constructor() {}

  public async init(customInstallDir?: string): Promise<void> {
    this.config = await this.loadConfig();

    const baseInstallDir =
      customInstallDir ||
      this.config.installDir ||
      path.resolve(process.cwd(), "installer");
    const version = this.config.version || (await this.fetchLatestVersion());
    this.driverHome = path.join(baseInstallDir, version, "clidriver");

    // Consolidated check for driver installation and verification
    const isVerified = await this.checkAndVerifyDriver({
      installDir: this.driverHome,
      version,
    });

    if (!isVerified) {
      this.setEnvironmentVariable("DB_HOME", path.join(this.driverHome, "bin"));
      this.logger.log(
        `Driver not installed or verification failed. Proceeding with installation...`
      );

      // Check license agreement before proceeding with installation
      await this.checkLicenseAgreement();

      await this.installDriver({ installDir: this.driverHome, version });
    } else {
      this.logger.log(
        "Driver already installed and verified. Skipping installation."
      );
      process.exit(0); // Exit gracefully if the driver is already installed and verified
    }
  }

  private async checkAndVerifyDriver(config: InstallOptions): Promise<boolean> {
    const installDir = config.installDir || this.driverHome;

    if (!fs.pathExistsSync(installDir)) {
      this.logger.log(`Checking installation directory: ${installDir}`);
      this.logger.log("Driver installed: No");
      return false;
    }

    if (this.verified) {
      this.logger.log("Driver already verified.");
      return true;
    }

    this.logger.log(`Verifying driver at ${installDir}`);

    // Define the essential directories we expect to find within `clidriver`
    const requiredDirectories = [
      "bin",
      "lib",
      "include",
      "license",
      "msg",
      "security64",
    ];

    // Check if each required directory exists within the installDir
    for (const dir of requiredDirectories) {
      const dirPath = path.join(installDir, dir);
      if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
        this.logger.error(
          `Required directory not found or not a directory: ${dirPath}`
        );
        return false;
      }
    }

    this.logger.log(`DB2 CLI driver verified successfully at ${installDir}`);
    this.verified = true;
    return true;
  }

  public async fetchAvailableDrivers(version: string = ""): Promise<string[]> {
    try {
      const versionUrl = version
        ? `${this.DRIVER_BASE_URL}${version}/`
        : this.DRIVER_BASE_URL;
      this.logger.log(`Fetching drivers from ${versionUrl}`);

      const response = await axios.get(versionUrl);
      const html: string = response.data;

      const driverPattern = />([a-z0-9_]+_odbc_cli\.[a-z\.]+)<\/a>/g;
      const matches = html.match(driverPattern);

      if (!matches) {
        this.logger.warn("No drivers found on the page.");
        return [];
      }

      const drivers = [...new Set(matches)].map((match) =>
        match.replace(/>|<\/a>/g, "")
      );
      this.logger.log(`Available drivers: ${drivers.join(", ")}`);

      return drivers;
    } catch (error) {
      this.logger.error(`Failed to fetch available drivers: ${error.message}`);
      return [];
    }
  }

  /**
   * Determine the appropriate driver file name based on the platform and architecture.
   * @param platform - The current platform.
   * @param arch - The current architecture.
   * @returns {string} The driver file name.
   */
  public getDriverFileName(platform: Platform, arch: Architecture): string {
    const config = platformConfig[platform];
    if (!config) {
      this.logger.error(`Unsupported platform: ${platform}`);
      throw new Error(`Unsupported platform: ${platform}`);
    }

    // Correctly access the driver file name from the configuration
    const driverFileName = config.driverFileName[arch];
    if (!driverFileName) {
      this.logger.error(
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
            this.logger.log(
              `Switching to Rosetta (x86_64) environment using ts-node...`
            );
            this.logger.log(`Running command: ${command}`);

            // Execute the command to restart under Rosetta
            execSync(command, {
              stdio: "inherit",
              env: { ...process.env, LICENSE_AGREEMENT_SHOWN: "true" },
            });
            process.exit(0); // Exit the current script to avoid running further in the wrong architecture
          } else {
            this.logger.error(
              "ts-node is required but not found. Please install ts-node globally using npm."
            );
            process.exit(1);
          }
        } else {
          this.logger.log(
            "Running under Rosetta (x86_64) with ts-node available. Continuing installation..."
          );
          return driverFileName; // Use the correct driver file name for ARM under Rosetta
        }
      } catch (error) {
        this.logger.error(
          "Error checking Rosetta environment or ts-node availability:",
          error.message
        );
        process.exit(1);
      }
    }

    return driverFileName; // Return the resolved driver file name
  }

  /**
   * Downloads a file from the specified URL and saves it to the given output path.
   * @param options - Object containing URL, output path, and retry count.
   * @returns {Promise<void>}
   */
  public async downloadFile(options: DownloadOptions): Promise<void> {
    const {
      url,
      outputPath,
      retryCount = this.MAX_RETRIES,
      checksum,
      skipSslVerification,
    } = options;
    this.logger.log(`Downloading from ${url} to ${outputPath}`);

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

        this.logger.log(`Downloaded successfully to ${outputPath}`);

        if (checksum) {
          await this.validateChecksum(outputPath, checksum);
        }

        return;
      } catch (error) {
        this.logger.warn(`Attempt ${attempt} failed: ${error.message}`);
        if (attempt === retryCount) {
          this.handleError(new Error(`Download failed: ${error.message}`));
        }
      }
    }
  }

  /**
   * Validates the checksum of a downloaded file.
   * @param filePath - The path of the downloaded file.
   * @param expectedChecksum - The expected checksum value.
   * @returns {Promise<void>}
   */
  private async validateChecksum(
    filePath: string,
    expectedChecksum: string
  ): Promise<void> {
    const fileBuffer = await fs.readFile(filePath);
    const hashSum = crypto.createHash("sha256");
    hashSum.update(fileBuffer);
    const fileChecksum = hashSum.digest("hex");

    if (fileChecksum !== expectedChecksum) {
      this.handleError(new Error("Checksum mismatch"));
    }

    this.logger.log(`Checksum validation passed for ${filePath}`);
  }

  /**
   * Extracts a zip or tar.gz file to the specified directory.
   * @param filePath - The path of the zip or tar.gz file to extract.
   * @param extractPath - The directory to extract the files to.
   * @returns {Promise<void>}
   */
  public async extractFile(
    filePath: string,
    extractPath: string
  ): Promise<void> {
    this.logger.log(`Extracting ${filePath} to ${extractPath}`);

    try {
      fs.ensureDirSync(extractPath); // Ensure extraction path exists

      if (filePath.endsWith(".zip")) {
        const zip = new AdmZip(filePath);
        zip.extractAllTo(extractPath, true);
      } else if (filePath.endsWith(".tar.gz")) {
        const command = `tar -xzf "${filePath}" -C "${extractPath}"`;
        await new Promise<void>((resolve, reject) => {
          exec(command, (error, stdout, stderr) => {
            if (error) {
              this.logger.error(`Error during extraction: ${stderr}`);
              reject(
                new Error(`Extraction failed for ${filePath} to ${extractPath}`)
              );
            } else {
              this.logger.log(`Extraction output: ${stdout}`);
              resolve();
            }
          });
        });
      } else {
        throw new Error(`Unsupported file type for extraction: ${filePath}`);
      }

      this.logger.log(`Extracted successfully to ${extractPath}`);
    } catch (error) {
      this.handleError(
        new Error(
          `Extraction failed for ${filePath} to ${extractPath}: ${error.message}`
        )
      );
    }
  }

  private setEnvironmentVariable(key: string, value: string): void {
    process.env[key] = value;
    this.logger.log(`Environment variable ${key} set to ${value}`);
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
    const arch = os.arch();
    if (arch === "arm64" && this.getPlatform() === Platform.MACOS) {
      try {
        const isRosetta = execSync("arch").toString().trim() === "i386";
        if (isRosetta) {
          return Architecture.X64; // Running under Rosetta
        }
      } catch (error) {
        this.logger.warn(
          `Failed to determine Rosetta status: ${error.message}`
        );
      }
    }
    return arch === "arm64" ? Architecture.ARM64 : Architecture.X64;
  }

  /**
   * Fetch available driver versions.
   * @returns {Promise<string[]>} The list of available driver versions.
   */
  public async fetchAvailableVersions(): Promise<string[]> {
    if (this.cachedVersions.length > 0) {
      return this.cachedVersions;
    }

    try {
      this.logger.log("Fetching available versions...");

      const response = await axios.get(this.DRIVER_BASE_URL);

      const html: string = response.data;
      const versionPattern = /href="(v\d+\.\d+\.\d+\/)"/g;
      const versions = [
        ...new Set(
          html
            .match(versionPattern)
            ?.map((match) => match.replace(/href="|\/"/g, ""))
        ),
      ];

      this.logger.log(`Extracted versions: ${versions.join(", ")}`);
      this.cachedVersions = versions; // Cache the result
      return versions;
    } catch (error) {
      this.logger.error(`Failed to fetch available versions: ${error.message}`);
      return [];
    }
  }

  public async fetchLatestVersion(): Promise<string> {
    if (this.cachedVersions.length > 0) {
      return this.cachedVersions.sort().pop() || "v11.5.9"; // Use cached versions
    }

    const versions = await this.fetchAvailableVersions();
    const latestVersion = versions.sort().pop();

    if (latestVersion) {
      this.logger.log(`Latest version fetched: ${latestVersion}`);
      this.cachedVersions.push(latestVersion); // Cache the latest version
      return latestVersion;
    }

    this.logger.warn("No versions found; defaulting to v11.5.9.");
    return "v11.5.9"; // Fallback if no versions found
  }

  private handleError(error: Error): void {
    switch ((error as any).code) {
      case ErrorCode.PERMISSION_DENIED:
        this.logger.warn(
          "Permission denied. Attempting to run with elevated privileges using sudo..."
        );

        // Re-execute the script with sudo
        try {
          const command = `sudo node ${process.argv.join(" ")}`;
          execSync(command, { stdio: "inherit" });
          process.exit(0);
        } catch (execError) {
          this.logger.error(`Failed to run with sudo: ${execError.message}`);
        }
        break;
      case ErrorCode.NETWORK_ERROR:
        this.logger.error(
          "Network error. Check your internet connection and try again."
        );
        break;
      case ErrorCode.FILE_NOT_FOUND:
        this.logger.error(
          "File not found. Ensure that the download URL is correct."
        );
        break;
      case ErrorCode.CHECKSUM_MISMATCH:
        this.logger.error(
          "Checksum validation failed. The downloaded file may be corrupted. Try downloading again."
        );
        break;
      case ErrorCode.UNSUPPORTED_PLATFORM:
        this.logger.error(
          "Unsupported platform or architecture. Please check the documentation for supported platforms."
        );
        break;
      default:
        this.logger.error(`An unexpected error occurred: ${error.message}`);
        break;
    }
    process.exit(1);
  }

  /**
   * Prompt the user for input.
   * @param message The message to display.
   * @returns {Promise<string>} The user's input.
   */
  public promptUser(message: string): Promise<string> {
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
  }

  public async listInstalledDrivers(installDir: string): Promise<string[]> {
    try {
      // Read the contents of the base install directory
      const directories = await fs.readdir(installDir);
      const installedVersions = [];

      for (const dir of directories) {
        const driverPath = path.join(installDir, dir, "clidriver");
        this.logger.log(`Checking for driver at: ${driverPath}`);

        // Check if 'clidriver' directory exists inside each version directory
        if (await fs.pathExists(driverPath)) {
          installedVersions.push(dir); // Use the directory name as the version
        }
      }

      this.logger.log(
        `Installed versions found: ${installedVersions.join(", ")}`
      );
      return installedVersions;
    } catch (error) {
      this.logger.error(`Failed to list installed drivers: ${error.message}`);
      return [];
    }
  }

  private async checkLicenseAgreement(): Promise<void> {
    if (!process.env.LICENSE_AGREEMENT_SHOWN) {
      this.logger.log(this.LICENSE_AGREEMENT);
      const agreementConfirmed = await this.promptUser(
        "Do you agree to the terms of the license agreement? (y/N): "
      );
      if (agreementConfirmed.toLowerCase() !== "y") {
        this.logger.log("Installation aborted by user.");
        process.exit(1);
      }
      // Set the environment variable to avoid re-prompting
      process.env.LICENSE_AGREEMENT_SHOWN = "true";
    }
  }

  public async installDriver(options: InstallOptions = {}): Promise<void> {
    try {
      const config = await this.loadConfig();
      const version =
        options.version || config.version || (await this.fetchLatestVersion());
      const baseInstallDir =
        options.installDir ||
        config.installDir ||
        process.env.DB_HOME ||
        path.resolve(process.cwd(), "installer");
      const installDir = path.join(baseInstallDir, version);

      this.logger.log(`Using installation directory: ${installDir}`);
      this.logger.debug(`Using driver version: ${version}`);

      const isVerified = await this.checkAndVerifyDriver({
        installDir,
        version,
      });
      if (isVerified && !options.force) {
        const answer = await this.promptUser(
          "Driver is already installed and verified. Do you want to reinstall? (y/N): "
        );
        if (answer.toLowerCase() !== "y") {
          this.logger.log("Skipping reinstallation.");
          return;
        }
      }

      if (options.force) {
        this.logger.warn(
          "Force mode enabled: Existing installation will be overwritten."
        );
        await fs.remove(installDir);
      }

      await fs.ensureDir(installDir);

      const driverFileName = this.getDriverFileName(
        this.getPlatform(),
        this.getArchitecture()
      );
      const driverFilePath = path.join(installDir, driverFileName);

      if (!fs.existsSync(driverFilePath)) {
        const driverUrl = `${this.DRIVER_BASE_URL}${version}/${driverFileName}`;
        this.logger.log(`Starting download from ${driverUrl}`);
        await this.downloadFile({
          url: driverUrl,
          outputPath: driverFilePath,
          retryCount: options.retryCount || this.MAX_RETRIES,
          checksum: options.checksum,
          skipSslVerification: options.skipSslVerification,
        });
      }

      await this.extractFile(driverFilePath, installDir);
      await fs.remove(driverFilePath);

      this.setEnvironmentVariable("DB_HOME", path.join(installDir, "bin"));

      const isPostVerify = await this.checkAndVerifyDriver({ installDir });
      if (!isPostVerify) {
        this.logger.error("Driver verification failed after installation.");
      } else {
        this.logger.log("Driver verification succeeded after installation.");
      }
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Method to load the configuration file.
   * This checks for both `.db2configrc` and `db2config.json`, giving
   * precedence to `.db2configrc` if both are present.
   * @returns {Promise<CLIOptions>} - The current configuration options.
   */
  public async loadConfig(): Promise<CLIOptions> {
    const db2ConfigRcPath = path.resolve(process.cwd(), ".db2configrc");
    const db2ConfigJsonPath = path.resolve(process.cwd(), "db2config.json");

    let config: CLIOptions = {};

    try {
      if (await fs.pathExists(db2ConfigRcPath)) {
        this.logger.log("Loading configuration from .db2configrc");
        const fileContent = await fs.readFile(db2ConfigRcPath, "utf-8");
        if (fileContent.trim()) {
          config = this.parseConfigRc(fileContent);
        } else {
          this.logger.warn(
            ".db2configrc is empty. Using default configuration."
          );
        }
      } else if (await fs.pathExists(db2ConfigJsonPath)) {
        this.logger.log("Loading configuration from db2config.json");
        const fileContent = await fs.readFile(db2ConfigJsonPath, "utf-8");
        if (fileContent.trim()) {
          config = JSON.parse(fileContent);
        } else {
          this.logger.warn(
            "db2config.json is empty. Using default configuration."
          );
        }
      }
    } catch (error) {
      this.logger.error(`Failed to load configuration: ${error.message}`);
    }

    return config;
  }

  /**
   * Parse the content of a .db2configrc file into a CLIOptions object.
   * @param fileContent The raw content of the .db2configrc file.
   * @returns {CLIOptions} The parsed configuration options.
   */
  private parseConfigRc(fileContent: string): CLIOptions {
    const config: CLIOptions = {};
    const lines = fileContent.split("\n");

    lines.forEach((line) => {
      // Remove any comments or empty lines
      const cleanedLine = line.trim();
      if (cleanedLine && !cleanedLine.startsWith("#")) {
        const [key, value] = cleanedLine.split("=");
        if (key && value !== undefined) {
          config[key.trim()] = value.trim();
        }
      }
    });

    return config;
  }

  /**
   * Method to save the configuration file.
   * By default, saves to `db2config.json`.
   * @param options - The options to save.
   */
  public async saveConfig(options: CLIOptions): Promise<void> {
    const configPath = path.resolve(process.cwd(), "db2config.json");
    try {
      await fs.writeJson(configPath, options, { spaces: 2 });
      this.logger.log("Configuration saved successfully.");
    } catch (error) {
      this.logger.error(`Failed to save configuration: ${error.message}`);
    }
  }
}
