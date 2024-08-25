// src/install/interfaces/platform-config.interface.ts

import { Platform, Architecture } from "../enums/install-driver.enum";

interface PlatformConfigEntry {
  defaultInstallDir: string;
  driverFileName: string | Partial<Record<Architecture, string | null>>;
}

export type PlatformConfig = Partial<Record<Platform, PlatformConfigEntry>>;
