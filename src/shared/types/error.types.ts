/**
 * Error types and codes
 */
export enum ErrorCode {
  // Network errors
  NETWORK_ERROR = 'NETWORK_ERROR',
  NETWORK_TIMEOUT = 'NETWORK_TIMEOUT',
  CONNECTION_REFUSED = 'CONNECTION_REFUSED',

  // Download errors
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  DOWNLOAD_CANCELLED = 'DOWNLOAD_CANCELLED',
  DOWNLOAD_PAUSED = 'DOWNLOAD_PAUSED',
  SEGMENT_MISSING = 'SEGMENT_MISSING',
  KEY_DOWNLOAD_FAILED = 'KEY_DOWNLOAD_FAILED',

  // File system errors
  FILE_NOT_FOUND = 'FILE_NOT_FOUND',
  FILE_READ_ERROR = 'FILE_READ_ERROR',
  FILE_WRITE_ERROR = 'FILE_WRITE_ERROR',
  DIRECTORY_CREATION_FAILED = 'DIRECTORY_CREATION_FAILED',
  DIRECTORY_EXISTS = 'DIRECTORY_EXISTS',

  // Parsing errors
  INVALID_M3U8 = 'INVALID_M3U8',
  M3U8_PARSE_ERROR = 'M3U8_PARSE_ERROR',
  INVALID_MANIFEST = 'INVALID_MANIFEST',

  // Aria2 errors
  ARIA2_NOT_RUNNING = 'ARIA2_NOT_RUNNING',
  ARIA2_CONNECTION_ERROR = 'ARIA2_CONNECTION_ERROR',
  ARIA2_DOWNLOAD_ERROR = 'ARIA2_DOWNLOAD_ERROR',

  // Task errors
  TASK_NOT_FOUND = 'TASK_NOT_FOUND',
  TASK_ALREADY_EXISTS = 'TASK_ALREADY_EXISTS',
  TASK_UPDATE_FAILED = 'TASK_UPDATE_FAILED',
  TASK_DELETE_FAILED = 'TASK_DELETE_FAILED',

  // Configuration errors
  INVALID_CONFIG = 'INVALID_CONFIG',
  CONFIG_LOAD_ERROR = 'CONFIG_LOAD_ERROR',
  CONFIG_SAVE_ERROR = 'CONFIG_SAVE_ERROR',

  // System errors
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DISK_FULL = 'DISK_FULL',
  OUT_OF_MEMORY = 'OUT_OF_MEMORY',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  INVALID_ARGUMENT = 'INVALID_ARGUMENT',
}

export interface ErrorDetails {
  code: ErrorCode
  message: string
  statusCode?: number
  timestamp: number
  context?: any
  stack?: string
}

export class AppError extends Error {
  public readonly code: ErrorCode
  public readonly statusCode?: number
  public readonly context?: any
  public readonly timestamp: number

  constructor(
    code: ErrorCode,
    message: string,
    statusCode?: number,
    context?: any,
  ) {
    super(message)
    this.name = 'AppError'
    this.code = code
    this.statusCode = statusCode
    this.context = context
    this.timestamp = Date.now()
    Error.captureStackTrace(this, this.constructor)
  }

  toJSON(): ErrorDetails {
    return {
      code: this.code,
      message: this.message,
      statusCode: this.statusCode,
      timestamp: this.timestamp,
      context: this.context,
      stack: this.stack,
    }
  }
}

export class NetworkError extends AppError {
  constructor(message: string, context?: any) {
    super(ErrorCode.NETWORK_ERROR, message, undefined, context)
    this.name = 'NetworkError'
  }
}

export class DownloadError extends AppError {
  constructor(message: string, context?: any) {
    super(ErrorCode.DOWNLOAD_FAILED, message, undefined, context)
    this.name = 'DownloadError'
  }
}

export class FileSystemError extends AppError {
  constructor(message: string, statusCode?: number, context?: any) {
    super(ErrorCode.FILE_NOT_FOUND, message, statusCode, context)
    this.name = 'FileSystemError'
  }
}

export class TaskError extends AppError {
  constructor(message: string, context?: any) {
    super(ErrorCode.TASK_NOT_FOUND, message, undefined, context)
    this.name = 'TaskError'
  }
}

export class ConfigError extends AppError {
  constructor(message: string, context?: any) {
    super(ErrorCode.INVALID_CONFIG, message, undefined, context)
    this.name = 'ConfigError'
  }
}
