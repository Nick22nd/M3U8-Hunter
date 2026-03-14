import { beforeEach, describe, expect, it } from 'vitest'
import { ErrorHandler } from '../../src/main/core/error-handler'

describe('errorHandler', () => {
  let errorHandler: ErrorHandler

  beforeEach(() => {
    errorHandler = ErrorHandler.getInstance()
  })

  describe('error handling', () => {
    it('should handle errors with logging', () => {
      const testError = new Error('Test error')

      expect(() => {
        errorHandler.handle(testError, {
          logError: true,
          throwError: false,
        })
      }).not.toThrow()
    })

    it('should throw errors when requested', () => {
      const testError = new Error('Test error')

      expect(() => {
        errorHandler.handle(testError, {
          throwError: true,
        })
      }).toThrow()
    })

    it('should maintain error history', () => {
      const testError = new Error('Test error')

      errorHandler.handle(testError, {
        throwError: false,
      })

      const history = errorHandler.getErrorHistory()
      expect(history.length).toBeGreaterThan(0)

      const lastError = history[history.length - 1]
      expect(lastError.error.message).toBe('Test error')
    })
  })

  describe('error statistics', () => {
    it('should provide error statistics', () => {
      const testError1 = new Error('Error 1')
      const testError2 = new Error('Error 2')

      errorHandler.handle(testError1, { throwError: false })
      errorHandler.handle(testError2, { throwError: false })

      const stats = errorHandler.getErrorStatistics()

      expect(stats.totalErrors).toBeGreaterThanOrEqual(2)
      expect(stats.errorsByCode).toBeDefined()
    })
  })

  describe('error wrapping', () => {
    it('should wrap async functions', async () => {
      const asyncFn = async () => {
        throw new Error('Async error')
      }

      const wrappedFn = ErrorHandler.wrapAsync(asyncFn)

      await expect(wrappedFn()).rejects.toThrow('Async error')
    })

    it('should wrap sync functions', () => {
      const syncFn = () => {
        throw new Error('Sync error')
      }

      const wrappedFn = ErrorHandler.wrap(syncFn)

      expect(() => wrappedFn()).toThrow('Sync error')
    })
  })
})
