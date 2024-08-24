import { LogLevel } from "../enums/install-driver.enum";

export interface DownloadOptions {
  url: string;
  outputPath: string;
  retryCount?: number;
  checksum?: string;
  skipSslVerification?: boolean;
}

export interface InstallOptions {
  downloadUrl?: string;
  logLevel?: LogLevel;
  retryCount?: number;
  checksum?: string;
  verbose?: boolean;
  force?: boolean;
  skipSslVerification?: boolean;
  outputPath?: string;
  checkOnly?: boolean;
  dryRun?: boolean;
  installDir?: string;
  version?: string;
}
