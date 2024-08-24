export enum Platform {
  WINDOWS = "win32", // Windows
  MACOS = "darwin", // macOS (formerly Mac OS X)
  LINUX = "linux", // Linux (including WSL)
  AIX = "aix", // AIX (IBM) - Advanced Interactive eXecutive
  ZOS = "zos",
}

export enum Architecture {
  X64 = "x64", // x86-64 (64-bit)
  ARM64 = "arm64", // ARM64 (Apple Silicon)
  PPC64 = "ppc64", // PowerPC 64-bit
  S390X = "s390x", // IBM Z (System z) 64-bit
}

export enum LogLevel {
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
}
