// src/utils/sql-injection-checker.ts

import {
  SqlInjectionCheckerOptions,
  SqlInjectionCheckerInterface,
} from "../interfaces";

export class SqlInjectionChecker implements SqlInjectionCheckerInterface {
  private readonly options: SqlInjectionCheckerOptions;
  private readonly sqlInjectionPatterns: RegExp[];

  constructor(options: SqlInjectionCheckerOptions = {}) {
    // Set default options if none are provided
    this.options = {
      enableStrictMode: options.enableStrictMode ?? false, // Default to non-strict mode
      whitelistedPatterns: options.whitelistedPatterns || [], // Default to no whitelisted patterns
      logWarnings: options.logWarnings ?? true, // Default to log warnings
    };

    // Define common SQL injection patterns
    this.sqlInjectionPatterns = [
      /(\b(UNION|SELECT|INSERT|DELETE|UPDATE|DROP|EXEC|TRUNCATE|ALTER|CREATE|SHUTDOWN|GRANT|REVOKE|DECLARE|BEGIN|COMMIT|ROLLBACK|TRANSACTION)\b)/i,
      /(--|;|\/\*|\*\/|xp_cmdshell|0x[0-9A-Fa-f]+|\'\s*OR\s*\'[^\']*\'\s*=\s*\'[^\']*|\'\s*=\s*\')/i,
      /\b(OR|AND)\b\s+[^=]*=/i,
      /([\"\'\`\;\\])/,
      /(\bexec\b.*\bsp_|execute)/i,
      /(\bselect\b.*\bfrom\b.*\bwhere\b.*)/i,
      /\b(waitfor|delay|shutdown|--|#|\/\*|\*\/)\b/i,
    ];
  }

  /**
   * Validates an array of parameters to check for SQL injection risks.
   * @param params The array of parameters to validate.
   * @throws Error if any parameter is deemed unsafe and strict mode is enabled.
   */
  public validateParams(params: any[]): void {
    params.forEach((param) => {
      if (param === undefined || param === null) {
        throw new Error("Parameter value cannot be null or undefined");
      }

      const allowedTypes = ["string", "number", "boolean", "object"];
      if (!allowedTypes.includes(typeof param)) {
        throw new Error(`Invalid parameter type: ${typeof param}`);
      }

      if (typeof param === "object") {
        if (param instanceof Date) {
          if (isNaN(param.getTime())) {
            throw new Error("Invalid Date object");
          }
        } else if (Array.isArray(param)) {
          this.validateParams(param); // Recursive validation for arrays
        } else {
          throw new Error(
            "Only Date objects and arrays are allowed as parameter objects"
          );
        }
      }

      if (typeof param === "string") {
        this.checkForInjection(param); // Validate strings for SQL injection
      }

      if (typeof param === "number") {
        if (!Number.isFinite(param)) {
          throw new Error("Number parameter is not finite");
        }
        if (param < -1e9 || param > 1e9) {
          throw new Error("Number parameter is out of valid range");
        }
      }
    });
  }

  /**
   * Checks a single string parameter for SQL injection patterns.
   * @param param The string parameter to check.
   * @throws Error if potential SQL injection is detected and strict mode is enabled.
   */
  private checkForInjection(param: string): void {
    const normalizedParam = param.trim().toLowerCase();

    for (const pattern of this.sqlInjectionPatterns) {
      if (pattern.test(normalizedParam)) {
        // Check against whitelisted patterns first
        if (
          this.options.whitelistedPatterns.some((whitelistPattern) =>
            whitelistPattern.test(param)
          )
        ) {
          continue; // Skip if it matches a whitelisted pattern
        }

        // Log or throw error based on configuration
        if (this.options.logWarnings) {
          console.warn(
            `Potential SQL injection detected: ${param} (Pattern: ${pattern})`
          );
        }
        if (this.options.enableStrictMode) {
          throw new Error(
            `Potential SQL injection attempt detected in parameter: ${param}`
          );
        }
      }
    }
  }
}
