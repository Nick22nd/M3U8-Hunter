/**
 * Type-safe IPC client for renderer process
 */
import type { IPCChannelMapping, IPCRequestData, IPCResponse } from './types/ipc.types'

export class IPCClient {
  private static instance: IPCClient

  /**
   * Get singleton instance
   */
  static getInstance(): IPCClient {
    if (!IPCClient.instance) {
      IPCClient.instance = new IPCClient()
    }
    return IPCClient.instance
  }

  /**
   * Send message to main process
   */
  async send<K extends keyof IPCChannelMapping>(
    channel: K,
    data: IPCRequestData<K>,
  ): Promise<IPCChannelMapping[K]> {
    try {
      const response: IPCResponse = await window.electron.ipcRenderer.invoke('ipc-message', {
        type: 'request',
        channel,
        payload: data,
        timestamp: Date.now(),
      })

      if (!response.success) {
        throw new Error(response.error?.message || 'IPC request failed')
      }

      return response.data as IPCChannelMapping[K]
    }
    catch (error) {
      console.error(`[IPCClient] Request failed for channel ${channel}:`, error)
      throw error
    }
  }

  /**
   * Listen for messages from main process
   */
  on(channel: string, callback: (data: any) => void): () => void {
    const listener = (_event: any, data: any) => {
      callback(data)
    }

    window.electron.ipcRenderer.on('reply-msg', listener)

    // Return unsubscribe function
    return () => {
      window.electron.ipcRenderer.removeListener('reply-msg', listener)
    }
  }

  /**
   * Convenience methods for common operations
   */

  // Task operations
  async getAllTasks() {
    return this.send('tasks:get-all', undefined)
  }

  async deleteTask(taskId: string) {
    return this.send('tasks:delete', taskId)
  }

  async pauseTask(taskId: string) {
    return this.send('tasks:pause', taskId)
  }

  async resumeTask(taskId: string) {
    return this.send('tasks:resume', taskId)
  }

  async restartTask(taskId: string) {
    return this.send('tasks:restart', taskId)
  }

  // M3U8 operations
  async downloadM3U8(taskData: any) {
    return this.send('m3u8:download', taskData)
  }

  async parseM3U8(content: string) {
    return this.send('m3u8:parse', content)
  }

  // Server operations
  async getServerConfig() {
    return this.send('server:get-config', undefined)
  }

  async setServerConfig(config: any) {
    return this.send('server:set-config', config)
  }

  // Aria2 operations
  async getAria2Config() {
    return this.send('aria2:get-config', undefined)
  }

  async setAria2Config(config: any) {
    return this.send('aria2:set-config', config)
  }

  // System operations
  async openDir(dir: string) {
    return this.send('system:open-dir', dir)
  }

  async openUrl(url: string) {
    return this.send('system:open-url', url)
  }

  async getAppDir() {
    return this.send('system:get-app-dir', undefined)
  }

  async setAppDir(dir: string) {
    return this.send('system:set-app-dir', dir)
  }
}

// Export singleton instance
export const ipcClient = IPCClient.getInstance()
