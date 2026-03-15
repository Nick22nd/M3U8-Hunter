import { join } from 'node:path'
import fs from 'node:fs'
import Logger from 'electron-log'
import type { DownloadResult, DownloadStatus, TaskItem } from '../../shared/types'
import { type DownloadStatus as Aria2DownloadStatus, aria2Service } from '../service/aria2.service'
import { Aria2Service } from '../service/aria2.service'
import { BaseDownloadEngine } from './base-download-engine'
import { performanceMonitor } from './performance-monitor'
import { progressManager } from './progress-manager'
import { cacheManager } from './cache-manager'
import { memoryManager } from './memory-manager'

/**
 * Aria2 download engine implementation
 */
export class Aria2Engine extends BaseDownloadEngine {
  private taskGids: Map<string, string[]> = new Map()
  private monitoringTasks: Map<string, any> = new Map()

  constructor(options?: any) {
    super(options)
    this.setupAria2EventListeners()
  }

  /**
   * Get engine name
   */
  getName(): string {
    return 'Aria2'
  }

  /**
   * Check if Aria2 is available
   */
  async isAvailable(): Promise<boolean> {
    if (!aria2Service)
      return false

    return aria2Service.isRunning()
  }

  /**
   * Download task using Aria2
   */
  async download(task: TaskItem): Promise<DownloadResult> {
    if (!await this.isAvailable()) {
      throw new Error('Aria2 is not running')
    }

    const taskId = task.taskId
    Logger.info(`[Aria2Engine] Starting download for task: ${taskId}`)

    // Start performance monitoring
    const operationId = performanceMonitor.startOperation(`aria2_download_${taskId}`, {
      taskId,
      url: task.url,
      engine: 'Aria2',
    })

    try {
      // Monitor memory usage
      memoryManager.trackOperation(`aria2_download_${taskId}`)

      // Parse M3U8 file to get segments (with caching)
      const cacheKey = `segments_${taskId}`
      let segments = cacheManager.get(cacheKey)

      if (!segments) {
        segments = await this.parseSegments(task)
        cacheManager.set(cacheKey, segments, { ttl: 3600000 }) // Cache for 1 hour
      }

      const segmentCount = segments.length

      // Check existing segments
      const downloadedCount = await this.checkExistingSegments(task, segments)

      // Prepare download URLs
      const urlsToDownload = await this.prepareDownloads(task, segments)

      if (urlsToDownload.length === 0) {
        Logger.info(`[Aria2Engine] All segments already downloaded for task: ${taskId}`)
        performanceMonitor.endOperation(operationId)
        memoryManager.stopTracking(`aria2_download_${taskId}`)
        return {
          success: true,
          downloaded: segmentCount,
          total: segmentCount,
        }
      }

      // Add downloads to Aria2 in batches
      const gids = await this.addBatchDownloads(task, urlsToDownload)
      this.taskGids.set(taskId, gids)

      // Start monitoring downloads with progress manager
      await this.monitorDownloads(task, gids, segmentCount, downloadedCount)

      performanceMonitor.endOperation(operationId, true)
      memoryManager.stopTracking(`aria2_download_${taskId}`)

      return {
        success: true,
        downloaded: segmentCount,
        total: segmentCount,
      }
    }
    catch (error) {
      Logger.error(`[Aria2Engine] Download failed for task: ${taskId}`, error)
      performanceMonitor.endOperation(operationId, false)
      memoryManager.stopTracking(`aria2_download_${taskId}`)
      this.emitError(taskId, error as Error)
      throw error
    }
  }

  /**
   * Pause download
   */
  async pause(taskId: string): Promise<void> {
    const gids = this.taskGids.get(taskId)
    if (!gids || !aria2Service)
      return

    Logger.info(`[Aria2Engine] Pausing download for task: ${taskId}`)
    await Promise.all(gids.map(gid => aria2Service.pause(gid)))
  }

  /**
   * Resume download
   */
  async resume(taskId: string): Promise<void> {
    const gids = this.taskGids.get(taskId)
    if (!gids || !aria2Service)
      return

    Logger.info(`[Aria2Engine] Resuming download for task: ${taskId}`)
    await Promise.all(gids.map(gid => aria2Service.resume(gid)))
  }

