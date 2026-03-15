import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryManager } from '../../src/main/core/memory-manager'

describe('MemoryManager', () => {
  let memoryManager: MemoryManager

  beforeEach(() => {
    memoryManager = MemoryManager.getInstance()
  })

  describe('memory monitoring', () => {
    it('should track memory usage', () => {
      const stats = memoryManager.getMemoryStats()

      expect(stats).toBeDefined()
      expect(stats.heapUsed).toBeGreaterThan(0)
      expect(stats.heapTotal).toBeGreaterThan(0)
      expect(stats.rss).toBeGreaterThan(0)
    })

    it('should provide memory usage history', () => {
      // Force some memory activity
      const data = new Array(1000000).fill('test')

      const stats1 = memoryManager.getMemoryStats()
      memoryManager.recordMemoryUsage('test_operation')

      // Allow some time for GC
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const stats2 = memoryManager.getMemoryStats()
          const history = memoryManager.getMemoryHistory()

          expect(history.length).toBeGreaterThan(0)
          expect(history[0].operation).toBe('test_operation')

          // Clean up
          data.length = 0
          resolve()
        }, 100)
      })
    })
  })

  describe('operation tracking', () => {
    it('should track operation memory usage', () => {
      const operationId = 'test_operation'
      memoryManager.trackOperation(operationId)

      const tracking = memoryManager.getOperationTracking(operationId)
      expect(tracking).toBeDefined()
      expect(tracking?.operationId).toBe(operationId)
    })

    it('should stop tracking operation', () => {
      const operationId = 'test_operation'
      memoryManager.trackOperation(operationId)
      memoryManager.stopTracking(operationId)

      const tracking = memoryManager.getOperationTracking(operationId)
      expect(tracking).toBeUndefined()
    })
  })

  describe('memory optimization', () => {
    it('should provide optimization suggestions', () => {
      const suggestions = memoryManager.getOptimizationSuggestions()

      expect(Array.isArray(suggestions)).toBe(true)
    })

    it('should detect memory leaks', () => {
      const hasLeaks = memoryManager.detectMemoryLeaks()

      expect(typeof hasLeaks).toBe('boolean')
    })
  })

  describe('threshold management', () => {
    it('should set memory threshold', () => {
      const threshold = 1024 * 1024 * 1024 // 1GB

      expect(() => {
        memoryManager.setMemoryThreshold(threshold)
      }).not.toThrow()
    })

    it('should check if threshold exceeded', () => {
      const threshold = process.memoryUsage().heapTotal + 1024 * 1024 * 1024 // Current + 1GB

      memoryManager.setMemoryThreshold(threshold)
      const exceeded = memoryManager.isThresholdExceeded()

      expect(exceeded).toBe(false) // Should not be exceeded with high threshold
    })
  })

  describe('memory limits', () => {
    it('should set memory limits', () => {
      const maxHeapSize = 1024 * 1024 * 1024 // 1GB

      expect(() => {
        memoryManager.setMemoryLimits({ maxHeapSize })
      }).not.toThrow()
    })

    it('should check if limit exceeded', () => {
      const maxHeapSize = process.memoryUsage().heapTotal + 1024 * 1024 * 1024 // Current + 1GB

      memoryManager.setMemoryLimits({ maxHeapSize })
      const exceeded = memoryManager.isLimitExceeded()

      expect(exceeded).toBe(false) // Should not be exceeded with high limit
    })
  })

  describe('memory cleanup', () => {
    it('should perform garbage collection if available', () => {
      expect(() => {
        memoryManager.forceGarbageCollection()
      }).not.toThrow()
    })

    it('should clear memory history', () => {
      memoryManager.recordMemoryUsage('test1')
      memoryManager.recordMemoryUsage('test2')

      memoryManager.clearHistory()

      const history = memoryManager.getMemoryHistory()
      expect(history.length).toBe(0)
    })
  })

  describe('performance tracking', () => {
    it('should track memory performance', () => {
      const stats = memoryManager.getPerformanceStats()

      expect(stats).toBeDefined()
      expect(stats.totalOperations).toBeDefined()
      expect(stats.averageMemoryUsage).toBeDefined()
    })
  })
})
