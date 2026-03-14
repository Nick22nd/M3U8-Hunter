import { beforeEach, describe, expect, it } from 'vitest'
import { ConfigManager } from '../../src/main/core/config-manager'

describe('configManager', () => {
  let configManager: ConfigManager

  beforeEach(() => {
    configManager = ConfigManager.getInstance()
  })

  describe('configuration management', () => {
    it('should get default Aria2 config', () => {
      const config = configManager.getAria2Config()

      expect(config).toBeDefined()
      expect(config.host).toBe('127.0.0.1')
      expect(config.port).toBe(6800)
    })

    it('should get default server config', () => {
      const config = configManager.getServerConfig()

      expect(config).toBeDefined()
      expect(config.ip).toBe('127.0.0.1')
      expect(config.port).toBe(3000)
    })

    it('should update Aria2 config', () => {
      const newConfig = {
        host: '192.168.1.1',
        port: 7000,
      }

      expect(() => {
        configManager.setAria2Config(newConfig)
      }).not.toThrow()

      const updatedConfig = configManager.getAria2Config()
      expect(updatedConfig.host).toBe('192.168.1.1')
      expect(updatedConfig.port).toBe(7000)
    })

    it('should validate configuration', () => {
      const validation = configManager.validateConfig()

      expect(validation).toBeDefined()
      expect(typeof validation.valid).toBe('boolean')
      expect(Array.isArray(validation.errors)).toBe(true)
    })
  })

  describe('configuration validation', () => {
    it('should reject invalid Aria2 config', () => {
      const invalidConfig = {
        port: 70000, // Invalid port
      }

      expect(() => {
        configManager.setAria2Config(invalidConfig)
      }).toThrow()
    })

    it('should reject invalid server config', () => {
      const invalidConfig = {
        port: -1, // Invalid port
      }

      expect(() => {
        configManager.setServerConfig(invalidConfig)
      }).toThrow()
    })
  })

  describe('configuration export/import', () => {
    it('should export configuration', () => {
      const configJson = configManager.exportConfig()

      expect(configJson).toBeDefined()
      expect(typeof configJson).toBe('string')

      const config = JSON.parse(configJson)
      expect(config).toHaveProperty('aria2')
      expect(config).toHaveProperty('server')
    })

    it('should import valid configuration', () => {
      const validConfig = {
        aria2: {
          host: '10.0.0.1',
          port: 6801,
          secret: 'test-secret',
          concurrent: 3,
          enabled: true,
        },
        server: {
          ip: '10.0.0.1',
          port: 3001,
          autoStart: false,
        },
      }

      expect(() => {
        configManager.importConfig(JSON.stringify(validConfig))
      }).not.toThrow()
    })
  })

  describe('configuration reset', () => {
    it('should reset to defaults', () => {
      // First change some config
      configManager.setAria2Config({
        host: '192.168.1.1',
        port: 7000,
      })

      // Reset
      configManager.resetConfig()

      // Should be back to defaults
      const aria2Config = configManager.getAria2Config()
      expect(aria2Config.host).toBe('127.0.0.1')
      expect(aria2Config.port).toBe(6800)
    })
  })
})
