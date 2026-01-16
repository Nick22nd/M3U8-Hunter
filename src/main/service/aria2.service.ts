import { spawn } from 'node:child_process'
import { join } from 'node:path'
import fs from 'node:fs'
import os from 'node:os'
import log from 'electron-log/main'
import Store from 'electron-store'

log.initialize()

const store = new Store()

export interface Aria2Config {
  host: string
  port: number
  secret: string
  concurrent: number
  enabled: boolean
}

export interface DownloadOptions {
  url: string
  dir: string
  out?: string
  headers?: { [key: string]: string }
  referer?: string
}

export interface DownloadStatus {
  gid: string
  status: 'active' | 'waiting' | 'paused' | 'error' | 'complete' | 'removed'
  totalLength: string
  completedLength: string
  downloadSpeed: string
  errorCode?: string
  errorMessage?: string
  files: Array<{
    path: string
    selected: 'true' | 'false'
    uri: string
  }>
}

export class Aria2Service extends EventTarget {
  private aria2Process: ReturnType<typeof spawn> | null = null
  private rpcHost: string
  private rpcPort: number
  private rpcSecret: string
  private concurrent: number
  private enabled: boolean
  private rpcRequestId = 0
  private readonly configPath: string

  constructor() {
    super()
    const config = this.getConfig()
    this.rpcHost = config.host
    this.rpcPort = config.port
    this.rpcSecret = config.secret
    this.concurrent = config.concurrent
    this.enabled = config.enabled

    // Create a directory for aria2 session
    const appDataDir = store.get(`config.appDir.${process.platform}`) as string || join(os.homedir(), 'M3U8Hunter')
    this.configPath = join(appDataDir, 'aria2')

    if (!fs.existsSync(this.configPath))
      fs.mkdirSync(this.configPath, { recursive: true })
  }

  private getConfig(): Aria2Config {
    return {
      host: store.get('aria2.host', '127.0.0.1') as string,
      port: store.get('aria2.port', 6800) as number,
      secret: store.get('aria2.secret', '') as string,
      concurrent: store.get('aria2.concurrent', 5) as number,
      enabled: store.get('aria2.enabled', true) as boolean,
    }
  }

  public updateConfig(config: Partial<Aria2Config>): void {
    if (config.host !== undefined)
      store.set('aria2.host', config.host)
    if (config.port !== undefined)
      store.set('aria2.port', config.port)
    if (config.secret !== undefined)
      store.set('aria2.secret', config.secret)
    if (config.concurrent !== undefined)
      store.set('aria2.concurrent', config.concurrent)
    if (config.enabled !== undefined)
      store.set('aria2.enabled', config.enabled)

    const newConfig = this.getConfig()
    this.rpcHost = newConfig.host
    this.rpcPort = newConfig.port
    this.rpcSecret = newConfig.secret
    this.concurrent = newConfig.concurrent
    this.enabled = newConfig.enabled
  }

  public getConfigValue(): Aria2Config {
    return this.getConfig()
  }

  /**
   * Start aria2 as a child process
   */
  public async start(): Promise<boolean> {
    if (!this.enabled) {
      log.info('[Aria2Service] aria2 is disabled in settings')
      return false
    }

    if (this.aria2Process) {
      log.info('[Aria2Service] aria2 is already running')
      return true
    }

    // Check if aria2 is available in PATH
    const isAria2Available = await this.checkAria2Available()
    if (!isAria2Available) {
      log.error('[Aria2Service] aria2 not found in PATH')
      this.dispatchEvent(new Event('error'))
      return false
    }

    const sessionFile = join(this.configPath, 'aria2.session')
    const logFile = join(this.configPath, 'aria2.log')

    const args = [
      '--enable-rpc',
      `--rpc-listen-port=${this.rpcPort}`,
      `--rpc-listen-all=true`, // Allow connections from any host
      '--rpc-allow-origin-all',
      `--rpc-secret=${this.rpcSecret}`,
      `--dir=${this.configPath}`,
      '--check-certificate=false',
      `--log=${logFile}`,
      `--save-session=${sessionFile}`,
      `--input-file=${sessionFile}`,
      `--max-concurrent-downloads=${this.concurrent}`,
      '--continue',
      '--always-resume=true',
      '--max-tries=5',
      '--retry-wait=5',
      '--timeout=60',
      '--connect-timeout=30',
      '--auto-save-interval=10',
    ]

    try {
      this.aria2Process = spawn('aria2c', args)

      this.aria2Process.stdout?.on('data', (data) => {
        log.info(`[Aria2Service] ${data.toString()}`)
      })

      this.aria2Process.stderr?.on('data', (data) => {
        log.error(`[Aria2Service] ${data.toString()}`)
      })

      this.aria2Process.on('close', (code) => {
        log.info(`[Aria2Service] aria2 process exited with code ${code}`)
        this.aria2Process = null
      })

      this.aria2Process.on('error', (error) => {
        log.error('[Aria2Service] Failed to start aria2:', error)
        this.aria2Process = null
      })

      // Wait a moment for aria2 to start
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Verify aria2 is responding
      const version = await this.call('aria2.getVersion', [])
      if (version) {
        log.info('[Aria2Service] aria2 started successfully:', version)
        this.dispatchEvent(new Event('ready'))
        return true
      }

      return false
    }
    catch (error) {
      log.error('[Aria2Service] Failed to start aria2:', error)
      this.aria2Process = null
      return false
    }
  }

