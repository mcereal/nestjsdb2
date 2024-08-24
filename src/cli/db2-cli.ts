#!/usr/bin/env node

// src/cli/db2-cli.ts

import { Command } from "commander";
import { getDriverFileName, installDriver } from "../install/install-driver";
import { InstallOptions } from "../install/interfaces/install-driver.interface";
import fs from "fs-extra";
import path from "path";
import { Logger } from "@nestjs/common";
import {
  Architecture,
  LogLevel,
  Platform,
} from "../install/enums/install-driver.enum";
import { Commands } from "./enums/cli.enum";
import { CLIOptions } from "./interfaces/cli.interface";
import { getOrCheckDriverInstallation } from "../install/install-driver";
import { execSync } from "child_process";
import readline from "readline";
import os from "os";
import axios from "axios";
import { platformConfig } from "../install/constants/platform-config";

// Instantiate the NestJS Logger
const logger = new Logger("DB2 CLI");

const DRIVER_BASE_URL =
  "https://public.dhe.ibm.com/ibmdl/export/pub/software/data/db2/drivers/odbc_cli/";

export const fetchAvailableVersions = async (): Promise<string[]> => {
  try {
    logger.log("Fetching available versions...");

    const response = await axios.get(DRIVER_BASE_URL);
    logger.log("Fetched version directory listing from the driver base URL.");

    const html: string = response.data;

    // Extract version directories
    const versionPattern = /href="(v\d+\.\d+\.\d+\/)"/g;
    const versions = [
      ...new Set(
        html
          .match(versionPattern)
          ?.map((match) => match.replace(/href="|\/"/g, ""))
      ),
    ];

    logger.log(`Extracted versions: ${versions.join(", ")}`);

    // Get the current platform and architecture
    const currentPlatform = os.platform() as Platform;
    const currentArch =
      os.arch() === "arm64" ? Architecture.ARM64 : Architecture.X64;

    logger.log(
      `Current platform: ${currentPlatform}, architecture: ${currentArch}`
    );

    // Get the platform-specific configuration
    const config = platformConfig[currentPlatform];
    if (!config) {
      logger.warn(`No configuration found for platform: ${currentPlatform}`);
      return versions; // Return versions without filtering if no config is found
    }

    logger.log(
      `Platform-specific configuration found: ${JSON.stringify(config)}`
    );

    const filteredVersions: string[] = [];

    for (const version of versions) {
      logger.log(
        `Checking version ${version} for platform and architecture...`
      );

      // Directly get driver file name using platform and architecture
      const driverFileName = config.driverFileName[currentArch];
      if (!driverFileName) {
        logger.warn(
          `No driver file configuration found for ${currentPlatform} and ${currentArch}`
        );
        continue;
      }

      const driverFileUrl = `${DRIVER_BASE_URL}${version}/${driverFileName}`;
      logger.log(`Checking if driver file exists at ${driverFileUrl}`);

      try {
        const response = await axios.head(driverFileUrl);
        const exists = response.status === 200;

        if (exists) {
          logger.log(`Driver file found for version ${version}`);
          filteredVersions.push(version);
        }
      } catch (error) {
        logger.warn(
          `Driver file does not exist or could not be accessed at ${driverFileUrl}`
        );
      }
    }

    logger.log(`Filtered versions: ${filteredVersions.join(", ")}`);

    return filteredVersions;
  } catch (error) {
    logger.error(`Failed to fetch available versions: ${error.message}`);
    return [];
  }
};

export const fetchAvailableDrivers = async (version: string = "") => {
  try {
    const versionUrl = version
      ? `${DRIVER_BASE_URL}${version}/`
      : DRIVER_BASE_URL;
    const response = await axios.get(versionUrl);
    const html: string = response.data;

    const driverPattern = />([a-z0-9_]+_odbc_cli\.[a-z\.]+)<\/a>/g;
    const matches = html.match(driverPattern);

    if (!matches) {
      logger.warn("No drivers found on the page.");
      return [];
    }

    const drivers = [...new Set(matches)].map((match) =>
      match.replace(/>|<\/a>/g, "")
    );

    return drivers;
  } catch (error) {
    logger.error(`Failed to fetch available drivers: ${error.message}`);
    return [];
  }
};

/**
 * Lists installed DB2 CLI driver versions.
 * @param installDir - The base directory where drivers are installed.
 * @returns {Promise<string[]>} - A promise that resolves to an array of installed driver versions.
 */
