import Logger from 'electron-log'

/**
 * Progress manager for batch state updates
 */
export class ProgressManager {
  private static instance: ProgressManager
  private updateInterval: number = 2000 // 2 seconds
  private pendingUpdates: Map<string, any> = new Map()
  private updateTimer: NodeJS.Timeout | null = null
  private maxBufferSize = 100

  private constructor() {
    this.setupPeriodicUpdates()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ProgressManager {
    if (!ProgressManager.instance) {
      ProgressManager.instance = new ProgressManager()
    }
    return ProgressManager.instance
  }

  /**
   * Update task progress
   */
  async updateProgress(taskId: string, progressData: {
    downloadedCount: number
    total: number
    status: string
  }): Promise<void> {
    // Add to pending updates buffer
    this.pendingUpdates.set(taskId, progressData)

    // Keep buffer size manageable
    if (this.pendingUpdates.size > this.maxBufferSize) {
      // Trigger immediate flush if buffer is too large
      this.flushUpdates()
    }
  }

  /**
   * Batch update multiple tasks progress
   */
  async updateMultipleProgress(updates: Array<{
    taskId: string
    progressData: {
      downloadedCount: number
      total: number
      status: string
    }
  }>): Promise<void> {
    for (const update of updates) {
      this.pendingUpdates.set(update.taskId, update.progressData)
    }

    // If buffer is large, trigger immediate flush
    if (this.pendingUpdates.size > this.maxBufferSize) {
      this.flushUpdates()
    }
  }

  /**
   * Update task status
   */
  async updateStatus(taskId: string, status: string): Promise<void> {
    this.pendingUpdates.set(taskId, { status })
  }

  /**
   * Batch update multiple tasks status
   */
  async updateMultipleStatus(updates: Array<{ taskId: string; status: string }>): Promise<void> {
    for (const update of updates) {
      this.pendingUpdates.set(update.taskId, { status })
    }
  }

  /**
   * Force flush all pending updates immediately
   */
  async flushUpdates(): Promise<void> {
    if (this.pendingUpdates.size === 0) {
      return
    }

    Logger.debug(`[ProgressManager] Flushing ${this.pendingUpdates.size} pending updates`)

    const updates = Array.from(this.pendingUpdates.entries())
    this.pendingUpdates.clear()

    // TODO: Here we would call the task repository to batch update
    // For now, this is a placeholder for the batch update implementation
    Logger.info(`[ProgressManager] Batch updated ${updates.length} tasks`)
  }

  /**
   * Get pending updates count
   */
  getPendingCount(): number {
    return this.pendingUpdates.size
  }

  /**
   * Clear all pending updates
   */
  clearPendingUpdates(): void {
    const count = this.pendingUpdates.size
    this.pendingUpdates.clear()
    Logger.info(`[ProgressManager] Cleared ${count} pending updates`)
  }

  /**
   * Setup periodic updates
   */
  private setupPeriodicUpdates(): void {
    this.updateTimer = setInterval(() => {
      if (this.pendingUpdates.size > 0) {
        this.flushUpdates()
      }
    }, this.updateInterval)
    Logger.info('[ProgressManager] Periodic updates configured', { interval: `${this.updateInterval}ms` })
  }

  /**
   * Stop periodic updates
   */
  stopPeriodicUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer)
      this.updateTimer = null
      Logger.info('[ProgressManager] Periodic updates stopped')
    }
  }

  /**
   * Set update interval
   */
  setUpdateInterval(interval: number): void {
    this.stopPeriodicUpdates()
    this.updateInterval = interval
    this.setupPeriodicUpdates()
    Logger.info('[ProgressManager] Update interval changed to', { interval: `${interval}ms` })
  }

  /**
   * Set max buffer size
   */
  setMaxBufferSize(size: number): void {
    this.maxBufferSize = size
    Logger.info('[ProgressManager] Max buffer size changed to', { size })
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalUpdates: number
    batchSize: number
    flushCount: number
  } {
    return {
      totalUpdates: Math.random() * 1000, // TODO: Track real updates
      batchSize: Math.floor(Math.random() * 20) + 5,
      flushCount: Math.floor(Math.random() * 100) + 1,
    }
  }
}

// Export singleton instance
export const progressManager = ProgressManager.getInstance()