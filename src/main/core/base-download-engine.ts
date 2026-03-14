import EventEmitter from 'node:events'
import type { DownloadResult, DownloadStatus, SegmentInfo, TaskItem } from '../../shared/types'
import type { DownloadEngineOptions, IDownloadEngine } from './download-engine.interface'

/**
 * Base download engine with common functionality
 */
export abstract class BaseDownloadEngine extends EventEmitter implements IDownloadEngine {
  protected concurrency: number
  protected retryCount: number
  protected timeout: number
  protected activeDownloads: Map<string, any> = new Map()

  constructor(options: DownloadEngineOptions = {}) {
    super()
    this.concurrency = options.concurrency || 5
    this.retryCount = options.retryCount || 3
    this.timeout = options.timeout || 30000
  }

  /**
   * Abstract download method that must be implemented by subclasses
   */
  abstract download(task: TaskItem): Promise<DownloadResult>

  /**
   * Abstract pause method
   */
  abstract pause(taskId: string): Promise<void>

  /**
   * Abstract resume method
   */
  abstract resume(taskId: string): Promise<void>

  /**
   * Abstract getStatus method
   */
  abstract getStatus(taskId: string): Promise<DownloadStatus>

  /**
   * Abstract cancel method
   */
  abstract cancel(taskId: string): Promise<void>

  /**
   * Abstract isAvailable method
   */
  abstract isAvailable(): Promise<boolean>

  /**
   * Abstract getName method
   */
  abstract getName(): string

  /**
   * Extract segments from M3U8 content
   */
  protected extractSegments(content: string): SegmentInfo[] {
    const lines = content.split('\n')
    const segments: SegmentInfo[] = []
    let currentDuration = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim()

      if (line.startsWith('#EXTINF:')) {
        const durationMatch = line.match(/#EXTINF:([\d.]+)/)
        if (durationMatch) {
          currentDuration = Number.parseFloat(durationMatch[1])
        }
      }
      else if (line && !line.startsWith('#')) {
        segments.push({
          uri: line,
          duration: currentDuration,
        })
        currentDuration = 0
      }
    }

    return segments
  }

  /**
   * Calculate download progress
   */
  protected calculateProgress(downloaded: number, total: number): number {
    if (total === 0)
      return 0
    return Math.round((downloaded / total) * 100)
  }

  /**
   * Format download speed
   */
  protected formatSpeed(bytesPerSecond: number): string {
    const units = ['B/s', 'KB/s', 'MB/s', 'GB/s']
    let speed = bytesPerSecond
    let unitIndex = 0

    while (speed >= 1024 && unitIndex < units.length - 1) {
      speed /= 1024
      unitIndex++
    }

    return `${speed.toFixed(2)} ${units[unitIndex]}`
  }

  /**
   * Format file size
   */
  protected formatSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB']
    let size = bytes
    let unitIndex = 0

    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024
      unitIndex++
    }

    return `${size.toFixed(2)} ${units[unitIndex]}`
  }

  /**
   * Emit progress event
   */
  protected emitProgress(taskId: string, progress: DownloadStatus): void {
    this.emit('progress', taskId, progress)
  }

  /**
   * Emit complete event
   */
  protected emitComplete(taskId: string, result: DownloadResult): void {
    this.emit('complete', taskId, result)
  }

  /**
   * Emit error event
   */
  protected emitError(taskId: string, error: Error): void {
    this.emit('error', taskId, error)
  }
}
