import Logger from 'electron-log'

/**
 * Performance metric structure
 */
interface PerformanceMetric {
  name: string
  type: 'operation' | 'network' | 'file' | 'memory'
  measurements: number[]
  startTime: number
  endTime: number | null
  metadata: any
  count: number
  average: number
  min: number
  max: number
}

/**
 * Performance metrics and monitoring
 */
export class PerformanceMonitor {
  private static instance: PerformanceMonitor
  private metrics: Map<string, PerformanceMetric> = new Map()
  private startTime: number = Date.now()
  private operationStack: string[] = []
  private enabled: boolean = true

  /**
   * Start measuring operation
   */
  startOperation(name: string, metadata?: any): string {
    const operationId = `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`

    this.operationStack.push(operationId)

    const metric: PerformanceMetric = {
      name,
      type: 'operation',
      measurements: [],
      startTime: Date.now(),
      endTime: null,
      metadata,
      count: 0,
    }

    this.metrics.set(operationId, metric)
    Logger.debug(`[PerformanceMonitor] Started operation: ${name}`)

    return operationId
  }

  /**
   * End measuring operation
   */
  endOperation(operationId: string, success: boolean = true): void {
    const metric = this.metrics.get(operationId)
    if (metric) {
      metric.endTime = Date.now()
      const duration = metric.endTime - metric.startTime
      metric.measurements.push(duration)

      // Calculate statistics
      metric.count++
      metric.average = this.calculateAverage(metric.measurements)
      metric.min = Math.min(...metric.measurements)
      metric.max = Math.max(...metric.measurements)

      this.operationStack = this.operationStack.filter(id => id !== operationId)

      Logger.info(`[PerformanceMonitor] Completed operation: ${metric.name}`, {
        duration: `${duration}ms`,
        success,
        average: `${Math.round(metric.average)}ms`,
        min: `${metric.min}ms`,
        max: `${metric.max}ms`,
        count: metric.count,
      })

      if (!success) {
        Logger.warn(`[PerformanceMonitor] Operation failed: ${metric.name}`)
      }
    }
  }

  /**
   * Measure network request
   */
  async measureNetworkRequest<T>(name: string, requestFn: () => Promise<T>): Promise<{ result: T, duration: number }> {
    this.startOperation(name, { type: 'network' })

    try {
      const startTime = Date.now()
      const result = await requestFn()
      const duration = Date.now() - startTime

      this.addNetworkMetric(name, duration, result !== null)

      return { result, duration }
    }
    catch (error) {
      const duration = Date.now() - Date.now()
      this.addNetworkMetric(name, duration, false)
      throw error
    }
  }

  /**
   * Add network metric
   */
  private addNetworkMetric(name: string, duration: number, success: boolean): void {
    const key = `network_${name}`
    const existingMetric = this.metrics.get(key)

    if (existingMetric) {
      existingMetric.measurements.push(duration)
      existingMetric.count++
      existingMetric.average = this.calculateAverage(existingMetric.measurements)
      existingMetric.min = Math.min(...existingMetric.measurements)
      existingMetric.max = Math.max(...existingMetric.measurements)

      Logger.debug(`[PerformanceMonitor] Network metric updated: ${name}`, {
        duration: `${duration}ms`,
        success,
        average: `${Math.round(existingMetric.average)}ms`,
        count: existingMetric.count,
      })
    }
  }

  /**
   * Measure file operation
   */
  async measureFileOperation<T>(name: string, operationFn: () => Promise<T>): Promise<{ result: T, duration: number }> {
    const metric = this.startOperation(name, { type: 'file' })

    try {
      const startTime = Date.now()
      const result = await operationFn()
      const duration = Date.now() - startTime

      metric.measurements.push(duration)
      metric.endTime = Date.now()

      this.addFileMetric(name, duration, result !== null)
      return { result, duration }
    }
    catch (error) {
      const duration = Date.now() - startTime
      metric.measurements.push(duration)
      metric.endTime = Date.now()

      this.addFileMetric(name, duration, false)
      throw error
    }
  }

  /**
   * Add file metric
   */
  private addFileMetric(name: string, duration: number, success: boolean): void {
    const key = `file_${name}`
    const existingMetric = this.metrics.get(key)

    if (existingMetric) {
      existingMetric.measurements.push(duration)
      existingMetric.count++
      existingMetric.average = this.calculateAverage(existingMetric.measurements)
      existingMetric.min = Math.min(...existingMetric.measurements)
      existingMetric.max = Math.max(...existingMetric.measurements)

      Logger.debug(`[PerformanceMonitor] File metric updated: ${name}`, {
        duration: `${duration}ms`,
        success,
        average: `${Math.round(existingMetric.average)}ms`,
        count: existingMetric.count,
      })
    }
  }

