import { LogLevel } from '../enums';

// src/logger/color-codes.ts
export const ColorCodes: { [key: string]: string } = {
  [LogLevel.ERROR]: '\x1b[31m', // Red
  [LogLevel.WARN]: '\x1b[33m', // Yellow
  [LogLevel.INFO]: '\x1b[32m', // Green
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.VERBOSE]: '\x1b[35m', // Magenta
  white: '\x1b[37m', // White
  yellow: '\x1b[33m', // Yellow
};

export const ResetCode = '\x1b[0m'; // Reset to default
