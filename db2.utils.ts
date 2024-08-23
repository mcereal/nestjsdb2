/**
 * @fileoverview This file contains the implementation of the `formatDb2Error` function.
 * The `formatDb2Error` function is used to create a standardized error message format for
 * errors encountered when interacting with a Db2 database. By providing consistent error formatting,
 * this function aids in debugging and logging by ensuring that error details are clear, structured,
 * and include relevant metadata.
 *
 * @function formatDb2Error
 *
 * @exports formatDb2Error
 */

/**
 * @function formatDb2Error
 * @description Formats a Db2 error into a standardized error message string. This function extracts
 * important details from the error object, such as the error code, message, and stack trace, and
 * combines them with context and optional metadata to produce a comprehensive error message. This
 * formatted message is useful for logging, debugging, and error reporting.
 *
 * @param {any} error - The error object containing details about the failure. It typically includes properties like `code`, `message`, and `stack`.
 * @param {string} context - A description of where the error occurred, such as the method or process name.
 * @param {Record<string, any>} [metadata] - Optional additional information to include with the error, represented as a key-value pair object.
 *
 * @returns {string} - A formatted error string that includes the error code, message, context, stack trace (if available), and optional metadata.
 *
 * @example
 * // Example usage of formatDb2Error
 * import { formatDb2Error } from './db2.utils';
 *
 * try {
 *   // Some Db2 operation that may fail
 * } catch (error) {
 *   const formattedError = formatDb2Error(error, 'Connecting to Db2', {
 *     host: 'localhost',
 *     database: 'sampledb'
 *   });
 *   console.error(formattedError);
 * }
 */
export function formatDb2Error(
  error: any,
  context: string,
  metadata?: Record<string, any>
): string {
  const errorCode = error.code || "UNKNOWN_ERROR";
  const errorMessage = error.message || "An unknown error occurred";
  const metadataString = metadata ? JSON.stringify(metadata, null, 2) : "";
  const stackTrace = error.stack ? `\nStack Trace: ${error.stack}` : "";

  return `Error in ${context} - Code: ${errorCode}, Message: ${errorMessage}${stackTrace}${
    metadataString ? `\nMetadata: ${metadataString}` : ""
  }`;
}
