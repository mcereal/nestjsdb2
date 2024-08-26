export interface SqlInjectionCheckerInterface {
  /**
   * Validates an array of parameters to check for SQL injection risks.
   * @param params The array of parameters to validate.
   * @throws Error if any parameter is deemed unsafe and strict mode is enabled.
   */
  validateParams(params: any[]): void;
}
