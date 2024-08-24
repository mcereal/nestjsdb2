// src/cli/cli.ts

import { Command } from "commander";
import { installDriver } from "../install/install-driver";
import { InstallOptions } from "../install/interfaces/install-driver.interface";
import fs from "fs-extra";
import path from "path";
import { Logger } from "@nestjs/common";
import { LogLevel } from "../install/enums/install-driver.enum";
import { Commands } from "./enums/cli.enum";
import { CLIOptions } from "./interfaces/cli.interface";
import { getDefaultInstallDir } from "../install/install-driver";
import { execSync } from "child_process";
import readline from "readline";
import os from "os";

// Instantiate the NestJS Logger
const logger = new Logger("DB2 CLI");

/**
 * Function to check if the driver is already installed.
 * @param installDir - The directory to check for driver installation.
 * @returns {Promise<boolean>} - True if the driver is installed, false otherwise.
 */
const checkDriverInstallation = async (
  installDir: string
): Promise<boolean> => {
  const driverPath =
    process.env.IBM_DB_HOME || path.join(installDir, "clidriver");
  return fs.pathExists(driverPath);
};

/**
 * Function to load the configuration file.
 * @returns {Promise<CLIOptions>} - The current configuration options.
 */
const loadConfig = async (): Promise<CLIOptions> => {
  const configPath = path.resolve(process.cwd(), "config/db2-cli-config.json");
  if (await fs.pathExists(configPath)) {
    return await fs.readJson(configPath);
  }
  return {};
};

/**
 * Function to save the configuration file.
 * @param options - The options to save.
 */
const saveConfig = async (options: CLIOptions): Promise<void> => {
  const configPath = path.resolve(process.cwd(), "config/db2-cli-config.json");
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
  $ db2-cli config --get logLevel`
    )
    .helpCommand(
      "help [command]",
      "Display help information about a specific command"
    );

  program
    .command(Commands.INSTALL)
    .description("Install the IBM DB2 CLI driver")
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
    .option("-v, --verbose", "Enable verbose output")
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
        const configOptions = await loadConfig();
        const combinedOptions = { ...configOptions, ...options };

        // Parse options and set defaults
        const installOptions: InstallOptions = {
          downloadUrl: combinedOptions.downloadUrl,
          logLevel: combinedOptions.logLevel as LogLevel,
          retryCount: combinedOptions.retries,
          checksum: combinedOptions.checksum,
          verbose: combinedOptions.verbose,
          force: combinedOptions.force,
          skipSslVerification: combinedOptions.skipSslVerification,
          outputPath: combinedOptions.outputPath,
          checkOnly: combinedOptions.checkOnly,
          dryRun: combinedOptions.dryRun,
        };

        // Determine the installation directory
        const installDir = combinedOptions.installDir || getDefaultInstallDir(); // Use custom install directory if provided

        if (installOptions.checkOnly) {
          logger.log("Check-only mode: Verifying existing installation...");
          const isInstalled = await checkDriverInstallation(installDir);
          if (isInstalled) {
            logger.log("Driver is already installed.");
          } else {
            logger.warn("Driver is not installed.");
          }
          return;
        }

        if (installOptions.dryRun) {
          logger.log("Dry-run mode: Simulating installation...");
          logger.log("Download URL:", installOptions.downloadUrl);
          logger.log("Installation directory:", installDir);
          return;
        }

        await installDriver({ ...installOptions, outputPath: installDir });
      } catch (error) {
        logger.error(`An error occurred: ${(error as Error).message}`);
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
        const installDir = getDefaultInstallDir();
        const driverPath = path.join(installDir, "clidriver");
        const isInstalled = await checkDriverInstallation(installDir);
        if (isInstalled) {
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
        logger.log("Updating the DB2 CLI driver...");
        await installDriver({ force: true });
        logger.log("Driver updated successfully.");
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
          await fs.remove(
            path.resolve(process.cwd(), "config/db2-cli-config.json")
          );
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
