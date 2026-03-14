import { join } from 'node:path'
import fs from 'node:fs'
import Logger from 'electron-log'
import Store from 'electron-store'
import type { AppConfig, Aria2Config, DownloadConfig, LoggingConfig, ServerConfig } from '../../shared/types'
import { ConfigError, ErrorCode } from '../../shared/types'
import { errorHandler } from './error-handler'

/**
 * Configuration validator interface
 */
interface ConfigValidator<T> {
  validate: (config: T) => { valid: boolean, errors: string[] }
  getDefaults: () => T
  migrate: (config: T, version: number) => T
}

/**
 * Configuration version
 */
const CONFIG_VERSION = 1

/**
 * Aria2 config validator
 */
class Aria2ConfigValidator implements ConfigValidator<Aria2Config> {
  validate(config: Aria2Config): { valid: boolean, errors: string[] } {
    const errors: string[] = []

    if (!config.host || config.host.trim() === '') {
      errors.push('Aria2 host is required')
    }

    if (config.port < 1 || config.port > 65535) {
      errors.push('Aria2 port must be between 1 and 65535')
    }

    if (config.concurrent < 1 || config.concurrent > 100) {
      errors.push('Aria2 concurrent downloads must be between 1 and 100')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  getDefaults(): Aria2Config {
    return {
      host: '127.0.0.1',
      port: 6800,
      secret: '',
      concurrent: 5,
      enabled: false,
    }
  }

  migrate(config: Aria2Config, version: number): Aria2Config {
    // No migration needed for current version
    return config
  }
}

/**
 * Server config validator
 */
class ServerConfigValidator implements ConfigValidator<ServerConfig> {
  validate(config: ServerConfig): { valid: boolean, errors: string[] } {
    const errors: string[] = []

    if (!config.ip || config.ip.trim() === '') {
      errors.push('Server IP is required')
    }

    if (config.port < 1 || config.port > 65535) {
      errors.push('Server port must be between 1 and 65535')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  getDefaults(): ServerConfig {
    return {
      ip: '127.0.0.1',
      port: 3000,
      autoStart: true,
    }
  }

  migrate(config: ServerConfig, version: number): ServerConfig {
    // No migration needed for current version
    return config
  }
}

/**
 * Download config validator
 */
class DownloadConfigValidator implements ConfigValidator<DownloadConfig> {
  validate(config: DownloadConfig): { valid: boolean, errors: string[] } {
    const errors: string[] = []

    if (config.maxConcurrency < 1 || config.maxConcurrency > 100) {
      errors.push('Max concurrency must be between 1 and 100')
    }

    if (config.retryCount < 0 || config.retryCount > 10) {
      errors.push('Retry count must be between 0 and 10')
    }

    if (config.timeout < 1000 || config.timeout > 300000) {
      errors.push('Timeout must be between 1s and 5m')
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  getDefaults(): DownloadConfig {
    return {
      maxConcurrency: 5,
      retryCount: 3,
      timeout: 30000,
      defaultDirectory: '',
    }
  }

  migrate(config: DownloadConfig, version: number): DownloadConfig {
    // No migration needed for current version
    return config
  }
}

/**
 * Logging config validator
 */
class LoggingConfigValidator implements ConfigValidator<LoggingConfig> {
  validate(config: LoggingConfig): { valid: boolean, errors: string[] } {
    const errors: string[] = []

    if (config.maxFiles < 1 || config.maxFiles > 50) {
      errors.push('Max log files must be between 1 and 50')
    }

    const validLevels = ['debug', 'info', 'warn', 'error']
    if (!validLevels.includes(config.level)) {
      errors.push(`Invalid log level: ${config.level}`)
    }

    return {
      valid: errors.length === 0,
      errors,
    }
  }

  getDefaults(): LoggingConfig {
    return {
      level: 'info',
      file: true,
      console: true,
      maxSize: '10MB',
      maxFiles: 5,
    }
  }

  migrate(config: LoggingConfig, version: number): LoggingConfig {
    // No migration needed for current version
    return config
  }
}

/**
 * Centralized configuration manager
 */
export class ConfigManager {
  private static instance: ConfigManager
  private store: Store
  private validators: Map<string, ConfigValidator<any>> = new Map()
  private configVersion: number = CONFIG_VERSION

  private constructor() {
    this.store = new Store()
    this.initializeValidators()
    this.checkMigrationNeeded()
  }

  /**
   * Get singleton instance
   */
  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager()
    }
    return ConfigManager.instance
  }

  /**
   * Initialize configuration validators
   */
  private initializeValidators(): void {
    this.validators.set('aria2', new Aria2ConfigValidator())
    this.validators.set('server', new ServerConfigValidator())
    this.validators.set('download', new DownloadConfigValidator())
    this.validators.set('logging', new LoggingConfigValidator())
  }

  /**
   * Check if migration is needed
   */
  private checkMigrationNeeded(): void {
    const storedVersion = this.get<number>('config.version', 0)

    if (storedVersion < this.configVersion) {
      Logger.info(`[ConfigManager] Migrating configuration from version ${storedVersion} to ${this.configVersion}`)
      this.migrateConfig(storedVersion)
      this.set('config.version', this.configVersion)
    }
  }

  /**
   * Migrate configuration
   */
  private migrateConfig(fromVersion: number): void {
    for (const [key, validator] of this.validators) {
      const currentConfig = this.get(key, validator.getDefaults())
      const migratedConfig = validator.migrate(currentConfig, fromVersion)
      this.set(key, migratedConfig)
    }
  }

  /**
   * Get configuration value
   */
  get<T>(key: string, defaultValue?: T): T {
    try {
      const value = this.store.get(key, defaultValue)
      return value as T
    }
    catch (error) {
      Logger.error(`[ConfigManager] Failed to get config "${key}":`, error)
      if (defaultValue !== undefined) {
        return defaultValue
      }
      throw new ConfigError(`Failed to get configuration: ${key}`, {
        key,
        error,
      })
    }
  }

  /**
   * Set configuration value
   */
  set<T>(key: string, value: T): void {
    try {
      this.store.set(key, value)
      Logger.debug(`[ConfigManager] Config set: ${key}`)
    }
    catch (error) {
      Logger.error(`[ConfigManager] Failed to set config "${key}":`, error)
      throw new ConfigError(`Failed to set configuration: ${key}`, {
        key,
        error,
      })
    }
  }

  /**
   * Get Aria2 configuration
   */
  getAria2Config(): Aria2Config {
    const validator = this.validators.get('aria2')!
    const config = this.get('aria2', validator.getDefaults())
    const validation = validator.validate(config)

    if (!validation.valid) {
      Logger.warn(`[ConfigManager] Invalid Aria2 config:`, validation.errors)
      return validator.getDefaults()
    }

    return config
  }

  /**
   * Set Aria2 configuration
   */
  setAria2Config(config: Partial<Aria2Config>): void {
    const validator = this.validators.get('aria2')!
    const currentConfig = this.getAria2Config()
    const newConfig = { ...currentConfig, ...config }

    const validation = validator.validate(newConfig)
    if (!validation.valid) {
      throw new ConfigError(`Invalid Aria2 configuration: ${validation.errors.join(', ')}`, {
        errors: validation.errors,
        config: newConfig,
      })
    }

    this.set('aria2', newConfig)
  }

  /**
   * Get server configuration
   */
  getServerConfig(): ServerConfig {
    const validator = this.validators.get('server')!
    const config = this.get('server', validator.getDefaults())
    const validation = validator.validate(config)

    if (!validation.valid) {
      Logger.warn(`[ConfigManager] Invalid server config:`, validation.errors)
      return validator.getDefaults()
    }

    return config
  }

  /**
   * Set server configuration
   */
  setServerConfig(config: Partial<ServerConfig>): void {
    const validator = this.validators.get('server')!
    const currentConfig = this.getServerConfig()
    const newConfig = { ...currentConfig, ...config }

    const validation = validator.validate(newConfig)
    if (!validation.valid) {
      throw new ConfigError(`Invalid server configuration: ${validation.errors.join(', ')}`, {
        errors: validation.errors,
        config: newConfig,
      })
    }

    this.set('server', newConfig)
  }

  /**
   * Get download configuration
   */
  getDownloadConfig(): DownloadConfig {
    const validator = this.validators.get('download')!
    const config = this.get('download', validator.getDefaults())
    const validation = validator.validate(config)

    if (!validation.valid) {
      Logger.warn(`[ConfigManager] Invalid download config:`, validation.errors)
      return validator.getDefaults()
    }

    return config
  }

  /**
   * Set download configuration
   */
  setDownloadConfig(config: Partial<DownloadConfig>): void {
    const validator = this.validators.get('download')!
    const currentConfig = this.getDownloadConfig()
    const newConfig = { ...currentConfig, ...config }

    const validation = validator.validate(newConfig)
    if (!validation.valid) {
      throw new ConfigError(`Invalid download configuration: ${validation.errors.join(', ')}`, {
        errors: validation.errors,
        config: newConfig,
      })
    }

    this.set('download', newConfig)
  }

  /**
   * Get logging configuration
   */
  getLoggingConfig(): LoggingConfig {
    const validator = this.validators.get('logging')!
    const config = this.get('logging', validator.getDefaults())
    const validation = validator.validate(config)

    if (!validation.valid) {
      Logger.warn(`[ConfigManager] Invalid logging config:`, validation.errors)
      return validator.getDefaults()
    }

    return config
  }

  /**
   * Set logging configuration
   */
  setLoggingConfig(config: Partial<LoggingConfig>): void {
    const validator = this.validators.get('logging')!
    const currentConfig = this.getLoggingConfig()
    const newConfig = { ...currentConfig, ...config }

    const validation = validator.validate(newConfig)
    if (!validation.valid) {
      throw new ConfigError(`Invalid logging configuration: ${validation.errors.join(', ')}`, {
        errors: validation.errors,
        config: newConfig,
      })
    }

    this.set('logging', newConfig)
  }

  /**
   * Get complete application configuration
   */
  getConfig(): AppConfig {
    return {
      aria2: this.getAria2Config(),
      server: this.getServerConfig(),
      download: this.getDownloadConfig(),
      logging: this.getLoggingConfig(),
      app: {
        platform: process.platform,
        version: process.env.npm_package_version || '0.0.1',
      },
    }
  }

  /**
   * Validate complete configuration
   */
  validateConfig(): { valid: boolean, errors: string[] } {
    const allErrors: string[] = []

    for (const [key, validator] of this.validators) {
      const config = this.get(key, validator.getDefaults())
      const validation = validator.validate(config)
      allErrors.push(...validation.errors)
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors,
    }
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): void {
    for (const [key, validator] of this.validators) {
      this.set(key, validator.getDefaults())
    }
    Logger.info('[ConfigManager] Configuration reset to defaults')
  }

  /**
   * Export configuration to JSON
   */
  exportConfig(): string {
    try {
      const config = this.getConfig()
      return JSON.stringify(config, null, 2)
    }
    catch (error) {
      Logger.error('[ConfigManager] Failed to export configuration:', error)
      throw new ConfigError('Failed to export configuration', { error })
    }
  }

  /**
   * Import configuration from JSON
   */
  importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson) as AppConfig

      // Validate each section
      for (const [key, validator] of this.validators) {
        if (key in config) {
          const validation = validator.validate((config as any)[key])
          if (!validation.valid) {
            throw new ConfigError(`Invalid ${key} configuration: ${validation.errors.join(', ')}`, {
              errors: validation.errors,
            })
          }
          this.set(key, (config as any)[key])
        }
      }

      Logger.info('[ConfigManager] Configuration imported successfully')
    }
    catch (error) {
      Logger.error('[ConfigManager] Failed to import configuration:', error)
      throw new ConfigError('Failed to import configuration', { error })
    }
  }

  /**
   * Backup configuration
   */
  async backupConfig(backupPath?: string): Promise<string> {
    try {
      const config = this.getConfig()
      const configJson = JSON.stringify(config, null, 2)

      const path = backupPath || join(
        process.env.APPDATA || process.env.HOME || '.',
        `m3u8-hunter-config-backup-${Date.now()}.json`,
      )

      fs.writeFileSync(path, configJson, 'utf8')
      Logger.info(`[ConfigManager] Configuration backed up to: ${path}`)

      return path
    }
    catch (error) {
      Logger.error('[ConfigManager] Failed to backup configuration:', error)
      throw new ConfigError('Failed to backup configuration', { error })
    }
  }

  /**
   * Restore configuration from backup
   */
  async restoreConfig(backupPath: string): Promise<void> {
    try {
      if (!fs.existsSync(backupPath)) {
        throw new ConfigError(`Backup file not found: ${backupPath}`)
      }

      const configJson = fs.readFileSync(backupPath, 'utf8')
      this.importConfig(configJson)

      Logger.info(`[ConfigManager] Configuration restored from: ${backupPath}`)
    }
    catch (error) {
      Logger.error('[ConfigManager] Failed to restore configuration:', error)
      throw new ConfigError('Failed to restore configuration', { error })
    }
  }

  /**
   * Get configuration version
   */
  getConfigVersion(): number {
    return this.configVersion
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance()
