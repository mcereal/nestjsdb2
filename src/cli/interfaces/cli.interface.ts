import { LogLevel } from "../../install/enums/install-driver.enum";

export interface CLIOptions {
  downloadUrl?: string;
  logLevel?: LogLevel;
  retries?: number;
  checksum?: string;
  verbose?: boolean;
  force?: boolean;
  skipSslVerification?: boolean;
  outputPath?: string;
  checkOnly?: boolean;
  dryRun?: boolean;
  config?: string;
  installDir?: string;
}
