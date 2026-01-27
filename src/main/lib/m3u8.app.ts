import fs from 'node:fs'
import { join } from 'node:path'
import EventEmitter from 'node:events'
import { Parser } from 'm3u8-parser'
import fsExtra from 'fs-extra'
import Logger from 'electron-log'
import type { DialogService } from '../service/dialog.service'
import type { TaskItem } from '../common.types'
import { aria2Service } from '../service/aria2.service'
import { getAppDataDir, timeFormat } from './utils'
import { jsondb } from './jsondb'
import { TaskManager } from './promiseLimit'
import { generateTaskId } from './id-generator'
import { resolveFolderConflict, sanitizeFolderName } from './folder-utils'
import { migrateLegacyTasks } from './migrate-db'

export class M3u8Service extends EventEmitter {
  // static storagePath = getAppDataDir()
  static httpTimeout = {
    socket: 30000,
    request: 30000,
    response: 60000,
  }

  events: ['showPlaylistTaskDialog', 'updateProgress', 'showNotification']
  storagePath: any
  dialogService: DialogService
  m3u8Tasks: Map<string, TaskManager> = new Map()
  aria2Gids: Map<string, string[]> = new Map() // Track aria2 GIDs for each task

  constructor(dialogService: DialogService) {
    super()
    this.dialogService = dialogService
    this.storagePath = getAppDataDir()
    console.log('storagePath', this.storagePath)
  }

  public getTime(): number {
    return new Date().getTime()
  }

  public async migrateTasks() {
    return await migrateLegacyTasks()
  }

  public async getTasks() {
    // jsondb.init()
    const data = await jsondb.getDB() as TaskItem[]
    // console.log('data', data)
    return data
  }

  /**
   * Download og image to target directory
   */
  private async downloadOgImage(ogData: { image: string }, targetPath: string): Promise<void> {
    if (!ogData || !ogData.image)
      return

    try {
      const imageUrl = ogData.image
      const filename = new URL(imageUrl).pathname.split('/').pop() || 'cover.jpg'
      await this.downloadFile(imageUrl, targetPath, filename)
      Logger.info(`[M3u8Service] Downloaded og image: ${filename}`)
    }
    catch (error) {
      Logger.error('[M3u8Service] Failed to download og image:', error)
    }
  }

  /**
   * Download a file using aria2 or fallback to fetch
   */
  private async downloadFile(url: string, targetPath: string, filename: string, headers: { [key: string]: string } = {}): Promise<void> {
    // Try to use aria2 if available
    if (aria2Service?.isRunning()) {
      try {
        const gid = await aria2Service.addDownload({
          url,
          dir: targetPath,
          out: filename,
          headers,
        })

        // Wait for download to complete
        return await this.waitForAria2Download(gid)
      }
      catch (error) {
        Logger.error('[M3u8Service] aria2 download failed, falling back to fetch:', error)
      }
    }

    // Fallback to fetch API
    const response = await fetch(url, {
      headers: headers as Record<string, string>,
    })

    if (!response.ok)
      throw new Error(`HTTP error! status: ${response.status}`)

    const buffer = await response.arrayBuffer()
    const filePath = join(targetPath, filename)
    fs.writeFileSync(filePath, Buffer.from(buffer))
  }