  /**
   * Measure memory usage
   */
  measureMemoryUsage(operationId: string): void {
    const metric = this.metrics.get(operationId)
    if (metric) {
      const memoryUsage = process.memoryUsage()
      metric.metadata = {
        rss: memoryUsage.rss,
        heapTotal: memoryUsage.heapTotal,
        heapUsed: memoryUsage.heapUsed,
        external: memoryUsage.external,
      }

      Logger.debug(`[PerformanceMonitor] Memory usage for: ${metric.name}`, metric.metadata)
    }
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    Logger.info(`[PerformanceMonitor] Performance monitoring ${enabled ? 'enabled' : 'disabled'}`)
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetric[] {
    return Array.from(this.metrics.values())
  }

  /**
   * Get metric by name
   */
  getMetric(name: string): PerformanceMetric | undefined {
    return Array.from(this.metrics.values()).find(m => m.name === name)
  }

  /**
   * Get metrics by type
   */
  getMetricsByType(type: PerformanceMetric['type']): PerformanceMetric[] {
    return Array.from(this.metrics.values()).filter(m => m.type === type)
  }

  /**
   * Get slow operations
   */
  getSlowOperations(threshold: number = 1000): PerformanceMetric[] {
    const metrics = Array.from(this.metrics.values())
    return metrics.filter((metric) => {
      const avg = metric.measurements.length > 0
        ? metric.average
        : 0
      return avg >= threshold
    }).sort((a, b) => b.average - a.average)
  }

  /**
   * Get operation success rate
   */
  getSuccessRate(): {
    total: number
    successful: number
    rate: string
  } {
    let total = 0
    let successful = 0

    for (const metric of this.metrics.values()) {
      if (metric.endTime) {
        total++
        if (this.isSuccessOperation(metric)) {
          successful++
        }
      }
    }

    const rate = total > 0 ? Math.round((successful / total) * 100) : 100
    return {
      total,
      successful,
      rate: `${rate}%`,
    }
  }

  /**
   * Check if operation was successful
   */
  private isSuccessOperation(metric: PerformanceMetric): boolean {
    if (metric.endTime) {
      // Check if there were any error logs
      return true // Simplified for now
    }
    return false
  }

  /**
   * Calculate average
   */
  private calculateAverage(measurements: number[]): number {
    if (measurements.length === 0)
      return 0

    const sum = measurements.reduce((acc, val) => acc + val, 0)
    return Math.round(sum / measurements.length)
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    totalOperations: number
    averageOperationTime: number
    slowOperations: PerformanceMetric[]
    successRate: {
      total: number
      successful: number
      rate: string
    }
    topSlowOperations: PerformanceMetric[]
  } {
    const metrics = this.getAllMetrics()
    const completedMetrics = metrics.filter(m => m.endTime !== null)

    const completedMeasurements = completedMetrics.flatMap(m => m.measurements)

    return {
      totalOperations: completedMetrics.length,
      averageOperationTime: this.calculateAverage(completedMeasurements),
      slowOperations: this.getSlowOperations(),
      successRate: this.getSuccessRate(),
      topSlowOperations: this.getSlowOperations(10).slice(0, 5),
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStatistics(): {
    peakMemory: number
    averageMemory: number
    currentMemory: number
  } {
    const memoryMetrics = Array.from(this.metrics.values())
    const memoryData = memoryMetrics
      .map(m => m.metadata)
      .filter(m => m.metadata !== undefined)

    if (memoryData.length === 0) {
      return {
        peakMemory: 0,
        averageMemory: 0,
        currentMemory: 0,
      }
    }

    const memoryUsages = memoryData.map(m => ({
      heapUsed: m.heapUsed,
      rss: m.rss,
    }))

    const peakMemory = Math.max(...memoryUsages.map(m => m.heapUsed))
    const averageMemory = this.calculateAverage(memoryUsages.map(m => m.heapUsed))
    const currentMemory = process.memoryUsage().heapUsed

    return {
      peakMemory,
      averageMemory,
      currentMemory,
    }
  }

  /**
   * Export performance report
   */
  generateReport(): string {
    const summary = this.getPerformanceSummary()
    const memoryStats = this.getMemoryStatistics()

    return {
      timestamp: new Date().toISOString(),
      system: {
        uptime: `${Math.round((Date.now() - this.startTime) / 1000)}s`,
        operationCount: summary.totalOperations,
        averageOperationTime: `${summary.averageOperationTime}ms`,
        successRate: summary.successRate.rate,
      },
      performance: {
        slowOperations: summary.topSlowOperations.map(op => ({
          name: op.name,
          average: `${Math.round(op.average)}ms`,
          count: op.count,
          min: `${op.min}ms`,
          max: `${op.max}ms`,
        })),
      },
      memory: {
        peak: `${(memoryStats.peakMemory / (1024 * 1024)).toFixed(2)}MB`,
        average: `${(memoryStats.averageMemory / (1024 * 1024)).toFixed(2)}MB`,
        current: `${(memoryStats.currentMemory / (1024 * 1024)).toFixed(2)}MB`,
      },
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.metrics.clear()
    this.operationStack = []
    Logger.info('[PerformanceMonitor] All metrics cleared')
  }

  /**
   * Get operation by ID
   */
  getOperationById(operationId: string): PerformanceMetric | undefined {
    return this.metrics.get(operationId)
  }

  /**
   * Get active operations
   */
  getActiveOperations(): string[] {
    return this.operationStack
  }

  /**
   * Get singleton instance
   */
  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor()
    }
    return PerformanceMonitor.instance
  }

  private constructor() {
    // Private constructor for singleton pattern
  }
}

// Export singleton instance
export const performanceMonitor = PerformanceMonitor.getInstance()
