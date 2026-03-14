import Store from 'electron-store'
import Logger from 'electron-log'
import type { AppConfig, Aria2Config, ServerConfig } from '../../shared/types'

/**
 * Config repository interface
 */
export interface IConfigRepository {
  get: <T>(key: string) => T | null
  set: <T>(key: string, value: T) => void
  getAria2Config: () => Aria2Config
  setAria2Config: (config: Aria2Config) => void
  getServerConfig: () => ServerConfig
  setServerConfig: (config: ServerConfig) => void
  getAppDataDir: (platform?: string) => string | undefined
  setAppDataDir: (dir: string, platform?: string) => void
  reset: () => void
  export: () => string
  import: (config: string) => void
}

/**
 * Config repository implementation using electron-store
 */
export class ConfigRepository implements IConfigRepository {
  private store: Store

  constructor() {
    this.store = new Store()
  }

  /**
   * Get a configuration value by key
   */
  get<T>(key: string): T | null {
    try {
      const value = this.store.get(key) as T
      return value ?? null
    }
    catch (error) {
      Logger.error(`[ConfigRepository] Failed to get config "${key}":`, error)
      return null
    }
  }

  /**
   * Set a configuration value by key
   */
  set<T>(key: string, value: T): void {
    try {
      this.store.set(key, value)
      Logger.info(`[ConfigRepository] Config updated: ${key}`)
    }
    catch (error) {
      Logger.error(`[ConfigRepository] Failed to set config "${key}":`, error)
      throw error
    }
  }

  /**
   * Get Aria2 configuration
   */
  getAria2Config(): Aria2Config {
    const defaultConfig: Aria2Config = {
      host: '127.0.0.1',
      port: 6800,
      secret: 'secret',
      concurrent: 5,
      enabled: false,
    }

    const config = this.store.get('aria2')
    return config ? { ...defaultConfig, ...config } : defaultConfig
  }

  /**
   * Set Aria2 configuration
   */
  setAria2Config(config: Aria2Config): void {
    this.set('aria2', config)
  }

  /**
   * Get server configuration
   */
  getServerConfig(): ServerConfig {
    const defaultConfig: ServerConfig = {
      ip: '127.0.0.1',
      port: 3000,
      autoStart: true,
    }

    const config = this.store.get('server')
    return config ? { ...defaultConfig, ...config } : defaultConfig
  }

  /**
   * Set server configuration
   */
  setServerConfig(config: ServerConfig): void {
    this.set('server', config)
  }

  /**
   * Get app data directory for a specific platform
   */
  getAppDataDir(platform?: string): string | undefined {
    const currentPlatform = platform || process.platform
    const key = `config.appDir.${currentPlatform}`
    return this.get<string>(key)
  }

  /**
   * Set app data directory for a specific platform
   */
  setAppDataDir(dir: string, platform?: string): void {
    const currentPlatform = platform || process.platform
    const key = `config.appDir.${currentPlatform}`
    this.set(key, dir)
  }

  /**
   * Reset all configuration to defaults
   */
  reset(): void {
    try {
      this.store.clear()
      Logger.info('[ConfigRepository] Configuration reset to defaults')
    }
    catch (error) {
      Logger.error('[ConfigRepository] Failed to reset configuration:', error)
      throw error
    }
  }

  /**
   * Export configuration as JSON string
   */
  export(): string {
    try {
      const config = this.store.store
      return JSON.stringify(config, null, 2)
    }
    catch (error) {
      Logger.error('[ConfigRepository] Failed to export configuration:', error)
      throw error
    }
  }

  /**
   * Import configuration from JSON string
   */
  import(config: string): void {
    try {
      const configData = JSON.parse(config)
      this.store.store = configData
      Logger.info('[ConfigRepository] Configuration imported successfully')
    }
    catch (error) {
      Logger.error('[ConfigRepository] Failed to import configuration:', error)
      throw error
    }
  }
}

// Export singleton instance
export const configRepository = new ConfigRepository()
