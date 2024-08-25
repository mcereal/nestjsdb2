#!/usr/bin/env node

import { Command } from "commander";
import fs from "fs-extra";
import path from "path";
import { Logger } from "@nestjs/common";
import { LogLevel } from "./enums/install-driver.enum";
import { Commands } from "./enums/cli.enum";
import { DriverManager } from "../db/driver-manager";
import { execSync } from "child_process";

// Instantiate the NestJS Logger
const logger = new Logger("DB2 CLI");

// Instantiate DriverManager
const driverManager = new DriverManager();

// Function to handle Rosetta setup
async function handleRosettaSetup() {
  const isMacOS = process.platform === "darwin";
  const isARM = process.arch === "arm64";

  if (isMacOS && isARM) {
    logger.log("You are using macOS on an ARM architecture.");
    try {
      execSync("/usr/bin/pgrep oahd");
      logger.log(
        "Rosetta is already installed. Proceeding with driver installation..."
      );
    } catch (error) {
      logger.warn(
        "Rosetta is not installed. This installation requires Rosetta."
      );
      const userResponse = await promptUser(
        "Rosetta is required for this installation. Would you like to run the setup script to install Rosetta and other dependencies? (y/N): "
      );

      if (userResponse.toLowerCase() === "y") {
        try {
          execSync("sh ./macos-arm-setup.sh", { stdio: "inherit" });
          logger.log("Rosetta setup completed successfully.");
        } catch (setupError) {
          logger.error(`Setup script failed: ${setupError.message}`);
          logger.error(
            "For more information on setting up Rosetta 2, please see the README.md."
          );
          process.exit(1);
        }
      } else {
        logger.error("Rosetta setup is required to proceed. Exiting.");
        process.exit(1);
      }
    }
  }
}

// Helper function to prompt the user for input
function promptUser(message: string): Promise<string> {
  const readline = require("readline");
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

async function main() {
  logger.log("Starting DB2 CLI...");
  await handleRosettaSetup();

  // Initialize DriverManager

  logger.log("Initializing DriverManager...");
  await driverManager.init();

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
      const versions = await driverManager.fetchAvailableVersions();
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
        const installDir =
          options.installDir || path.resolve(process.cwd(), "installer");
        const installedVersions = await driverManager.listInstalledDrivers(
          installDir
        );

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
      "-l, --log-level <level>",
      `Set the log level (${Object.values(LogLevel).join(", ")})`,
      LogLevel.INFO
    )
    .option(
      "-r, --retries <number>",
      "Number of retries for downloading",
      (value) => parseInt(value, 10),
      3
    )
    .option("-f, --force", "Force reinstallation of the driver")
    .option("--verbose", "Enable verbose output")
    .option("-o, --output-path <path>", "Specify custom installation directory")
    .option(
      "--check-only",
      "Check if the driver is already installed without installing"
    )
    .helpOption("-h, --help", "Display help for the install command")
    .addHelpText(
      "after",
      `
    Examples:
      $ db2-cli install --version 11.5.9
      $ db2-cli install --force --verbose`
    )
    .action(async (options) => {
      try {
        logger.log("Starting installation process...");

        // Load configuration and combine with CLI options
        const configOptions = await driverManager.loadConfig();
        const combinedOptions = { ...configOptions, ...options };
        logger.log("Loaded and combined configuration options.");

        // Install driver using DriverManager class
        await driverManager.installDriver(combinedOptions);
        logger.log("Driver installation completed successfully.");
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
        const installDir = path.resolve(process.cwd(), "installer");
        const installedVersions = await driverManager.listInstalledDrivers(
          installDir
        );

        if (installedVersions.length > 0) {
          const driverPath = path.join(
            installDir,
            installedVersions.sort().pop()!
          ); // Uninstall the latest version
          await fs.remove(driverPath);
          logger.log("Driver uninstalled successfully.");
        } else {
          logger.warn("No driver installation found to uninstall.");
        }
      } catch (error) {
        logger.error(`Error during uninstallation: ${error.message}`);
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
        const availableVersions = await driverManager.fetchAvailableVersions();
        const latestVersion = availableVersions.sort().pop();
        if (!latestVersion) {
          logger.warn("Unable to fetch the latest version. Update aborted.");
          return;
        }

        const installDir = path.resolve(process.cwd(), "installer");
        const installedVersions = await driverManager.listInstalledDrivers(
          installDir
        );
        const currentVersion = installedVersions.sort().pop();

        if (currentVersion === latestVersion) {
          logger.log(
            `You already have the latest version installed: ${latestVersion}`
          );
          return;
        }

        logger.log(`A new version is available: ${latestVersion}`);
        logger.log(`Currently installed version: ${currentVersion || "None"}`);

        const answer = await promptUser(
          `Do you want to update to version ${latestVersion}? (y/N): `
        );
        if (answer.toLowerCase() !== "y") {
          logger.log("Update aborted by the user.");
          return;
        }

        logger.log(`Updating to version ${latestVersion}...`);
        await driverManager.installDriver({
          force: true,
          version: latestVersion,
        });
        logger.log(`Driver updated to version ${latestVersion} successfully.`);
      } catch (error) {
        logger.error(`Error during update: ${error.message}`);
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
        const config = await driverManager.loadConfig();

        if (options.set) {
          const [key, value] = options.set.split(" ");
          config[key] = value;
          await driverManager.saveConfig(config);
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
        logger.error(`Error managing configuration: ${error.message}`);
        process.exit(1);
      }
    });

  await program.parseAsync(process.argv);
}

main().catch((err) => {
  logger.error(`CLI execution failed: ${err.message}`);
  process.exit(1);
});
