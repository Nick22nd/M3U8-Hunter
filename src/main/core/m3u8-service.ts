import { join } from 'node:path'
import Logger from 'electron-log'
import type { TaskCreationOptions, TaskItem, TaskStatus } from '../../shared/types'
import { taskRepository } from '../repositories'
import type { DialogService } from '../service/dialog.service'
import { getAppDataDir, timeFormat } from '../lib/utils'
import { generateTaskId } from '../lib/id-generator'
import { resolveFolderConflict, sanitizeFolderName } from '../lib/folder-utils'

import { fileService } from './file.service'
import { m3u8Parser } from './m3u8-parser.service'
import { DownloadEngineFactory } from './download-engine-factory'

/**
 * M3U8 Service - Refactored version with separated concerns
 */
export class M3u8Service {
  private dialogService: DialogService
  private storagePath: string
  private activeDownloads: Map<string, any> = new Map()

  constructor(dialogService: DialogService) {
    this.dialogService = dialogService
    this.storagePath = getAppDataDir()
    Logger.info('[M3u8Service] Initialized with storage path:', this.storagePath)
  }

  /**
   * Create and start a new M3U8 download task
   */
  async createTask(options: TaskCreationOptions): Promise<TaskItem> {
    Logger.info(`[M3u8Service] Creating/Restarting task for: ${options.url}`)

    try {
      // Generate unique task ID or use existing one
      const taskId = options.taskId || generateTaskId()
      const createdAt = options.createdAt || new Date().getTime()

      // Check if task exists (for re-download)
      const existingTask = options.taskId ? await taskRepository.findById(options.taskId) : null

      // Create task item
      const task: TaskItem = existingTask
        ? {
            ...existingTask,
            url: options.url,
            headers: options.headers || existingTask.headers,
            status: 'waiting',
          }
        : {
            url: options.url,
            headers: options.headers || {},
            type: 'm3u8',
            status: 'waiting',
            taskId,
            createdAt,
            name: options.name,
            from: options.from,
            og: options.og,
          }

      let targetPath: string
      let conflictResolution: any = null

      // Reuse existing directory if it exists
      if (existingTask && existingTask.directory && fileService.directoryExists(existingTask.directory)) {
        targetPath = existingTask.directory
        Logger.info(`[M3u8Service] Reusing existing directory for task: ${targetPath}`)
      }
      else {
        // Resolve folder conflicts and create directory
        const dirName = sanitizeFolderName(options.name || taskId)
        conflictResolution = resolveFolderConflict(this.storagePath, dirName, taskId)
        targetPath = join(this.storagePath, conflictResolution.resolvedName)

        await fileService.createDirectory(targetPath)
      }

      // Download M3U8 file
      const m3u8FileName = options.url.split('/').pop()?.split('?')[0] || 'playlist.m3u8'
      const m3u8Path = join(targetPath, m3u8FileName)

      await fileService.downloadFile(options.url, m3u8Path, options.headers)

      // Parse M3U8 file
      const parsedResult = await m3u8Parser.parseFile(m3u8Path)

      if (parsedResult.type === 'playlist') {
        // Handle playlist - return to renderer for user selection
        Logger.info('[M3u8Service] Playlist detected, returning to renderer for selection')
        this.dialogService.showPlaylistTaskDialog(parsedResult.data.playlists || [], task)
        return task
      }

      // Update task with parsed information
      task.status = 'downloaded'
      task.duration = parsedResult.duration
      task.durationStr = m3u8Parser.formatDuration(parsedResult.duration)
      task.directory = targetPath
      task.segmentCount = m3u8Parser.getSegmentCount(parsedResult.data)

      if (conflictResolution && conflictResolution.originalName !== conflictResolution.resolvedName) {
        task.folderConflict = conflictResolution

        const message = conflictResolution.resolutionMethod === 'suffix'
          ? `Folder "${conflictResolution.originalName}" already exists. Using "${conflictResolution.resolvedName}" instead.`
          : `Too many conflicts. Using task ID as folder name: "${conflictResolution.resolvedName}"`

        this.dialogService.showNotification('Folder Conflict', message)
      }

      // Download OG image if available
      if (options.og?.image) {
        await this.downloadOGImage(options.og, targetPath)
      }

      // Save task to database
      await taskRepository.save(task)

      // Start download
      await this.startDownload(task)

      Logger.info(`[M3u8Service] Task created successfully: ${taskId}`)
      return task
    }
    catch (error) {
      Logger.error('[M3u8Service] Failed to create task:', error)
      throw error
    }
  }

