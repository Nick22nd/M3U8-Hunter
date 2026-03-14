import type { DownloadResult, DownloadStatus, SegmentInfo, TaskItem } from '../../shared/types'

/**
 * Download engine interface
 */
export interface IDownloadEngine {
  /**
   * Download task
   */
  download: (task: TaskItem) => Promise<DownloadResult>

  /**
   * Pause task download
   */
  pause: (taskId: string) => Promise<void>

  /**
   * Resume task download
   */
  resume: (taskId: string) => Promise<void>

  /**
   * Get task download status
   */
  getStatus: (taskId: string) => Promise<DownloadStatus>

  /**
   * Cancel task download
   */
  cancel: (taskId: string) => Promise<void>

  /**
   * Check if engine is available
   */
  isAvailable: () => Promise<boolean>

  /**
   * Get engine name
   */
  getName: () => string
}

/**
 * Download progress callback interface
 */
export interface IDownloadProgress {
  onProgress: (taskId: string, progress: DownloadStatus) => void
  onComplete: (taskId: string, result: DownloadResult) => void
  onError: (taskId: string, error: Error) => void
}

/**
 * Download engine options
 */
export interface DownloadEngineOptions {
  concurrency?: number
  retryCount?: number
  timeout?: number
  progressCallback?: IDownloadProgress
}
