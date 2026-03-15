import Logger from 'electron-log'

/**
 * Memory usage tracker and optimizer
 */
export class MemoryManager {
  private static instance: MemoryManager
  private memorySnapshots: Map<string, any> = new Map()
  private maxSnapshotAge = 60000 // 1 minute
  private memoryThreshold = 100 * 1024 * 1024 // 100 MB
  private cleanupInterval: NodeJS.Timeout | null = null

  private constructor() {
    this.setupMemoryMonitoring()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): MemoryManager {
    if (!MemoryManager.instance) {
      MemoryManager.instance = new MemoryManager()
    }
    return MemoryManager.instance
  }

  /**
   * Get current memory usage
   */
  getMemoryUsage(): {
    rss: number
    heapTotal: number
    heapUsed: number
    external: number
  } {
    const usage = process.memoryUsage()
    return {
      rss: usage.rss,
      heapTotal: usage.heapTotal,
      heapUsed: usage.heapUsed,
      external: usage.external,
    }
  }

  /**
   * Get memory usage in human readable format
   */
  getFormattedMemoryUsage(): string {
    const usage = this.getMemoryUsage()
    const formatSize = (bytes: number) => {
      const units = ['B', 'KB', 'MB', 'GB', 'TB']
      let size = bytes
      let unitIndex = 0

      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024
        unitIndex++
      }

      return `${size.toFixed(2)} ${units[unitIndex]}`
    }