  /**
   * Stop the aria2 process
   */
  public async stop(): Promise<void> {
    if (this.aria2Process) {
      // Save session before closing
      await this.call('aria2.saveSession', [])
      await this.call('aria2.shutdown', [])

      // Kill the process after a short delay
      setTimeout(() => {
        if (this.aria2Process) {
          this.aria2Process.kill()
          this.aria2Process = null
        }
      }, 1000)
    }
  }

  /**
   * Check if aria2c command is available
   */
  private async checkAria2Available(): Promise<boolean> {
    return new Promise((resolve) => {
      const checkProcess = spawn('aria2c', ['--version'])
      checkProcess.on('error', () => resolve(false))
      checkProcess.on('close', code => resolve(code === 0))
      setTimeout(() => resolve(false), 3000) // Timeout after 3 seconds
    })
  }

  /**
   * Call aria2 RPC method
   */
  private async call(method: string, params: unknown[]): Promise<any> {
    const id = ++this.rpcRequestId
    const rpcParams = this.rpcSecret ? [`token:${this.rpcSecret}`, ...params] : params

    const payload = {
      jsonrpc: '2.0',
      id,
      method,
      params: rpcParams,
    }

    try {
      const response = await fetch(`http://${this.rpcHost}:${this.rpcPort}/jsonrpc`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (result.error) {
        throw new Error(`RPC error: ${result.error.message}`)
      }

      return result.result
    }
    catch (error) {
      log.error(`[Aria2Service] RPC call failed: ${method}`, error)
      throw error
    }
  }

  /**
   * Add a download task
   */
  public async addDownload(options: DownloadOptions): Promise<string> {
    const params: string[] = [options.url]

    const aria2Options: Record<string, string> = {
      dir: options.dir,
    }

    if (options.out)
      aria2Options.out = options.out

    if (options.headers) {
      const headerParts = Object.entries(options.headers).map(([k, v]) => `${k}: ${v}`)
      aria2Options.header = headerParts
    }

    if (options.referer)
      aria2Options.referer = options.referer

    params.push(aria2Options)

    const result = await this.call('aria2.addUri', params)
    return result
  }

  /**
   * Add multiple downloads (for batch TS segment downloads)
   */
  public async addDownloads(urls: string[], options: Omit<DownloadOptions, 'url'>): Promise<string[]> {
    const params: [string[], Record<string, string>] = [
      urls.map(url => url),
      {
        dir: options.dir,
      },
    ]

    if (options.headers) {
      const headerParts = Object.entries(options.headers).map(([k, v]) => `${k}: ${v}`)
      params[1].header = headerParts
    }

    if (options.referer)
      params[1].referer = options.referer

    const result = await this.call('aria2.addUri', params)
    return result
  }

  /**
   * Get download status
   */
  public async getStatus(_gid: string): Promise<DownloadStatus> {
    return await this.call('aria2.getGlobalOption', [])
  }

  /**
   * Get multiple download statuses
   */
  public async getMultiStatus(gids: string[]): Promise<DownloadStatus[]> {
    return await this.call('aria2.getGlobalOption', gids)
  }

  /**
   * Pause a download
   */
  public async pause(gid: string): Promise<string> {
    return await this.call('aria2.pause', [gid])
  }

  /**
   * Pause all downloads
   */
  public async pauseAll(): Promise<string> {
    return await this.call('aria2.pauseAll', [])
  }

  /**
   * Resume a download
   */
  public async resume(gid: string): Promise<string> {
    return await this.call('aria2.unpause', [gid])
  }

  /**
   * Resume all downloads
   */
  public async resumeAll(): Promise<string> {
    return await this.call('aria2.unpauseAll', [])
  }

  /**
   * Remove a download
   */
  public async remove(gid: string): Promise<string> {
    return await this.call('aria2.remove', [gid])
  }

  /**
   * Remove all downloads
   */
  public async removeAll(): Promise<string> {
    return await this.call('aria2.removeDownloadResult', [])
  }

  /**
   * Get global download status
   */
  public async getGlobalStatus(): Promise<{
    numActive: number
    numWaiting: number
    numStopped: number
    downloadSpeed: string
    uploadSpeed: string
  }> {
    return await this.call('aria2.getGlobalStat', [])
  }

  /**
   * Tell download status
   */
  public async tellStatus(gid: string): Promise<DownloadStatus> {
    return await this.call('aria2.tellStatus', [gid])
  }

  /**
   * Tell active downloads
   */
  public async tellActive(): Promise<DownloadStatus[]> {
    return await this.call('aria2.tellActive', [])
  }

  /**
   * Tell waiting downloads
   */
  public async tellWaiting(offset = 0, num = 100): Promise<DownloadStatus[]> {
    return await this.call('aria2.tellWaiting', [offset, num])
  }

  /**
   * Tell stopped downloads
   */
  public async tellStopped(offset = 0, num = 100): Promise<DownloadStatus[]> {
    return await this.call('aria2.tellStopped', [offset, num])
  }

  /**
   * Purge download result
   */
  public async purgeDownloadResult(): Promise<string> {
    return await this.call('aria2.purgeDownloadResult', [])
  }

  /**
   * Check if aria2 is running
   */
  public isRunning(): boolean {
    return this.aria2Process !== null
  }
}

// Singleton instance
// eslint-disable-next-line import/no-mutable-exports
export let aria2Service: Aria2Service | null = null

export function initAria2Service(): Aria2Service {
  if (!aria2Service) {
    aria2Service = new Aria2Service()
  }
  return aria2Service
}
