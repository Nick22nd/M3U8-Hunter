/**
 * Application configuration types
 */
export interface AppConfig {
  aria2: Aria2Config
  download: DownloadConfig
  server: ServerConfig
  logging: LoggingConfig
  app: AppConfigData
}

export interface Aria2Config {
  host: string
  port: number
  secret: string
  concurrent: number
  enabled: boolean
}

export interface DownloadConfig {
  maxConcurrency: number
  retryCount: number
  timeout: number
  defaultDirectory: string
}

export interface ServerConfig {
  ip: string
  port: number
  autoStart: boolean
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error'
  file: boolean
  console: boolean
  maxSize: string // e.g., '10MB'
  maxFiles: number
}

export interface AppConfigData {
  appDir?: Record<string, string>
  platform: string
  version: string
}

export interface ServerStatus {
  running: boolean
  ip: string
  port: number
  urlPrefix: string
}
