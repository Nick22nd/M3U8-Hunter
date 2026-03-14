import Logger from 'electron-log'
import type { ErrorCode, AppError as IAppError } from '../../shared/types'

/**
 * Error handling context
 */
interface ErrorContext {
  [key: string]: any
}

/**
 * Error handling options
 */
interface ErrorHandlingOptions {
  logError?: boolean
  notifyUser?: boolean
  throwError?: boolean
  context?: ErrorContext
  recoverable?: boolean
}

/**
 * Unified error handler for application-wide error management
 */
export class ErrorHandler {
  private static instance: ErrorHandler
  private errorHistory: Array<{ timestamp: number, error: IAppError, context?: ErrorContext }> = []
  private maxHistorySize = 100

  private constructor() {
    this.setupGlobalErrorHandlers()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ErrorHandler {
    if (!ErrorHandler.instance) {
      ErrorHandler.instance = new ErrorHandler()
    }
    return ErrorHandler.instance
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalErrorHandlers(): void {
    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      this.handleCriticalError(error, {
        type: 'uncaughtException',
        context: 'Global process',
      })
    })

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      this.handleCriticalError(new Error(String(reason)), {
        type: 'unhandledRejection',
        promise: String(promise),
      })
    })
  }

  /**
   * Handle application error with unified strategy
   */
  handle(error: Error, options: ErrorHandlingOptions = {}): void {
    const {
      logError = true,
      notifyUser = false,
      throwError = true,
      context = {},
      recoverable = false,
    } = options

    // Add to error history
    this.addToHistory(error, context)

    // Log error
    if (logError) {
      this.logError(error, context)
    }

    // Create app error if not already one
    const appError = this.ensureAppError(error)

    // Notify user if requested
    if (notifyUser && typeof window !== 'undefined') {
      this.notifyUserOfError(appError, context, recoverable)
    }

    // Throw error if requested
    if (throwError) {
      throw appError
    }
  }

  /**
   * Handle critical errors
   */
  private handleCriticalError(error: Error, context: ErrorContext): void {
    Logger.error('[ErrorHandler] Critical error:', error, context)

    // Add to history
    this.addToHistory(error, context)

    // In production, you might want to:
    // 1. Send to error tracking service
    // 2. Save crash dump
    // 3. Restart application

    // For now, just log the error
    Logger.error('[ErrorHandler] Application would normally restart here')
  }

  /**
   * Log error with context
   */
  private logError(error: Error, context: ErrorContext): void {
    const appError = this.ensureAppError(error)

    if (context && Object.keys(context).length > 0) {
      Logger.error(`[ErrorHandler] Error occurred:`, {
        code: appError.code,
        message: appError.message,
        statusCode: appError.statusCode,
        context,
      })
    }
    else {
      Logger.error(`[ErrorHandler] Error occurred:`, appError)
    }
  }

  /**
   * Ensure error is an AppError
   */
  private ensureAppError(error: Error): IAppError {
    const { AppError, ErrorCode } = require('../../shared/types')

    if (error instanceof AppError) {
      return error
    }

    // Create appropriate error type based on error characteristics
    let code = ErrorCode.UNKNOWN_ERROR

    if (error.message.includes('network') || error.message.includes('ENOTFOUND')) {
      code = ErrorCode.NETWORK_ERROR
    }
    else if (error.message.includes('timeout') || error.message.includes('ETIMEDOUT')) {
      code = ErrorCode.NETWORK_TIMEOUT
    }
    else if (error.message.includes('ENOENT') || error.message.includes('not found')) {
      code = ErrorCode.FILE_NOT_FOUND
    }
    else if (error.message.includes('permission') || error.message.includes('EACCES')) {
      code = ErrorCode.PERMISSION_DENIED
    }
    else if (error.message.includes('disk') || error.message.includes('ENOSPC')) {
      code = ErrorCode.DISK_FULL
    }

    // @ts-expect-error - AppError constructor matches
    return new AppError(code, error.message, undefined, { originalError: error })
  }

  /**
   * Notify user of error (for renderer process)
   */
  private notifyUserOfError(error: IAppError, context: ErrorContext, recoverable: boolean): void {
    // This would typically show a dialog or notification
    // For now, we'll just log that we would notify
    Logger.info(`[ErrorHandler] User notification: ${error.message} (recoverable: ${recoverable})`)
  }

  /**
   * Add error to history
   */
  private addToHistory(error: Error, context: ErrorContext): void {
    this.errorHistory.push({
      timestamp: Date.now(),
      error: this.ensureAppError(error),
      context,
    })

    // Keep history size manageable
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory.shift()
    }
  }

  /**
   * Get error history
   */
  getErrorHistory(limit?: number): Array<{ timestamp: number, error: IAppError, context?: ErrorContext }> {
    if (limit) {
      return this.errorHistory.slice(-limit)
    }
    return [...this.errorHistory]
  }

  /**
   * Clear error history
   */
  clearErrorHistory(): void {
    this.errorHistory = []
  }

  /**
   * Get error statistics
   */
  getErrorStatistics(): {
    totalErrors: number
    errorsByCode: Record<string, number>
    recentErrors: number
    errorRate: number
  } {
    const now = Date.now()
    const oneHourAgo = now - (60 * 60 * 1000)

    const errorsByCode: Record<string, number> = {}
    const recentErrors = this.errorHistory.filter(e => e.timestamp > oneHourAgo).length

    for (const entry of this.errorHistory) {
      const code = entry.error.code
      errorsByCode[code] = (errorsByCode[code] || 0) + 1
    }

    const totalErrors = this.errorHistory.length
    const errorRate = totalErrors > 0 ? (recentErrors / totalErrors) * 100 : 0

    return {
      totalErrors,
      errorsByCode,
      recentErrors,
      errorRate,
    }
  }

  /**
   * Wrap async function with error handling
   */
  static wrapAsync<T extends any[], R>(
    fn: (...args: T) => Promise<R>,
    options: ErrorHandlingOptions = {},
  ): (...args: T) => Promise<R> {
    return async (...args: T): Promise<R> => {
      try {
        return await fn(...args)
      }
      catch (error) {
        const handler = ErrorHandler.getInstance()
        handler.handle(error as Error, options)
        throw error
      }
    }
  }

  /**
   * Wrap function with error handling
   */
  static wrap<T extends any[], R>(
    fn: (...args: T) => R,
    options: ErrorHandlingOptions = {},
  ): (...args: T) => R {
    return (...args: T): R => {
      try {
        return fn(...args)
      }
      catch (error) {
        const handler = ErrorHandler.getInstance()
        handler.handle(error as Error, options)
        throw error
      }
    }
  }

  /**
   * Create middleware for Express routes
   */
  static createMiddleware() {
    return (error: Error, req: any, res: any, next: any) => {
      const handler = ErrorHandler.getInstance()

      handler.handle(error, {
        context: {
          method: req.method,
          url: req.url,
          ip: req.ip,
        },
      })

      // Send error response
      res.status(500).json({
        success: false,
        error: {
          message: error.message,
          code: error.name,
        },
      })
    }
  }
}

// Export singleton instance
export const errorHandler = ErrorHandler.getInstance()
