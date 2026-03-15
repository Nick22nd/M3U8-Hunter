import { join } from 'node:path'
import fs from 'node:fs'
import Logger from 'electron-log'
import type { DownloadResult, DownloadStatus, TaskItem } from '../../shared/types'
import { TaskManager } from '../lib/promiseLimit'
import { BaseDownloadEngine } from './base-download-engine'
import { performanceMonitor } from './performance-monitor'
import { progressManager } from './progress-manager'
import { cacheManager } from './cache-manager'
import { memoryManager } from './memory-manager'

/**
 * Legacy download engine implementation using fetch API
 */
export class LegacyEngine extends BaseDownloadEngine {
  private activeTasks: Map<string, TaskManager> = new Map()

  constructor(options?: any) {
    super(options)
  }

  /**
   * Get engine name
   */
  getName(): string {
    return 'Legacy (Fetch)'
  }

  /**
   * Check if Legacy engine is available (always true)
   */
  async isAvailable(): Promise<boolean> {
    return true
  }

  /**
   * Download task using fetch API
   */
  async download(task: TaskItem): Promise<DownloadResult> {
    const taskId = task.taskId
    Logger.info(`[LegacyEngine] Starting download for task: ${taskId}`)

    // Start performance monitoring
    const operationId = performanceMonitor.startOperation(`legacy_download_${taskId}`, {
      taskId,
      url: task.url,
      engine: 'Legacy',
    })

    try {
      // Monitor memory usage
      memoryManager.trackOperation(`legacy_download_${taskId}`)

      // Parse M3U8 file to get segments (with caching)
      const cacheKey = `segments_${taskId}`
      let segments = cacheManager.get(cacheKey)

      if (!segments) {
        segments = await this.parseSegments(task)
        cacheManager.set(cacheKey, segments, { ttl: 3600000 }) // Cache for 1 hour
      }

      const segmentCount = segments.length

      // Check existing segments
      let downloadedCount = await this.checkExistingSegments(task, segments)

      // Ensure downloadedCount doesn't exceed segmentCount
      downloadedCount = Math.min(downloadedCount, segmentCount)

      Logger.info(`[LegacyEngine] Task ${taskId}: ${downloadedCount}/${segmentCount} segments already downloaded`)

      // Prepare download tasks
      const downloadTasks = await this.prepareDownloadTasks(task, segments)

      if (downloadTasks.length === 0) {
        Logger.info(`[LegacyEngine] All segments already downloaded for task: ${taskId}`)
        performanceMonitor.endOperation(operationId)
        memoryManager.stopTracking(`legacy_download_${taskId}`)
        return {
          success: true,
          downloaded: segmentCount,
          total: segmentCount,
        }
      }

      // Create and run task manager
      const taskManager = new TaskManager(downloadTasks)
      this.activeTasks.set(taskId, taskManager)

      // Start monitoring progress with progress manager
      this.monitorProgress(task, taskManager, segmentCount, downloadedCount)

      // Run downloads with concurrency limit
      await taskManager.run(this.concurrency)

      const results = taskManager.res
      const successCount = results.filter(r => r.state === 'ok' || r.state === 'existed').length
      const errorCount = results.filter(r => r.state === 'error').length

      Logger.info(`[LegacyEngine] Task ${taskId} completed: ${successCount} success, ${errorCount} errors`)

      performanceMonitor.endOperation(operationId, true)
      memoryManager.stopTracking(`legacy_download_${taskId}`)

      return {
        success: errorCount === 0,
        downloaded: successCount + downloadedCount,
        total: segmentCount,
      }
    }
    catch (error) {
      Logger.error(`[LegacyEngine] Download failed for task: ${taskId}`, error)
      performanceMonitor.endOperation(operationId, false)
      memoryManager.stopTracking(`legacy_download_${taskId}`)
      this.emitError(taskId, error as Error)
      throw error
    }
    finally {
      this.activeTasks.delete(taskId)
    }
  }

  /**
   * Pause download
   */
  async pause(taskId: string): Promise<void> {
    const taskManager = this.activeTasks.get(taskId)
    if (taskManager) {
      taskManager.pause()
      Logger.info(`[LegacyEngine] Paused download for task: ${taskId}`)
    }
  }

  /**
   * Resume download
   */
  async resume(taskId: string): Promise<void> {
    const taskManager = this.activeTasks.get(taskId)
    if (taskManager) {
      taskManager.resume()
      Logger.info(`[LegacyEngine] Resumed download for task: ${taskId}`)
    }
  }

  /**
   * Get download status
   */
  async getStatus(taskId: string): Promise<DownloadStatus> {
    const taskManager = this.activeTasks.get(taskId)
    if (!taskManager)
      throw new Error('Task not found or not active')

    const total = taskManager.tasks.length
    const completed = taskManager.res.length
    const active = taskManager.active

    return {
      status: active > 0 ? 'downloading' : 'completed',
      progress: this.calculateProgress(completed, total),
      speed: 0, // Legacy engine doesn't track speed
      downloaded: completed,
      total,
    }
  }