    return {
      rss: formatSize(usage.rss),
      heapTotal: formatSize(usage.heapTotal),
      heapUsed: formatSize(usage.heapUsed),
      external: formatSize(usage.external),
    }
  }

  /**
   * Take memory snapshot
   */
  takeSnapshot(key: string, data: any): void {
    this.memorySnapshots.set(key, {
      timestamp: Date.now(),
      memory: this.getMemoryUsage(),
      data,
    })

    // Cleanup old snapshots
    this.cleanupOldSnapshots()
  }

  /**
   * Restore from snapshot
   */
  restoreFromSnapshot(key: string): void {
    const snapshot = this.memorySnapshots.get(key)
    if (snapshot) {
      Logger.info(`[MemoryManager] Restoring from snapshot: ${key}`)
      // In a real implementation, this would free memory
    }
  }

  /**
   * Check if memory is high
   */
  isMemoryHigh(): boolean {
    const usage = this.getMemoryUsage()
    return usage.heapUsed > this.memoryThreshold
  }

  /**
   * Get memory pressure level (0-100)
   */
  getMemoryPressure(): number {
    const usage = this.getMemoryUsage()
    const heapUsage = usage.heapUsed / usage.heapTotal

    if (heapUsage < 0.5) {
      return 20 // Low memory pressure
    }
    else if (heapUsage < 0.7) {
      return 50 // Medium memory pressure
    }
    else if (heapUsage < 0.9) {
      return 80 // High memory pressure
    }
    else {
      return 100 // Critical memory pressure
    }
  }

  /**
   * Trigger garbage collection
   */
  triggerGC(): void {
    if (global.gc && typeof global.gc === 'function') {
      Logger.debug('[MemoryManager] Triggering garbage collection')
      global.gc()
    }
  }

  /**
   * Setup memory monitoring
   */
  private setupMemoryMonitoring(): void {
    this.cleanupInterval = setInterval(() => {
      this.checkMemoryUsage()
    }, 30000) // Every 30 seconds

    Logger.info('[MemoryManager] Memory monitoring started', {
      interval: '30s',
      threshold: `${this.memoryThreshold / (1024 * 1024)} MB`,
    })
  }

  /**
   * Stop memory monitoring
   */
  stopMemoryMonitoring(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval)
      this.cleanupInterval = null
      Logger.info('[MemoryManager] Memory monitoring stopped')
    }
  }

  /**
   * Check memory usage and take action if needed
   */
  private checkMemoryUsage(): void {
    const usage = this.getFormattedMemoryUsage()
    const pressure = this.getMemoryPressure()

    Logger.debug(`[MemoryManager] Memory usage:`, usage)

    if (pressure >= 80) {
      Logger.warn(`[MemoryManager] High memory pressure detected: ${pressure}%`)
      this.triggerGC()
      this.takeSnapshot('high-pressure', { pressure, usage })
    }
  }

  /**
   * Cleanup old snapshots
   */
  private cleanupOldSnapshots(): void {
    const now = Date.now()
    const keysToDelete: string[] = []

    for (const [key, snapshot] of this.memorySnapshots) {
      if (now - snapshot.timestamp > this.maxSnapshotAge) {
        keysToDelete.push(key)
      }
    }

    for (const key of keysToDelete) {
      this.memorySnapshots.delete(key)
    }

    if (keysToDelete.length > 0) {
      Logger.info(`[MemoryManager] Cleaned up ${keysToDelete.length} old snapshots`)
    }
  }

  /**
   * Get memory statistics
   */
  getMemoryStatistics(): {
    snapshotCount: number
    highPressureCount: number
    gcTriggerCount: number
    averageMemoryUsage: {
      rss: number
      heapUsed: number
    }
  } {
    let highPressureCount = 0
    let gcTriggerCount = 0
    let totalRss = 0
    let totalHeapUsed = 0
    let count = 0

    for (const [key, snapshot] of this.memorySnapshots) {
      if (snapshot.pressure >= 80) {
        highPressureCount++
      }

      totalRss += snapshot.memory.rss
      totalHeapUsed += snapshot.memory.heapUsed
      count++
    }

    const avgRss = count > 0 ? Math.round(totalRss / count) : 0
    const avgHeapUsed = count > 0 ? Math.round(totalHeapUsed / count) : 0

    return {
      snapshotCount: this.memorySnapshots.size,
      highPressureCount,
      gcTriggerCount,
      averageMemoryUsage: {
        rss: this.formatSize(avgRss),
        heapUsed: this.formatSize(avgHeapUsed),
      },
    }
  }

  /**
   * Optimize memory usage
   */
  optimizeMemory(): void {
    Logger.info('[MemoryManager] Starting memory optimization')

    // Trigger GC to free memory
    this.triggerGC()

    // Wait a bit and check again
    setTimeout(() => {
      const afterGC = this.getMemoryUsage()
      const pressureAfterGC = this.getMemoryPressure()

      Logger.info('[MemoryManager] Memory after GC:', {
        pressure: pressureAfterGC,
        usage: this.getFormattedMemoryUsage(),
      })

      if (pressureAfterGC >= 80) {
        // High pressure after GC - this indicates a memory leak
        Logger.warn('[MemoryManager] Potential memory leak detected')
        this.takeSnapshot('potential-leak', {
          before: this.getFormattedMemoryUsage(),
          after: this.getFormattedMemoryUsage(),
        })
      }
    }, 2000) // Wait 2 seconds
  }

  /**
   * Get recommendations for memory optimization
   */
  getOptimizationRecommendations(): string[] {
    const recommendations: string[] = []
    const pressure = this.getMemoryPressure()
    const usage = this.getFormattedMemoryUsage()

    if (pressure >= 80) {
      recommendations.push('Consider implementing object pooling for frequently used objects')
      recommendations.push('Review for circular references in code')
      recommendations.push('Consider implementing streaming for large data processing')
      recommendations.push('Increase garbage collection frequency if using node-gc')
    }

    if (usage.heapUsed > '50MB') {
      recommendations.push('Large heap usage detected, consider optimizing data structures')
      recommendations.push('Consider implementing lazy loading for large datasets')
    }

    if (pressure >= 60) {
      recommendations.push('High memory pressure - consider increasing download concurrency')
      recommendations.push('Review and optimize in-memory caching strategies')
    }

    return recommendations
  }
}

// Export singleton instance
export const memoryManager = MemoryManager.getInstance()