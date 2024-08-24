// src/install/constants/platform-config.ts

import path from "path";
import { Platform, Architecture } from "../enums/install-driver.enum";
import { PlatformConfig } from "../interfaces/platform-config.interface";

export const platformConfig: PlatformConfig = {
  [Platform.WINDOWS]: {
    defaultInstallDir: path.join(process.env.APPDATA || "", "nestjs-ibm-db2"),
    driverFileName: {
      [Architecture.X64]: "ntx64_odbc_cli.zip",
    },
  },
  [Platform.MACOS]: {
    defaultInstallDir: path.join(
      process.env.HOME || "",
      "Library",
      "Application Support",
      "nestjs-ibm-db2"
    ),
    driverFileName: {
      [Architecture.X64]: "macos64_odbc_cli.tar.gz",
      [Architecture.ARM64]: null, // Special handling for ARM64 with Rosetta
    },
  },
  [Platform.LINUX]: {
    defaultInstallDir: path.join(
      process.env.HOME || "",
      ".local",
      "share",
      "nestjs-ibm-db2"
    ),
    driverFileName: {
      [Architecture.X64]: "linuxx64_odbc_cli.tar.gz",
      [Architecture.PPC64]: "linuxppc64_odbc_cli.tar.gz",
      [Architecture.S390X]: "linuxs390x_odbc_cli.tar.gz",
    },
  },
  [Platform.AIX]: {
    defaultInstallDir: path.join("/usr", "local", "nestjs-ibm-db2"),
    driverFileName: {
      [Architecture.PPC64]: "aix64_odbc_cli.tar.gz",
    },
  },
  [Platform.ZOS]: {
    defaultInstallDir: path.join("/usr", "local", "nestjs-ibm-db2"),
    driverFileName: {
      [Architecture.S390X]: "zos_s390x_odbc_cli.tar.gz",
    },
  },
};