  /**
   * Wait for aria2 download to complete
   */
  private async waitForAria2Download(gid: string, timeout = 300000): Promise<void> {
    const startTime = Date.now()

    while (Date.now() - startTime < timeout) {
      if (!aria2Service?.isRunning())
        throw new Error('aria2 is not running')

      try {
        const status = await aria2Service.tellStatus(gid)

        if (status.status === 'complete')
          return

        if (status.status === 'error')
          throw new Error(`Download failed: ${status.errorMessage}`)

        if (status.status === 'removed')
          throw new Error('Download was removed')

        // Wait 1 second before checking again
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
      catch (error) {
        if (error instanceof Error)
          throw error
        throw new Error('Failed to check download status')
      }
    }

    throw new Error('Download timeout')
  }

  /**
   * Download TS segments using aria2
   */
  private async downloadSegmentsWithAria2(task: TaskItem, segments: any[], baseURL: string, tsDir: string): Promise<void> {
    if (!aria2Service?.isRunning())
      throw new Error('aria2 is not running')

    const segmentCount = segments.length
    let downloadedCount = 0

    // Check existing segments
    const existedSegments = fs.readdirSync(tsDir)
    for (const segment of segments) {
      const segmentUrl = segment.uri.startsWith('http') ? segment.uri : `${baseURL}${segment.uri}`
      const segmentFile = new URL(segmentUrl).pathname.split('/').pop()
      if (existedSegments.includes(segmentFile))
        downloadedCount++
    }

    // Prepare download URLs
    const urlsToDownload: string[] = []
    for (const segment of segments) {
      const segmentUrl = segment.uri.startsWith('http') ? segment.uri : `${baseURL}${segment.uri}`
      const segmentFile = new URL(segmentUrl).pathname.split('/').pop()
      const segmentPath = join(tsDir, segmentFile)

      if (!fs.existsSync(segmentPath))
        urlsToDownload.push(segmentUrl)
    }

    if (urlsToDownload.length === 0) {
      // All segments already downloaded
      await jsondb.update({
        ...task,
        segmentCount,
        downloadedCount: segmentCount,
        progress: `${segmentCount}/${segmentCount}`,
        status: 'downloaded',
      })
      const newTaskArray = await jsondb.getDB()
      this.dialogService.updateProgress(newTaskArray)
      return
    }

    // Add all segments to aria2 as batch downloads
    const gids: string[] = []
    const batchSize = 50 // aria2 can handle multiple URIs in one call

    for (let i = 0; i < urlsToDownload.length; i += batchSize) {
      const batch = urlsToDownload.slice(i, i + batchSize)
      const batchGids = await aria2Service.addDownloads(batch, {
        dir: tsDir,
        headers: task.headers,
      })
      gids.push(...batchGids)
    }

    // Store GIDs for this task (for pause/resume)
    this.aria2Gids.set(task.url, gids)

    // Monitor downloads
    await this.monitorAria2Downloads(task, gids, segmentCount, downloadedCount)
  }

  /**
   * Monitor aria2 downloads and update progress
   */
  private async monitorAria2Downloads(task: TaskItem, gids: string[], segmentCount: number, initialDownloaded: number): Promise<void> {
    let completedCount = initialDownloaded
    let lastUpdateTime = Date.now()

    while (true) {
      // Check status of all downloads
      const statuses = await Promise.allSettled(
        gids.map(gid => aria2Service!.tellStatus(gid)),
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
          else if (status.status === 'complete')
            completedCount++
        }
        else {
          allComplete = false
        }
      }

      // Update progress periodically (every 2 seconds)
      if (Date.now() - lastUpdateTime > 2000) {
        await jsondb.update({
          ...task,
          segmentCount,
          downloadedCount: completedCount,
          progress: `${completedCount}/${segmentCount}`,
          status: allComplete ? 'downloaded' : 'downloading',
        })
        const newTaskArray = await jsondb.getDB()
        this.dialogService.updateProgress(newTaskArray)
        lastUpdateTime = Date.now()
      }

      if (allComplete)
        break

      if (hasError) {
        await jsondb.update({
          ...task,
          segmentCount,
          downloadedCount: completedCount,
          progress: `${completedCount}/${segmentCount}`,
          status: 'failed',
        })
        const newTaskArray = await jsondb.getDB()
        this.dialogService.updateProgress(newTaskArray)
        break
      }

      // Wait before checking again
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  // download m3u8
  public async downloadM3u8(videoItem: TaskItem, targetPath = this.storagePath) {
    const m3u8Url = videoItem.url
    const headers = videoItem.headers
    const sampleFilename = new URL(m3u8Url).pathname.split('/').pop()

    // Generate unique task ID if not provided
    const taskId = videoItem.taskId || generateTaskId()
    const createdAt = videoItem.createdAt || new Date().getTime()

    // Sanitize folder name
    const sanitizedName = videoItem.name
      ? sanitizeFolderName(videoItem.name)
      : taskId

    // Detect and resolve folder conflicts
    const conflictResolution = resolveFolderConflict(targetPath, sanitizedName, taskId)
    const dirName = conflictResolution.resolvedName
    console.log('@@@dirName', dirName, 'resolution:', conflictResolution.resolutionMethod)

    targetPath = join(targetPath, dirName)
    console.log('targetPath', targetPath)
    fs.mkdirSync(targetPath, { recursive: true })

    // Download og image if available
    if (videoItem.og) {
      await this.downloadOgImage(videoItem.og, targetPath)
    }

    // Notify renderer if conflict was resolved
    if (conflictResolution.originalName !== conflictResolution.resolvedName) {
      const message = conflictResolution.resolutionMethod === 'suffix'
        ? `Folder "${conflictResolution.originalName}" already exists. Using "${conflictResolution.resolvedName}" instead.`
        : `Too many conflicts. Using task ID as folder name: "${conflictResolution.resolvedName}"`

      this.dialogService.showNotification('Folder Conflict', message)
    }

    try {
      if (fs.existsSync(join(targetPath, sampleFilename))) {
        console.log('file exists')
        const result = this.analyzeM3u8File(targetPath, sampleFilename)
        if (result.type === 'segments') {
          const duration = result.duration
          const newTask: TaskItem = {
            ...videoItem,
            url: m3u8Url,
            headers,
            status: 'downloaded',
            duration,
            durationStr: timeFormat(duration),
            taskId,
            createdAt,
            directory: targetPath,
          }
          await jsondb.update(newTask)
          try {
            await this.downloadTS(newTask)
          }
          catch (error) {
            Logger.error('downloadTS in file exists', error)
          }
        }
        else {
          // playlist
          this.dialogService.showPlaylistTaskDialog(result.data, videoItem)
        }
      }
      else {
        console.log('start download m3u8')
        try {
          // Use aria2 or fetch to download M3U8 file
          await this.downloadFile(m3u8Url, targetPath, sampleFilename, headers)
        }
        catch (error) {
          Logger.error('download m3u8 error', error)
          return
        }
        console.log('download m3u8 finished')

        const result = await this.analyzeM3u8File(targetPath, sampleFilename)
        // segments or playlists
        if (result.type === 'segments') {
          const duration = result.duration
          const newTask: TaskItem = {
            ...videoItem,
            url: m3u8Url,
            headers,
            status: 'downloaded',
            duration,
            durationStr: timeFormat(duration),
            taskId,
            createdAt,
            directory: targetPath,
            folderConflict: conflictResolution.originalName !== conflictResolution.resolvedName
              ? conflictResolution
              : undefined,
          }
          await jsondb.update(newTask)
          const notification = {
            title: 'Task Info',
            body: `name: ${sampleFilename}\n time durattion ${timeFormat(duration)}s`,
          }
          this.dialogService.showNotification(notification.title, notification.body)
          try {
            await this.downloadTS(newTask)
          }
          catch (error) {
            Logger.error('downloadTS', error)
          }
        }
        else {
          // playlist
          this.dialogService.showPlaylistTaskDialog(result.data, videoItem)
        }
      }
    }
    catch (err) {
      console.log('err', err)
    }
  }

  public async deleteTask(num: number) {
    try {
      const data = await jsondb.getDB()
      const tasks = data.tasks as TaskItem[]
      const task = tasks[num]

      // Remove aria2 downloads if running
      const gids = this.aria2Gids.get(task.url)
      if (gids && aria2Service?.isRunning()) {
        for (const gid of gids) {
          try {
            await aria2Service.remove(gid)
          }
          catch (error) {
            Logger.error('[M3u8Service] Failed to remove aria2 download:', error)
          }
        }
        this.aria2Gids.delete(task.url)
      }

      if (tasks[num].status === 'downloaded')
        fsExtra.removeSync(tasks[num].directory)

      tasks.splice(num, 1)
      jsondb.db.tasks = tasks
      await jsondb.db.write()
    }
    catch (error) {
      console.log('error', error)
    }
  }

  public async refactorTask() {
    const data = await jsondb.getDB()
    const tasks = data.tasks
    tasks.forEach((item) => {
      // TODO: need change the name
      item.directory = join(this.storagePath, item.name.split('.')[0])
    })
    try {
      jsondb.db.tasks = tasks
      await jsondb.db.write()
    }
    catch (error) {
      console.log('error', error)
    }
  }

  async pauseTask(task: TaskItem) {
    await jsondb.update(task)
    const taskM = this.m3u8Tasks.get(task.url)
    if (taskM)
      taskM.pause()

    // Pause aria2 downloads
    const gids = this.aria2Gids.get(task.url)
    if (gids && aria2Service?.isRunning()) {
      for (const gid of gids) {
        try {
          await aria2Service.pause(gid)
        }
        catch (error) {
          Logger.error('[M3u8Service] Failed to pause aria2 download:', error)
        }
      }
    }
    else {
      this.downloadTS(task)
    }
  }

  async resumeTask(task: TaskItem) {
    await jsondb.update(task)
    const taskM = this.m3u8Tasks.get(task.url)
    if (taskM)
      taskM.resume()

    // Resume aria2 downloads
    const gids = this.aria2Gids.get(task.url)
    if (gids && aria2Service?.isRunning()) {
      for (const gid of gids) {
        try {
          await aria2Service.resume(gid)
        }
        catch (error) {
          Logger.error('[M3u8Service] Failed to resume aria2 download:', error)
        }
      }
    }
    else {
      this.downloadTS(task)
    }
  }

  /**
   * analyze the M3U8 file return segments or playlists
   * @param targetPath file directory
   * @param sampleFilename file name
   */
  analyzeM3u8File(targetPath: string, sampleFilename: string) {
    const str = fs.readFileSync(join(targetPath, sampleFilename), 'utf8')
    const parser = new Parser()
    parser.push(str)
    // console.log(parser.manifest)
    const { segments } = parser.manifest
    let streamDuration = 0
    streamDuration = segments.reduce((acc, cur) => {
      return acc + cur.duration
    }, 0)
    console.log('streamDuration: ', streamDuration, timeFormat(streamDuration))
    // console.log(parser)

    // playlist
    if (parser.manifest.playlists && parser.manifest.playlists.length !== 0) {
      console.log(parser.manifest.playlists)
      return { type: 'playlist', data: parser.manifest.playlists, duration: streamDuration }
    }
    return { type: 'segments', data: segments, duration: streamDuration }
  }

  async downloadTS(task: TaskItem) {
    console.log('task', task)
    const urlOjb = new URL(task.url)
    const sampleFilename = urlOjb.pathname.split('/').pop()
    const baseURL = task.url.substring(0, task.url.indexOf(sampleFilename))
    console.log('baseURL', baseURL)
    const tsDir = task.directory
    console.log('tsDir', tsDir)

    const str = fs.readFileSync(join(tsDir, sampleFilename), 'utf8')
    const parser = new Parser()
    parser.push(str)
    // console.log(parser.manifest)
    const { segments } = parser.manifest
    let streamDuration = 0
    streamDuration = segments.reduce((acc, cur) => {
      return acc + cur.duration
    }, 0)
    const segmentCount = segments.length
    console.log('streamDuration: ', streamDuration)

    if (!fs.existsSync(tsDir)) {
      console.log('tsDir', tsDir)
      fs.mkdirSync(tsDir, { recursive: true })
    }

    // download key
    const key = parser.manifest.segments[0].key?.uri
    if (key) {
      const url = key.startsWith('http') ? key : `${baseURL}${key}`
      // Extract filename from key URI (preserves original name like "6c03b187040c48ba.ts")
      const keyFilename = new URL(url).pathname.split('/').pop()
      console.log('key url:', url, 'filename:', keyFilename)
      try {
        await this.downloadFile(url, tsDir, keyFilename, task.headers)
      }
      catch (err) {
        console.error(err)
        Logger.error('[download] error key', url, err)
      }
    }

    if (this.m3u8Tasks.has(task.url)) {
      const taskM = this.m3u8Tasks.get(task.url)
      if (taskM.paused) {
        taskM.resume()
        return
      }
      else {
        return
      }
    }

    // Use aria2 if available, otherwise fall back to old method
    if (aria2Service?.isRunning()) {
      try {
        await this.downloadSegmentsWithAria2(task, segments, baseURL, tsDir)
        return
      }
      catch (error) {
        Logger.error('[M3u8Service] aria2 download failed, falling back to legacy method:', error)
        // Continue to legacy method
      }
    }

    // Legacy fallback method using fetch
    await this.downloadSegmentsLegacy(task, segments, baseURL, tsDir, segmentCount)
  }

  /**
   * Legacy download method using fetch API
   */
  private async downloadSegmentsLegacy(task: TaskItem, segments: any[], baseURL: string, tsDir: string, segmentCount: number): Promise<void> {
    let downloadedCount = 0

    // check if segments existed
    const existedSegments = fs.readdirSync(tsDir)
    console.log('existedSegments', existedSegments.length)

    for (const segment of segments) {
      const segmentUrl = segment.uri.startsWith('http') ? segment.uri : `${baseURL}${segment.uri}`
      const segmentFile = new URL(segmentUrl).pathname.split('/').pop()
      if (existedSegments.includes(segmentFile))
        downloadedCount++
    }

    console.log('needToDownloadCount', segmentCount - downloadedCount)
    await jsondb.update({
      ...task,
      segmentCount,
      downloadedCount,
      progress: `${downloadedCount}/${segmentCount}`,
      status: downloadedCount === segmentCount ? 'downloaded' : 'downloading',
    })
    const newTaskArray = await jsondb.getDB()
    this.dialogService.updateProgress(newTaskArray)

    const promiseList = segments.map((segment) => {
      return () => new Promise((resolve) => {
        (async () => {
          try {
            const segmentUrl = segment.uri.startsWith('http') ? segment.uri : `${baseURL}${segment.uri}`
            const segmentFile = new URL(segmentUrl).pathname.split('/').pop()
            const segmentPath = join(tsDir, segmentFile)

            if (fs.existsSync(segmentPath)) {
              resolve({ state: 'existed', url: segmentUrl })
            }
            else {
              await this.downloadFile(segmentUrl, tsDir, segmentFile, task.headers)
              downloadedCount++
              const status = downloadedCount === segmentCount ? 'downloaded' : 'downloading'
              await jsondb.update({
                ...task,
                segmentCount,
                downloadedCount,
                progress: `${downloadedCount}/${segmentCount}`,
                status,
              })
              const newTaskArray = await jsondb.getDB()
              this.dialogService.updateProgress(newTaskArray)
              resolve({ state: 'ok', url: segmentUrl })
            }
          }
          catch (error) {
            console.error(error)
            const segmentUrl = segment.uri.startsWith('http') ? segment.uri : `${baseURL}${segment.uri}`
            Logger.error('[download] error segment', segmentUrl, error)
            resolve({ state: 'error', url: segmentUrl })
          }
        })()
      })
    })

    const taskM = new TaskManager(promiseList)
    this.m3u8Tasks.set(task.url, taskM)

    taskM.run(5).then(async () => {
      const results = taskM.res
      const errorCount = results.map((item, index) => item.state === 'error' ? index : null).filter(item => item !== null)
      const okCount = results.map((item, index) => item.state === 'ok' ? index : null).filter(item => item !== null)
      console.log('task ok', okCount.length)
      console.log('task error', errorCount.length)
      const newTaskArrays = await jsondb.getDB()
      const newTask = newTaskArrays.tasks.find(item => item.taskId === task.taskId)
      if (taskM.paused && taskM.res.length !== taskM.tasks.length) {
        await jsondb.update({
          ...newTask,
          status: 'paused',
        })
        const newTaskArray = await jsondb.getDB()
        this.dialogService.updateProgress(newTaskArray)
      }
      if (errorCount.length > 0) {
        await jsondb.update({
          ...newTask,
          status: 'failed',
        })
        const newTaskArray = await jsondb.getDB()
        this.dialogService.updateProgress(newTaskArray)
      }
    }).catch((error) => {
      console.error(error)
      Logger.error('[download] error', error)
    })
  }
}