const listInstalledDrivers = async (installDir: string): Promise<string[]> => {
  try {
    const directories = await fs.readdir(installDir);
    const installedVersions = [];

    for (const dir of directories) {
      // Assuming 'dir' itself is 'clidriver'
      const driverPath = path.join(installDir, dir); // Adjust this line
      const versionFilePath = path.join(driverPath, "version.txt"); // Adjust this line

      logger.log(`Checking for driver at: ${driverPath}`);
      logger.log(`Checking for version file at: ${versionFilePath}`);

      if (
        (await fs.pathExists(driverPath)) &&
        (await fs.pathExists(versionFilePath))
      ) {
        const version = await fs.readFile(versionFilePath, "utf-8");
        installedVersions.push(version.trim());
      }
    }

    return installedVersions;
  } catch (error) {
    logger.error(`Failed to list installed drivers: ${error.message}`);
    return [];
  }
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

/**
 * Function to save the configuration file.
 * By default, saves to `db2config.json`.
 * @param options - The options to save.
 */
const saveConfig = async (options: CLIOptions): Promise<void> => {
  const configPath = path.resolve(process.cwd(), "db2config.json");
  await fs.writeJson(configPath, options, { spaces: 2 });
  logger.log("Configuration saved successfully.");
};

// Function to check if Rosetta is installed
const checkRosettaInstallation = (): boolean => {
  try {
    execSync("/usr/bin/pgrep oahd");
    return true; // Rosetta is installed
  } catch (error) {
    return false; // Rosetta is not installed
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
 * Main function to execute the CLI commands.
 */
const main = async () => {
  logger.log("Starting DB2 CLI...");
  // Check if running on ARM macOS
  const isMacOS = os.platform() === "darwin";
  const isARM = os.arch() === "arm64";

  if (isMacOS && isARM) {
    logger.log("You are using macOS on an ARM architecture.");
    const hasRosetta = checkRosettaInstallation();

    if (!hasRosetta) {
      logger.warn(
        "Rosetta is not installed. This installation requires Rosetta for compatibility with x86_64 applications."
      );
      logger.warn(
        "For more information on Rosetta 2 setup, please refer to the README.md."
      );

      const answer = await promptUser(
        "Would you like to run the setup script to install Rosetta, Homebrew, Node, and ts-node? (y/N): "
      );

      if (answer.toLowerCase() === "y") {
        try {
          execSync("sh ./macos-arm-setup.sh", { stdio: "inherit" });
        } catch (error) {
          logger.error(`Setup script failed: ${error.message}`);
          logger.error(
            "For more information on setting up Rosetta 2, please see the README.md."
          );
          process.exit(1);
        }
      } else {
        logger.error("Rosetta setup is required to proceed. Exiting.");
        logger.error(
          "For more information on setting up Rosetta 2, please see the README.md."
        );
        process.exit(1);
      }
    } else {
      logger.log("Rosetta is installed. Proceeding with installation...");
    }
  }

  const program = new Command();

  program
    .name("db2-cli")
    .version("1.0.0")
    .description("CLI for managing IBM DB2 CLI driver")
    .helpOption("-h, --help", "Display help for the DB2 CLI commands")
    .addHelpText(
      "after",
      `
Examples:
  $ db2-cli install
  $ db2-cli install --force --verbose
  $ db2-cli uninstall
  $ db2-cli config --set logLevel debug
  $ db2-cli update
  $ db2-cli config --get logLevel
  $ db2-cli list-drivers`
    )
    .helpCommand(
      "help [command]",
      "Display help information about a specific command"
    );
  program
    .command(Commands.LIST_REMOTE_DRIVERS)
    .description("List available DB2 CLI driver versions")
    .action(async () => {
      const versions = await fetchAvailableVersions();
      if (versions.length === 0) {
        logger.warn("No versions available.");
      } else {
        logger.log("Available versions:");
        versions.forEach((version) => logger.log(`- ${version}`));
      }
    });
  program
    .command(Commands.LIST_INSTALLED_DRIVERS)
    .description("List installed DB2 CLI driver versions")
    .option(
      "--install-dir <path>",
      "Specify the installation directory to check for installed drivers"
    )
    .action(async (options) => {
      try {
        // Load configuration and use the new combined function
        const config = await loadConfig();
        const { installDir } = await getOrCheckDriverInstallation({
          ...config,
          installDir: options.installDir,
        });

        // List installed drivers using the determined install directory
        const installedVersions = await listInstalledDrivers(installDir);

        if (installedVersions.length === 0) {
          logger.warn("No installed versions found.");
        } else {
          logger.log("Installed versions:");
          installedVersions.forEach((version) => logger.log(`- ${version}`));
        }
      } catch (error) {
        logger.error(`Failed to list installed drivers: ${error.message}`);
      }
    });

  program
    .command(Commands.INSTALL)
    .description("Install the IBM DB2 CLI driver")
    .option(
      "-v, --version <version>",
      "Specify the version to install (default: latest)"
    )
    .option(
      "-d, --download-url <url>",
      "Specify the download URL for the DB2 driver"
    )
    .option(
      "-l, --log-level <level>",
      `Set the log level (${Object.values(LogLevel).join(", ")})`,
      LogLevel.INFO
    )
    .option(
      "-r, --retries <number>",
      "Number of retries for downloading",
      (value) => parseInt(value, 10),
      3 // Default value
    )
    .option(
      "-c, --checksum <checksum>",
      "Expected checksum of the downloaded file"
    )
    .option("--verbose", "Enable verbose output")
    .option("-f, --force", "Force reinstallation of the driver")
    .option(
      "--skip-ssl-verification",
      "Skip SSL certificate verification for downloads"
    )
    .option("-o, --output-path <path>", "Specify custom installation directory")
    .option("--install-dir <path>", "Specify the installation directory")
    .option(
      "--check-only",
      "Check if the driver is already installed without installing"
    )
    .option(
      "--dry-run",
      "Simulate the installation process without making changes"
    )
    .option(
      "--config <path>",
      "Load installation options from a configuration file"
    )
    .helpOption("-h, --help", "Display help for the install command")
    .addHelpText(
      "after",
      `
    Examples:
      $ db2-cli install --download-url <url>
      $ db2-cli install --log-level debug
      $ db2-cli install --retries 5`
    )
    .action(async (options) => {
      try {
        logger.log("Starting installation process...");

        // Load configuration and combine with CLI options
        const configOptions = await loadConfig();
        const combinedOptions = { ...configOptions, ...options };
        logger.log("Loaded and combined configuration options.");

        // Fetch and set the version to install
        let version = combinedOptions.version;
        if (!version) {
          logger.log(
            "No specific version provided. Fetching the latest version..."
          );
          const versions = await fetchAvailableVersions();
          if (versions.length === 0) {
            throw new Error(
              "No available versions found. Unable to proceed with installation."
            );
          }
          version = versions.sort().pop(); // Default to the latest version
          logger.log(`Defaulting to the latest version: ${version}`);
        }

        const platform = os.platform() as Platform;
        const arch =
          os.arch() === "arm64"
            ? Architecture.X64
            : (os.arch() as Architecture); // Fallback to x64 for ARM using Rosetta

        // Use platformConfig to get the correct driver file name
        const config = platformConfig[platform];
        if (!config || !config.driverFileName) {
          logger.error(
            `No driver file configuration found for platform ${platform} with architecture ${arch}`
          );
          process.exit(1);
        }

        const driverFileName = getDriverFileName(platform, arch);
        if (!driverFileName) {
          logger.error(
            `No driver file found for platform ${platform} with architecture ${arch}`
          );
          process.exit(1);
        }

        const driverUrl = `${DRIVER_BASE_URL}${version}/${driverFileName}`;
        logger.log(`Driver URL set to: ${driverUrl}`);

        // Use the new combined function to determine the install directory and check for installation
        const { installDir, isInstalled } = await getOrCheckDriverInstallation(
          combinedOptions
        );
        logger.log(`Determined install directory: ${installDir}`);
        logger.log(`Driver is installed: ${isInstalled ? "Yes" : "No"}`);

        // Additional check to prevent recursive call
        if (isInstalled && !options.force) {
          logger.log("Driver is already installed. Skipping installation...");
          return;
        }

        if (options.force) {
          logger.warn(
            "Force mode enabled: Existing installation will be overwritten."
          );
        }
        logger.log(`Installing driver version ${version}...`);

        await installDriver({
          ...combinedOptions,
          version,
          outputPath: installDir,
        });
        logger.log(`Driver version ${version} installed successfully.`);
      } catch (error) {
        logger.error(`An error occurred: ${error.message}`);
        process.exit(1);
      }
    });

  program
    .command(Commands.UNINSTALL)
    .description("Uninstall the IBM DB2 CLI driver")
    .helpOption("-h, --help", "Display help for the uninstall command")
    .addHelpText("after", "Example: $ db2-cli uninstall")
    .action(async () => {
      try {
        // Load configuration and use the new combined function
        const config = await loadConfig();
        const { installDir, isInstalled } = await getOrCheckDriverInstallation(
          config
        );

        if (isInstalled) {
          const driverPath = path.join(installDir, "clidriver");
          await fs.remove(driverPath);
          logger.log("Driver uninstalled successfully.");
        } else {
          logger.warn("No driver installation found to uninstall.");
        }
      } catch (error) {
        logger.error(
          `Error during uninstallation: ${(error as Error).message}`
        );
        process.exit(1);
      }
    });

  program
    .command(Commands.UPDATE)
    .description("Update the IBM DB2 CLI driver to the latest version")
    .helpOption("-h, --help", "Display help for the update command")
    .addHelpText("after", "Example: $ db2-cli update")
    .action(async () => {
      try {
        logger.log("Checking for the latest DB2 CLI driver version...");

        // Fetch the latest available version
        const availableVersions = await fetchAvailableVersions();
        const latestVersion = availableVersions.sort().pop();
        if (!latestVersion) {
          logger.warn("Unable to fetch the latest version. Update aborted.");
          return;
        }

        // Get the installation directory and check if the driver is installed
        const { installDir, isInstalled } =
          await getOrCheckDriverInstallation();

        if (!isInstalled) {
          logger.warn(
            "No existing installation found. Performing a fresh install."
          );
        } else {
          // Check the currently installed version
          const installedVersions = await listInstalledDrivers(installDir);
          logger.debug("Installed versions:", installedVersions);
          const currentVersion = installedVersions.sort().pop();
          logger.debug("Current version:", currentVersion);

          if (currentVersion === latestVersion) {
            logger.log(
              `You already have the latest version installed: ${latestVersion}`
            );
            return;
          }

          logger.log(`A new version is available: ${latestVersion}`);
          logger.log(
            `Currently installed version: ${currentVersion || "None"}`
          );

          // Prompt user for confirmation to update
          const answer = await promptUser(
            `Do you want to update to version ${latestVersion}? (y/N): `
          );
          if (answer.toLowerCase() !== "y") {
            logger.log("Update aborted by the user.");
            return;
          }
        }

        logger.log(`Updating to version ${latestVersion}...`);

        // Force install the latest version with explicit type casting to string
        await installDriver({
          force: true,
          version: latestVersion as string,
          installDir,
        });
        logger.log(`Driver updated to version ${latestVersion} successfully.`);
      } catch (error) {
        logger.error(`Error during update: ${(error as Error).message}`);
        process.exit(1);
      }
    });

  program
    .command(Commands.CONFIG)
    .description("Manage CLI configuration settings")
    .option("--set <key> <value>", "Set a configuration option")
    .option("--get <key>", "Get a configuration option")
    .option("--reset", "Reset configuration to default")
    .helpOption("-h, --help", "Display help for the config command")
    .addHelpText(
      "after",
      `
Examples:
  $ db2-cli config --set logLevel debug
  $ db2-cli config --get logLevel
  $ db2-cli config --reset`
    )
    .action(async (options) => {
      try {
        const config = await loadConfig();

        if (options.set) {
          const [key, value] = options.set.split(" ");
          config[key] = value;
          await saveConfig(config);
        } else if (options.get) {
          const value = config[options.get];
          if (value) {
            logger.log(`Configuration for ${options.get}: ${value}`);
          } else {
            logger.warn(`No configuration found for ${options.get}`);
          }
        } else if (options.reset) {
          await fs.remove(path.resolve(process.cwd(), "db2config.json"));
          logger.log("Configuration reset to default.");
        } else {
          logger.log("Current configuration:", config);
        }
      } catch (error) {
        logger.error(
          `Error managing configuration: ${(error as Error).message}`
        );
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
};

main().catch((err) => {
  logger.error(`CLI execution failed: ${err.message}`);
  process.exit(1);
});