  /**
   * Start download for a task
   */
  async startDownload(task: TaskItem): Promise<void> {
    if (this.activeDownloads.has(task.taskId)) {
      Logger.warn(`[M3u8Service] Task ${task.taskId} is already downloading`)
      return
    }

    Logger.info(`[M3u8Service] Starting download for task: ${task.taskId}`)

    try {
      // Get best available download engine
      const engine = await DownloadEngineFactory.getBestEngine()
      Logger.info(`[M3u8Service] Using download engine: ${engine.getName()}`)

      // Update task status to downloading
      await taskRepository.updateStatus(task.taskId, 'downloading')

      // Setup progress monitoring
      engine.on('progress', async (taskId: string, progress: any) => {
        await taskRepository.update(taskId, {
          downloadedCount: progress.downloaded,
          progress: `${progress.downloaded}/${progress.total}`,
        })
        this.notifyProgressUpdate()
      })

      engine.on('complete', async (taskId: string, result: any) => {
        await taskRepository.updateStatus(taskId, 'downloaded')
        this.activeDownloads.delete(taskId)
        this.notifyProgressUpdate()
        Logger.info(`[M3u8Service] Task ${taskId} completed successfully`)
      })

      engine.on('error', async (taskId: string, error: Error) => {
        await taskRepository.updateStatus(taskId, 'failed')
        this.activeDownloads.delete(taskId)
        this.notifyProgressUpdate()
        Logger.error(`[M3u8Service] Task ${taskId} failed:`, error)
        this.dialogService.showNotification('Download Error', `Task failed: ${error.message}`)
      })

      // Start download
      this.activeDownloads.set(task.taskId, engine)
      await engine.download(task)
    }
    catch (error) {
      Logger.error(`[M3u8Service] Failed to start download for task ${task.taskId}:`, error)
      await taskRepository.updateStatus(task.taskId, 'failed')
      this.activeDownloads.delete(task.taskId)
      this.notifyProgressUpdate()
      throw error
    }
  }

  /**
   * Pause task download
   */
  async pauseTask(taskId: string): Promise<void> {
    const engine = this.activeDownloads.get(taskId)
    if (engine) {
      await engine.pause(taskId)
      await taskRepository.updateStatus(taskId, 'paused')
      this.notifyProgressUpdate()
      Logger.info(`[M3u8Service] Task ${taskId} paused`)
    }
  }

  /**
   * Resume task download
   */
  async resumeTask(taskId: string): Promise<void> {
    const engine = this.activeDownloads.get(taskId)
    if (engine) {
      await engine.resume(taskId)
      await taskRepository.updateStatus(taskId, 'downloading')
      this.notifyProgressUpdate()
      Logger.info(`[M3u8Service] Task ${taskId} resumed`)
    }
  }

  /**
   * Cancel task download
   */
  async cancelTask(taskId: string): Promise<void> {
    const engine = this.activeDownloads.get(taskId)
    if (engine) {
      await engine.cancel(taskId)
      await taskRepository.updateStatus(taskId, 'failed')
      this.activeDownloads.delete(taskId)
      this.notifyProgressUpdate()
      Logger.info(`[M3u8Service] Task ${taskId} cancelled`)
    }
  }

  /**
   * Delete task
   */
  async deleteTask(taskId: string): Promise<void> {
    Logger.info(`[M3u8Service] Deleting task: ${taskId}`)

    try {
      // Cancel download if active
      await this.cancelTask(taskId)

      // Get task from database
      const task = await taskRepository.findById(taskId)
      if (task?.directory) {
        // Delete task directory
        await fileService.deleteDirectory(task.directory)
      }

      // Remove from database
      await taskRepository.delete(taskId)

      this.notifyProgressUpdate()
      Logger.info(`[M3u8Service] Task ${taskId} deleted successfully`)
    }
    catch (error) {
      Logger.error(`[M3u8Service] Failed to delete task ${taskId}:`, error)
      throw error
    }
  }

  /**
   * Get all tasks
   */
  async getAllTasks(): Promise<TaskItem[]> {
    return await taskRepository.findAll()
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<TaskItem | null> {
    return await taskRepository.findById(taskId)
  }

  /**
   * Update task
   */
  async updateTask(taskId: string, updates: Partial<TaskItem>): Promise<void> {
    await taskRepository.update(taskId, updates)
    this.notifyProgressUpdate()
  }

  /**
   * Get task status
   */
  async getTaskStatus(taskId: string): Promise<TaskStatus | null> {
    const task = await taskRepository.findById(taskId)
    return task?.status || null
  }

  /**
   * Download OG image
   */
  private async downloadOGImage(ogData: any, targetPath: string): Promise<void> {
    if (!ogData?.image)
      return

    try {
      const imageUrl = ogData.image
      const filename = new URL(imageUrl).pathname.split('/').pop() || 'cover.jpg'
      await fileService.downloadFile(imageUrl, join(targetPath, filename))
      Logger.info(`[M3u8Service] Downloaded OG image: ${filename}`)
    }
    catch (error) {
      Logger.error('[M3u8Service] Failed to download OG image:', error)
      // Don't throw error, OG image is optional
    }
  }

  /**
   * Notify renderer of progress update
   */
  private async notifyProgressUpdate(): Promise<void> {
    try {
      const tasks = await this.getAllTasks()
      this.dialogService.updateProgress(tasks)
    }
    catch (error) {
      Logger.error('[M3u8Service] Failed to notify progress update:', error)
    }
  }

  /**
   * Cleanup active downloads
   */
  async cleanup(): Promise<void> {
    Logger.info('[M3u8Service] Cleaning up active downloads')

    for (const [taskId, engine] of this.activeDownloads) {
      try {
        await engine.cancel(taskId)
      }
      catch (error) {
        Logger.error(`[M3u8Service] Failed to cancel task ${taskId} during cleanup:`, error)
      }
    }

    this.activeDownloads.clear()
    Logger.info('[M3u8Service] Cleanup completed')
  }
}
