import { BrowserWindow, ipcMain } from 'electron'
import Logger from 'electron-log'
import type { IPCChannelMapping, IPCMessage, IPCResponse } from '../../shared/types'
import { configRepository, taskRepository } from '../repositories'

import type { DialogService } from '../service/dialog.service'
import type { M3u8Service } from './m3u8-service'

/**
 * Type-safe IPC handler
 */
export class IPCHandler {
  private handlers: Map<keyof IPCChannelMapping, (data: any) => Promise<any>> = new Map()
  private m3u8Service: M3u8Service | null = null

  constructor(private dialogService: DialogService) {
    this.registerDefaultHandlers()
    this.setupIPCHandler()
  }

  /**
   * Set M3U8 service instance
   */
  setM3u8Service(service: M3u8Service): void {
    this.m3u8Service = service
    this.registerTaskHandlers()
  }

  /**
   * Register default handlers
   */
  private registerDefaultHandlers(): void {
    // Task handlers
    this.handlers.set('tasks:get-all', async () => {
      return await taskRepository.findAll()
    })

    this.handlers.set('tasks:delete', async (taskId: string) => {
      return await taskRepository.delete(taskId)
    })

    this.handlers.set('tasks:pause', async (taskId: string) => {
      if (this.m3u8Service) {
        await this.m3u8Service.pauseTask(taskId)
      }
      return { success: true }
    })

    this.handlers.set('tasks:resume', async (taskId: string) => {
      if (this.m3u8Service) {
        await this.m3u8Service.resumeTask(taskId)
      }
      return { success: true }
    })

    this.handlers.set('tasks:restart', async (taskId: string) => {
      if (this.m3u8Service) {
        const task = await this.m3u8Service.getTask(taskId)
        if (task) {
          await this.m3u8Service.startDownload(task)
        }
      }
      return { success: true }
    })

    // M3U8 handlers
    this.handlers.set('m3u8:download', async (taskData: any) => {
      if (!this.m3u8Service) {
        throw new Error('M3U8 service not initialized')
      }
      return await this.m3u8Service.createTask(taskData)
    })

    this.handlers.set('m3u8:parse', async (content: string) => {
      const { m3u8Parser } = await import('./m3u8-parser.service')
      return await m3u8Parser.parse(content)
    })

    // Server handlers
    this.handlers.set('server:get-config', async () => {
      return configRepository.getServerConfig()
    })

    this.handlers.set('server:set-config', async (config: any) => {
      configRepository.setServerConfig(config)
      return { success: true }
    })

    // Aria2 handlers
    this.handlers.set('aria2:get-config', async () => {
      return configRepository.getAria2Config()
    })

    this.handlers.set('aria2:set-config', async (config: any) => {
      configRepository.setAria2Config(config)
      return { success: true }
    })

    // System handlers
    this.handlers.set('system:open-dir', async (dir: string) => {
      const { shell } = await import('electron')
      shell.openPath(dir)
      return { success: true }
    })

    this.handlers.set('system:open-url', async (url: string) => {
      const { shell } = await import('electron')
      shell.openExternal(url)
      return { success: true }
    })

    this.handlers.set('system:get-app-dir', async () => {
      const { getAppDataDir } = await import('../lib/utils')
      return getAppDataDir()
    })

    this.handlers.set('system:set-app-dir', async (dir: string) => {
      configRepository.setAppDataDir(dir)
      return { success: true }
    })
  }

  /**
   * Register task handlers that depend on M3U8 service
   */
  private registerTaskHandlers(): void {
    // Additional handlers that require M3U8 service
    this.handlers.set('tasks:update', async (taskData: any) => {
      if (this.m3u8Service) {
        await this.m3u8Service.updateTask(taskData.taskId, taskData)
      }
      return { success: true }
    })

    this.handlers.set('tasks:get', async (taskId: string) => {
      if (this.m3u8Service) {
        return await this.m3u8Service.getTask(taskId)
      }
      return null
    })
  }

  /**
   * Setup IPC handler
   */
  private setupIPCHandler(): void {
    ipcMain.handle('ipc-message', async (event, message: IPCMessage) => {
      const startTime = Date.now()

      try {
        Logger.info(`[IPCHandler] Received message: ${message.channel}`)

        const handler = this.handlers.get(message.channel as keyof IPCChannelMapping)
        if (!handler) {
          throw new Error(`No handler registered for channel: ${message.channel}`)
        }

        const result = await handler(message.payload)

        const response: IPCResponse = {
          success: true,
          data: result,
          timestamp: Date.now(),
        }

        Logger.debug(`[IPCHandler] Request completed in ${Date.now() - startTime}ms`)
        return response
      }
      catch (error) {
        Logger.error(`[IPCHandler] Request failed for channel ${message.channel}:`, error)

        const response: IPCResponse = {
          success: false,
          error: {
            code: error instanceof Error ? error.name : 'UNKNOWN_ERROR',
            message: error instanceof Error ? error.message : 'Unknown error occurred',
            details: error,
          },
          timestamp: Date.now(),
        }

        return response
      }
    })
  }

  /**
   * Register a custom handler
   */
  registerHandler<K extends keyof IPCChannelMapping>(
    channel: K,
    handler: (data: IPCChannelMapping[K]) => Promise<any>,
  ): void {
    this.handlers.set(channel, handler)
    Logger.info(`[IPCHandler] Registered custom handler for channel: ${channel}`)
  }

  /**
   * Unregister a handler
   */
  unregisterHandler(channel: keyof IPCChannelMapping): void {
    this.handlers.delete(channel)
    Logger.info(`[IPCHandler] Unregistered handler for channel: ${channel}`)
  }

  /**
   * Send message to renderer
   */
  static sendToRenderer(channel: string, data: any): void {
    const windows = BrowserWindow.getAllWindows()
    for (const win of windows) {
      if (!win.isDestroyed()) {
        win.webContents.send('reply-msg', { type: 'ipc-response', channel, data })
      }
    }
  }

  /**
   * Cleanup handlers
   */
  cleanup(): void {
    this.handlers.clear()
    Logger.info('[IPCHandler] All handlers cleaned up')
  }
}

/**
 * Create IPC handler instance
 */
export function createIPCHandler(dialogService: DialogService): IPCHandler {
  return new IPCHandler(dialogService)
}