  /**
   * Get download status
   */
  async getStatus(taskId: string): Promise<DownloadStatus> {
    const gids = this.taskGids.get(taskId)
    if (!gids || !aria2Service)
      throw new Error('Task not found or Aria2 not running')

    const statuses = await Promise.allSettled(
      gids.map(gid => aria2Service.tellStatus(gid)),
    )

    let totalDownloaded = 0
    let totalSize = 0
    let activeCount = 0
    let completedCount = 0
    let errorCount = 0

    for (const result of statuses) {
      if (result.status === 'fulfilled') {
        const status = result.value
        totalSize += Number.parseInt(status.totalLength) || 0
        totalDownloaded += Number.parseInt(status.completedLength) || 0

        if (status.status === 'active' || status.status === 'waiting')
          activeCount++
        else if (status.status === 'complete')
          completedCount++
        else if (status.status === 'error')
          errorCount++
      }
    }

    const overallStatus = errorCount > 0
      ? 'failed'
      : activeCount === 0 && completedCount === gids.length
        ? 'completed'
        : 'downloading'

    return {
      status: overallStatus as any,
      progress: this.calculateProgress(totalDownloaded, totalSize),
      speed: Number.parseInt(statuses[0]?.value?.downloadSpeed || '0'),
      downloaded: totalDownloaded,
      total: totalSize,
    }
  }

  /**
   * Cancel download
   */
  async cancel(taskId: string): Promise<void> {
    const gids = this.taskGids.get(taskId)
    if (!gids || !aria2Service)
      return

    Logger.info(`[Aria2Engine] Cancelling download for task: ${taskId}`)
    await Promise.all(gids.map(gid => aria2Service.remove(gid)))
    this.taskGids.delete(taskId)
    this.monitoringTasks.delete(taskId)
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

    return Math.min(downloadedCount, segments.length)
  }

  /**
   * Prepare download URLs
   */
  private async prepareDownloads(task: TaskItem, segments: any[]): Promise<string[]> {
    const tsDir = task.directory!
    const urlsToDownload: string[] = []

    const baseURL = task.url.substring(0, task.url.lastIndexOf('/') + 1)

    for (const segment of segments) {
      const segmentUrl = segment.uri.startsWith('http') ? segment.uri : `${baseURL}${segment.uri}`
      const segmentFile = new URL(segmentUrl).pathname.split('/').pop()
      const segmentPath = join(tsDir, segmentFile)

      if (!fs.existsSync(segmentPath))
        urlsToDownload.push(segmentUrl)
    }

    return urlsToDownload
  }

  /**
   * Add batch downloads to Aria2
   */
  private async addBatchDownloads(task: TaskItem, urls: string[]): Promise<string[]> {
    if (!aria2Service)
      throw new Error('Aria2 service not available')

    const batchSize = 50
    const gids: string[] = []

    for (let i = 0; i < urls.length; i += batchSize) {
      const batch = urls.slice(i, i + batchSize)
      const batchGids = await aria2Service.addDownloads(batch, {
        dir: task.directory!,
        headers: task.headers,
      })
      gids.push(...batchGids)
    }

    return gids
  }

  /**
   * Monitor downloads progress
   */
  private async monitorDownloads(
    task: TaskItem,
    gids: string[],
    segmentCount: number,
    initialDownloaded: number,
  ): Promise<void> {
    const completedGids = new Set<string>()
    const taskId = task.taskId

    // Register task with progress manager
    progressManager.registerTask(taskId, {
      total: segmentCount,
      downloaded: initialDownloaded,
      status: 'downloading',
      metadata: {
        engine: 'Aria2',
        gids: gids.length,
      },
    })

    while (true) {
      if (!aria2Service)
        break

      const statuses = await Promise.allSettled(
        gids.map(gid => aria2Service.tellStatus(gid)),
      )

      let allComplete = true
      let hasError = false

      for (const result of statuses) {
        if (result.status === 'fulfilled') {
          const status = result.value
          if (status.status === 'active' || status.status === 'waiting')
            allComplete = false
          else if (status.status === 'error')
            hasError = true
          else if (status.status === 'complete' && !completedGids.has(status.gid))
            completedGids.add(status.gid)
        }
        else {
          allComplete = false
        }
      }

      const completedCount = Math.min(initialDownloaded + completedGids.size, segmentCount)

      // Update progress through progress manager (batch updates)
      progressManager.updateProgress(taskId, {
        downloaded: completedCount,
        status: hasError ? 'failed' : (allComplete ? 'completed' : 'downloading'),
      })

      if (allComplete || hasError)
        break

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }

    // Unregister task from progress manager
    progressManager.unregisterTask(taskId)
  }

  /**
   * Setup Aria2 event listeners
   */
  private setupAria2EventListeners(): void {
    this.on('progress', (taskId: string, progress: DownloadStatus) => {
      Logger.debug(`[Aria2Engine] Progress update for task ${taskId}:`, progress)
    })

    this.on('complete', (taskId: string, result: DownloadResult) => {
      Logger.info(`[Aria2Engine] Download complete for task ${taskId}:`, result)
    })

    this.on('error', (taskId: string, error: Error) => {
      Logger.error(`[Aria2Engine] Download error for task ${taskId}:`, error)
    })
  }
}

// Export singleton instance
export const aria2Engine = new Aria2Engine()
