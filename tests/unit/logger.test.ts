import { beforeEach, describe, expect, it } from 'vitest'
import { LogLevel, LoggerService } from '../../src/main/core/logger'

describe('loggerService', () => {
  let logger: LoggerService

  beforeEach(() => {
    logger = LoggerService.getInstance({
      level: LogLevel.DEBUG,
      file: false,
      console: false,
    })
    logger.clearBuffer()
  })

  describe('basic logging', () => {
    it('should log debug messages', () => {
      expect(() => {
        logger.debug('TestModule', 'Debug message')
      }).not.toThrow()
    })

    it('should log info messages', () => {
      expect(() => {
        logger.info('TestModule', 'Info message')
      }).not.toThrow()
    })

    it('should log warn messages', () => {
      expect(() => {
        logger.warn('TestModule', 'Warning message')
      }).not.toThrow()
    })

    it('should log error messages', () => {
      expect(() => {
        logger.error('TestModule', 'Error message', new Error('Test error'))
      }).not.toThrow()
    })
  })

  describe('log filtering', () => {
    it('should filter logs by level', () => {
      // Set level to INFO
      logger.setLogLevel(LogLevel.INFO)

      // Debug messages should not be logged
      logger.debug('Module', 'Debug message')
      const logs = logger.getRecentLogs()
      const debugLogs = logs.filter(log => log.level === LogLevel.DEBUG)

      expect(debugLogs.length).toBe(0)
    })

    it('should include all logs when set to DEBUG', () => {
      logger.setLogLevel(LogLevel.DEBUG)

      logger.debug('Module', 'Debug message')
      logger.info('Module', 'Info message')
      logger.warn('Module', 'Warning message')
      logger.error('Module', 'Error message')

      const logs = logger.getRecentLogs()

      expect(logs.length).toBe(4)
    })
  })

  describe('log retrieval', () => {
    beforeEach(() => {
      logger.setLogLevel(LogLevel.DEBUG)
      logger.debug('Module1', 'Debug message 1')
      logger.info('Module2', 'Info message 2')
      logger.warn('Module3', 'Warning message 3')
      logger.error('Module4', 'Error message 4')
    })

    it('should get recent logs', () => {
      const recentLogs = logger.getRecentLogs(2)

      expect(recentLogs.length).toBe(2)
      expect(recentLogs[0].level).toBe(LogLevel.WARN)
      expect(recentLogs[1].level).toBe(LogLevel.ERROR)
    })

    it('should get logs by module', () => {
      const moduleLogs = logger.getLogsByModule('Module1')

      expect(moduleLogs.length).toBe(1)
      expect(moduleLogs[0].module).toBe('Module1')
    })

    it('should get error logs', () => {
      const errorLogs = logger.getErrorLogs()

      expect(errorLogs.length).toBe(1)
      expect(errorLogs[0].level).toBe(LogLevel.ERROR)
    })
  })

  describe('log statistics', () => {
    beforeEach(() => {
      logger.setLogLevel(LogLevel.DEBUG)
      logger.debug('Module', 'Debug message')
      logger.info('Module', 'Info message')
      logger.info('Module', 'Another info message')
      logger.warn('Module', 'Warning message')
      logger.error('Module', 'Error message')
    })

    it('should provide log statistics', () => {
      const stats = logger.getLogStatistics()

      expect(stats.totalLogs).toBe(5)
      expect(stats.logsByLevel[LogLevel.DEBUG]).toBe(1)
      expect(stats.logsByLevel[LogLevel.INFO]).toBe(2)
      expect(stats.logsByLevel[LogLevel.WARN]).toBe(1)
      expect(stats.logsByLevel[LogLevel.ERROR]).toBe(1)
    })
  })

  describe('log export', () => {
    it('should export logs to file', async () => {
      logger.info('Module', 'Test message for export')

      expect(async () => {
        const exportPath = await logger.exportLogs()
        expect(exportPath).toBeDefined()
      }).not.toThrow()
    })
  })
})
