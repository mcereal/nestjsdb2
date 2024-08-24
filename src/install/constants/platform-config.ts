// src/install/constants/platform-config.ts

import path from "path";
import { Platform, Architecture } from "../enums/install-driver.enum";
import { PlatformConfig } from "../interfaces/platform-config.interface";

export const platformConfig: PlatformConfig = {
  [Platform.WINDOWS]: {
    defaultInstallDir: path.join(process.env.APPDATA || "", "ibmDb2"),
    driverFileName: {
      [Architecture.X64]: "ntx64_odbc_cli.zip",
    },
  },
  [Platform.MACOS]: {
    defaultInstallDir: path.join(
      process.env.HOME || "",
      "Library",
      "Application Support",
      "ibmDb2"
    ),
    driverFileName: {
      [Architecture.X64]: "macos64_odbc_cli.tar.gz", // Use Rosetta to run x86_64
      [Architecture.ARM64]: "macos64_odbc_cli.tar.gz", // Assume ARM64 can use the same as x64 for now
    },
  },
  [Platform.LINUX]: {
    defaultInstallDir: path.join(
      process.env.HOME || "",
      ".local",
      "share",
      "ibmDb2"
    ),
    driverFileName: {
      [Architecture.X64]: "linuxx64_odbc_cli.tar.gz",
      [Architecture.PPC64]: "linuxppc64_odbc_cli.tar.gz",
      [Architecture.S390X]: "linuxs390x_odbc_cli.tar.gz",
    },
  },
  [Platform.AIX]: {
    defaultInstallDir: path.join("/usr", "local", "ibmDb2"),
    driverFileName: {
      [Architecture.PPC64]: "aix64_odbc_cli.tar.gz",
    },
  },
  [Platform.ZOS]: {
    defaultInstallDir: path.join("/usr", "local", "ibmDb2"),
    driverFileName: {
      [Architecture.S390X]: "zos_s390x_odbc_cli.tar.gz",
    },
  },
};
