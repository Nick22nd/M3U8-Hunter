/**
 * Download engine types
 */
export interface DownloadOptions {
  concurrency?: number
  retryCount?: number
  timeout?: number
  headers?: Record<string, string>
}

export interface DownloadStatus {
  status: 'downloading' | 'completed' | 'failed' | 'paused'
  progress: number
  speed: number
  downloaded: number
  total: number
}

export interface SegmentInfo {
  uri: string
  duration: number
  key?: {
    uri: string
    iv?: string
  }
}

export interface DownloadResult {
  success: boolean
  error?: Error
  downloaded: number
  total: number
}

export interface DownloadEngine {
  download: (task: any) => Promise<void>
  pause: (taskId: string) => Promise<void>
  resume: (taskId: string) => Promise<void>
  getStatus: (taskId: string) => Promise<DownloadStatus>
}

export interface Aria2Config {
  host: string
  port: number
  secret: string
  concurrent: number
  enabled: boolean
}

export interface Aria2DownloadOptions {
  url: string
  dir: string
  out?: string
  headers?: Record<string, string>
}
