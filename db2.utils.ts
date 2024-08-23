/**
 * Formats a Db2 error into a standardized error message.
 * @param error The error object containing details about the failure.
 * @param context A description of where the error occurred.
 * @param metadata Optional additional information to include with the error.
 * @returns A formatted error string with code, message, and context.
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
