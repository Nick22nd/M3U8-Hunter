import { beforeEach, describe, expect, it } from 'vitest'
import { PerformanceMonitor } from '../../src/main/core/performance-monitor'

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor

  beforeEach(() => {
    performanceMonitor = PerformanceMonitor.getInstance()
    performanceMonitor.clearMetrics()
  })

  describe('operation tracking', () => {
    it('should start and end operations', () => {
      const operationId = performanceMonitor.startOperation('test_operation', {
        metadata: 'test',
      })

      expect(operationId).toBeDefined()

      performanceMonitor.endOperation(operationId, true)

      const metric = performanceMonitor.getOperationById(operationId)
      expect(metric).toBeDefined()
      expect(metric?.name).toBe('test_operation')
      expect(metric?.endTime).not.toBeNull()
    })

    it('should track operation duration', () => {
      const operationId = performanceMonitor.startOperation('test_operation')

      // Simulate some work
      setTimeout(() => {
        performanceMonitor.endOperation(operationId, true)

        const metric = performanceMonitor.getOperationById(operationId)
        expect(metric?.endTime).not.toBeNull()
        expect(metric?.measurements.length).toBeGreaterThan(0)
      }, 100)
    })
  })

  describe('network request measurement', () => {
    it('should measure network request duration', async () => {
      const mockRequest = async () => {
        return { data: 'test_response' }
      }

      const result = await performanceMonitor.measureNetworkRequest('test_request', mockRequest)

      expect(result.result).toEqual({ data: 'test_response' })
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('should handle network request errors', async () => {
      const mockRequest = async () => {
        throw new Error('Network error')
      }

      await expect(performanceMonitor.measureNetworkRequest('test_request', mockRequest)).rejects.toThrow()
    })
  })

  describe('file operation measurement', () => {
    it('should measure file operation duration', async () => {
      const mockOperation = async () => {
        return { file: 'test_file.txt' }
      }

      const result = await performanceMonitor.measureFileOperation('test_operation', mockOperation)

      expect(result.result).toEqual({ file: 'test_file.txt' })
      expect(result.duration).toBeGreaterThanOrEqual(0)
    })

    it('should handle file operation errors', async () => {
      const mockOperation = async () => {
        throw new Error('File error')
      }

      await expect(performanceMonitor.measureFileOperation('test_operation', mockOperation)).rejects.toThrow()
    })
  })

  describe('metrics retrieval', () => {
    it('should get all metrics', () => {
      performanceMonitor.startOperation('operation1')
      performanceMonitor.startOperation('operation2')

      const metrics = performanceMonitor.getAllMetrics()

      expect(metrics.length).toBeGreaterThanOrEqual(2)
    })

    it('should get metric by name', () => {
      performanceMonitor.startOperation('test_operation')
      performanceMonitor.startOperation('another_operation')

      const metric = performanceMonitor.getMetric('test_operation')

      expect(metric).toBeDefined()
      expect(metric?.name).toBe('test_operation')
    })

    it('should get metrics by type', () => {
      performanceMonitor.startOperation('operation1', { type: 'operation' })
      performanceMonitor.startOperation('network1', { type: 'network' })
      performanceMonitor.startOperation('file1', { type: 'file' })

      const operationMetrics = performanceMonitor.getMetricsByType('operation')

      expect(operationMetrics.length).toBeGreaterThan(0)
      expect(operationMetrics[0].type).toBe('operation')
    })
  })

  describe('slow operations', () => {
    it('should identify slow operations', async () => {
      const operationId = performanceMonitor.startOperation('slow_operation')

      // Simulate slow operation
      await new Promise(resolve => setTimeout(resolve, 100))

      performanceMonitor.endOperation(operationId, true)

      const slowOperations = performanceMonitor.getSlowOperations(50) // threshold 50ms

      expect(slowOperations.length).toBeGreaterThan(0)
    })
  })

  describe('success rate', () => {
    it('should calculate operation success rate', () => {
      const op1 = performanceMonitor.startOperation('operation1')
      performanceMonitor.endOperation(op1, true)

      const op2 = performanceMonitor.startOperation('operation2')
      performanceMonitor.endOperation(op2, true)

      const op3 = performanceMonitor.startOperation('operation3')
      performanceMonitor.endOperation(op3, false)

      const successRate = performanceMonitor.getSuccessRate()

      expect(successRate.total).toBeGreaterThanOrEqual(3)
      expect(successRate.successful).toBeGreaterThanOrEqual(2)
      expect(successRate.rate).toBe('67%') // 2/3 ≈ 67%
    })
  })

  describe('performance summary', () => {
    it('should generate performance summary', () => {
      const op1 = performanceMonitor.startOperation('operation1')
      performanceMonitor.endOperation(op1, true)

      const op2 = performanceMonitor.startOperation('operation2')
      performanceMonitor.endOperation(op2, true)

      const summary = performanceMonitor.getPerformanceSummary()

      expect(summary).toBeDefined()
      expect(summary.totalOperations).toBeGreaterThanOrEqual(2)
      expect(summary.successRate).toBeDefined()
    })
  })

  describe('memory statistics', () => {
    it('should track memory statistics', () => {
      const operationId = performanceMonitor.startOperation('test_operation')
      performanceMonitor.measureMemoryUsage(operationId)

      const memoryStats = performanceMonitor.getMemoryStatistics()

      expect(memoryStats).toBeDefined()
      expect(memoryStats.currentMemory).toBeGreaterThan(0)
    })
  })

  describe('active operations', () => {
    it('should track active operations', () => {
      const op1 = performanceMonitor.startOperation('operation1')
      const op2 = performanceMonitor.startOperation('operation2')

      const activeOperations = performanceMonitor.getActiveOperations()

      expect(activeOperations.length).toBeGreaterThanOrEqual(2)
    })
  })

  describe('report generation', () => {
    it('should generate performance report', () => {
      const op1 = performanceMonitor.startOperation('operation1')
      performanceMonitor.endOperation(op1, true)

      const report = performanceMonitor.generateReport()

      expect(report).toBeDefined()
      expect(report.timestamp).toBeDefined()
      expect(report.system).toBeDefined()
      expect(report.performance).toBeDefined()
      expect(report.memory).toBeDefined()
    })
  })

  describe('metrics clearing', () => {
    it('should clear all metrics', () => {
      performanceMonitor.startOperation('operation1')
      performanceMonitor.startOperation('operation2')

      expect(performanceMonitor.getAllMetrics().length).toBeGreaterThanOrEqual(2)

      performanceMonitor.clearMetrics()

      expect(performanceMonitor.getAllMetrics().length).toBe(0)
      expect(performanceMonitor.getActiveOperations().length).toBe(0)
    })
  })

  describe('enable/disable monitoring', () => {
    it('should enable and disable monitoring', () => {
      expect(() => {
        performanceMonitor.setEnabled(false)
        performanceMonitor.setEnabled(true)
      }).not.toThrow()
    })
  })

  describe('performance tracking', () => {
    it('should track average operation time', () => {
      const op1 = performanceMonitor.startOperation('operation1')
      performanceMonitor.endOperation(op1, true)

      const op2 = performanceMonitor.startOperation('operation2')
      performanceMonitor.endOperation(op2, true)

      const summary = performanceMonitor.getPerformanceSummary()

      expect(summary.averageOperationTime).toBeGreaterThan(0)
    })
  })
})
