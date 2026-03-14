import { join } from 'node:path'
import fs from 'node:fs'
import Logger from 'electron-log'
import type { LoggingConfig } from '../../shared/types'

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
}

/**
 * Log entry structure
 */
interface LogEntry {
  timestamp: number
  level: LogLevel
  module: string
  message: string
  context?: any
  error?: Error
  stack?: string
}

/**
 * Enhanced logger with structured logging
 */
export class LoggerService {
  private static instance: LoggerService
  private config: LoggingConfig
  private logBuffer: LogEntry[] = []
  private maxBufferSize = 1000
  private logLevels: Map<LogLevel, number> = new Map([
    [LogLevel.DEBUG, 0],
    [LogLevel.INFO, 1],
    [LogLevel.WARN, 2],
    [LogLevel.ERROR, 3],
  ])

  private constructor(config?: LoggingConfig) {
    this.config = config || {
      level: LogLevel.INFO,
      file: true,
      console: true,
      maxSize: '10MB',
      maxFiles: 5,
    }

    this.initializeLogger()
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: LoggingConfig): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService(config)
    }
    return LoggerService.instance
  }

  /**
   * Initialize logger configuration
   */
  private initializeLogger(): void {
    // Configure electron-log
    if (this.config.file) {
      Logger.transports.file.level = this.config.level
      Logger.transports.file.maxSize = this.config.maxSize
      Logger.transports.file.file = this.getLogFilePath()
    }

    if (this.config.console) {
      Logger.transports.console.level = this.config.level
    }

    this.logInfo('[LoggerService] Logger initialized', {
      level: this.config.level,
      file: this.config.file,
      console: this.config.console,
    })
  }

  /**
   * Update logger configuration
   */
  updateConfig(config: Partial<LoggingConfig>): void {
    this.config = { ...this.config, ...config }
    this.initializeLogger()

    this.logInfo('[LoggerService] Logger configuration updated', config)
  }

  /**
   * Get log file path
   */
  private getLogFilePath(): string {
    const appDataDir = process.env.APPDATA || process.env.HOME || '.'
    return join(appDataDir, 'logs', 'm3u8-hunter.log')
  }

  /**
   * Check if log level is enabled
   */
  private isLevelEnabled(level: LogLevel): boolean {
    const currentLevel = this.logLevels.get(this.config.level) || 1
    const targetLevel = this.logLevels.get(level) || 1
    return targetLevel >= currentLevel
  }

  /**
   * Format log entry
   */
  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString()
    const level = entry.level.toUpperCase().padEnd(5)
    const module = entry.module.padEnd(20)

    let message = `[${timestamp}] [${level}] [${module}] ${entry.message}`

    if (entry.context) {
      message += ` | Context: ${JSON.stringify(entry.context)}`
    }

    if (entry.error) {
      message += ` | Error: ${entry.error.message}`
      if (entry.stack) {
        message += `\n${entry.stack}`
      }
    }

    return message
  }

  /**
   * Add log entry to buffer
   */
  private addToBuffer(entry: LogEntry): void {
    this.logBuffer.push(entry)

    // Keep buffer size manageable
    if (this.logBuffer.length > this.maxBufferSize) {
      this.logBuffer.shift()
    }
  }

  /**
   * Write log entry
   */
  private writeLog(level: LogLevel, module: string, message: string, context?: any, error?: Error): void {
    if (!this.isLevelEnabled(level)) {
      return
    }

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      module,
      message,
      context,
      error,
      stack: error?.stack,
    }

    // Add to buffer
    this.addToBuffer(entry)

    // Format and write log
    const formattedMessage = this.formatLogEntry(entry)

    switch (level) {
      case LogLevel.DEBUG:
        Logger.debug(formattedMessage)
        break
      case LogLevel.INFO:
        Logger.info(formattedMessage)
        break
      case LogLevel.WARN:
        Logger.warn(formattedMessage)
        break
      case LogLevel.ERROR:
        Logger.error(formattedMessage)
        break
    }
  }

  /**
   * Debug level logging
   */
  debug(module: string, message: string, context?: any): void {
    this.writeLog(LogLevel.DEBUG, module, message, context)
  }

  /**
   * Info level logging
   */
  info(module: string, message: string, context?: any): void {
    this.writeLog(LogLevel.INFO, module, message, context)
  }

  /**
   * Warn level logging
   */
  warn(module: string, message: string, context?: any): void {
    this.writeLog(LogLevel.WARN, module, message, context)
  }

  /**
   * Error level logging
   */
  error(module: string, message: string, error?: Error, context?: any): void {
    this.writeLog(LogLevel.ERROR, module, message, context, error)
  }

  /**
   * Get recent logs
   */
  getRecentLogs(count: number = 100, minLevel: LogLevel = LogLevel.INFO): LogEntry[] {
    const minLevelValue = this.logLevels.get(minLevel) || 0

    return this.logBuffer
      .filter(entry => (this.logLevels.get(entry.level) || 0) >= minLevelValue)
      .slice(-count)
  }

  /**
   * Get logs by module
   */
  getLogsByModule(module: string, count: number = 100): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.module === module)
      .slice(-count)
  }

  /**
   * Get error logs
   */
  getErrorLogs(count: number = 100): LogEntry[] {
    return this.logBuffer
      .filter(entry => entry.level === LogLevel.ERROR)
      .slice(-count)
  }

  /**
   * Clear log buffer
   */
  clearBuffer(): void {
    this.logBuffer = []
    this.logInfo('[LoggerService] Log buffer cleared')
  }

  /**
   * Export logs to file
   */
  async exportLogs(filePath?: string): Promise<string> {
    try {
      const exportPath = filePath || join(
        process.env.APPDATA || process.env.HOME || '.',
        `m3u8-hunter-logs-${Date.now()}.json`,
      )

      const logsData = {
        exportTime: new Date().toISOString(),
        totalLogs: this.logBuffer.length,
        logs: this.logBuffer,
      }

      fs.writeFileSync(exportPath, JSON.stringify(logsData, null, 2), 'utf8')

      this.logInfo('[LoggerService] Logs exported to', { path: exportPath })

      return exportPath
    }
    catch (error) {
      this.logError('[LoggerService] Failed to export logs', error as Error)
      throw error
    }
  }

  /**
   * Get log statistics
   */
  getLogStatistics(): {
    totalLogs: number
    logsByLevel: Record<LogLevel, number>
    logsByModule: Record<string, number>
    recentErrorCount: number
  } {
    const logsByLevel: Record<LogLevel, number> = {
      [LogLevel.DEBUG]: 0,
      [LogLevel.INFO]: 0,
      [LogLevel.WARN]: 0,
      [LogLevel.ERROR]: 0,
    }

    const logsByModule: Record<string, number> = {}

    for (const entry of this.logBuffer) {
      logsByLevel[entry.level]++
      logsByModule[entry.module] = (logsByModule[entry.module] || 0) + 1
    }

    const oneHourAgo = Date.now() - (60 * 60 * 1000)
    const recentErrorCount = this.logBuffer.filter(
      entry => entry.level === LogLevel.ERROR && entry.timestamp > oneHourAgo,
    ).length

    return {
      totalLogs: this.logBuffer.length,
      logsByLevel,
      logsByModule,
      recentErrorCount,
    }
  }

  /**
   * Convenience methods for backward compatibility
   */
  logInfo(message: string, context?: any): void {
    this.info('App', message, context)
  }

  logError(message: string, error?: Error, context?: any): void {
    this.error('App', message, error, context)
  }

  logWarn(message: string, context?: any): void {
    this.warn('App', message, context)
  }

  logDebug(message: string, context?: any): void {
    this.debug('App', message, context)
  }

  /**
   * Get current log level
   */
  getCurrentLevel(): LogLevel {
    return this.config.level
  }

  /**
   * Set log level
   */
  setLogLevel(level: LogLevel): void {
    this.config.level = level
    this.initializeLogger()
    this.logInfo('[LoggerService] Log level changed to', { level })
  }
}

// Export singleton instance
export const logger = LoggerService.getInstance()