  /**
   * Cancel download
   */
  async cancel(taskId: string): Promise<void> {
    const taskManager = this.activeTasks.get(taskId)
    if (taskManager) {
      this.activeTasks.delete(taskId)
      Logger.info(`[LegacyEngine] Cancelled download for task: ${taskId}`)
    }
  }

  /**
   * Parse M3U8 segments
   */
  private async parseSegments(task: TaskItem): Promise<any[]> {
    const { Parser } = await import('m3u8-parser')
    const m3u8Path = join(task.directory!, task.url.split('/').pop()!)
    const content = fs.readFileSync(m3u8Path, 'utf8')

    const parser = new Parser()
    parser.push(content)

    return parser.manifest.segments || []
  }

  /**
   * Check existing segments
   */
  private async checkExistingSegments(task: TaskItem, segments: any[]): Promise<number> {
    const tsDir = task.directory!
    const existedSegments = fs.readdirSync(tsDir)
    let downloadedCount = 0

    const baseURL = task.url.substring(0, task.url.lastIndexOf('/') + 1)
    const processedSegments = new Set<string>()

    for (const segment of segments) {
      const segmentUrl = segment.uri.startsWith('http') ? segment.uri : `${baseURL}${segment.uri}`
      const segmentFile = new URL(segmentUrl).pathname.split('/').pop()

      if (existedSegments.includes(segmentFile) && !processedSegments.has(segmentFile)) {
        downloadedCount++
        processedSegments.add(segmentFile)
      }
    }

    return downloadedCount
  }

  /**
   * Prepare download tasks
   */
  private async prepareDownloadTasks(task: TaskItem, segments: any[]): Promise<(() => Promise<any>)[]> {
    const tsDir = task.directory!
    const baseURL = task.url.substring(0, task.url.lastIndexOf('/') + 1)

    const tasks: (() => Promise<any>)[] = []

    for (const segment of segments) {
      const segmentUrl = segment.uri.startsWith('http') ? segment.uri : `${baseURL}${segment.uri}`
      const segmentFile = new URL(segmentUrl).pathname.split('/').pop()
      const segmentPath = join(tsDir, segmentFile)

      // Skip if segment already exists
      if (fs.existsSync(segmentPath))
        continue

      tasks.push(() => new Promise((resolve) => {
        (async () => {
          try {
            await this.downloadSegment(segmentUrl, segmentPath, task.headers)
            resolve({ state: 'ok', url: segmentUrl })
          }
          catch (error) {
            Logger.error(`[LegacyEngine] Failed to download segment: ${segmentUrl}`, error)
            resolve({ state: 'error', url: segmentUrl, error })
          }
        })()
      }))
    }

    return tasks
  }

  /**
   * Download a single segment
   */
  private async downloadSegment(url: string, path: string, headers: Record<string, string>): Promise<void> {
    const response = await fetch(url, {
      headers: headers as Record<string, string>,
    })

    if (!response.ok)
      throw new Error(`HTTP error! status: ${response.status}`)

    const buffer = await response.arrayBuffer()
    fs.writeFileSync(path, Buffer.from(buffer))
  }

  /**
   * Monitor download progress
   */
  private monitorProgress(
    task: TaskItem,
    taskManager: TaskManager,
    segmentCount: number,
    initialDownloaded: number,
  ): void {
    const taskId = task.taskId

    // Register task with progress manager
    progressManager.registerTask(taskId, {
      total: segmentCount,
      downloaded: initialDownloaded,
      status: 'downloading',
      metadata: {
        engine: 'Legacy',
        concurrency: this.concurrency,
      },
    })

    const interval = setInterval(() => {
      try {
        const completedCount = initialDownloaded + taskManager.res.length
        const total = segmentCount

        // Update progress through progress manager (batch updates)
        progressManager.updateProgress(taskId, {
          downloaded: completedCount,
          status: taskManager.paused ? 'paused' : 'downloading',
        })

        // Clear interval when task is complete
        if (completedCount >= total || taskManager.paused) {
          clearInterval(interval)
          progressManager.unregisterTask(taskId)

          if (completedCount >= total) {
            const result: DownloadResult = {
              success: true,
              downloaded: total,
              total,
            }
            this.emitComplete(taskId, result)
          }
        }
      }
      catch (error) {
        Logger.error(`[LegacyEngine] Progress monitoring error for task ${taskId}:`, error)
        clearInterval(interval)
        progressManager.unregisterTask(taskId)
      }
    }, 1000)
  }
}

// Export singleton instance
export const legacyEngine = new LegacyEngine()
