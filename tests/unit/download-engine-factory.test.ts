import { beforeEach, describe, expect, it } from 'vitest'
import { DownloadEngineFactory } from '../../src/main/core/download-engine-factory'
import { LegacyEngine } from '../../src/main/core/legacy-engine'

describe('downloadEngineFactory', () => {
  beforeEach(() => {
    // Reset engines
  })

  describe('getAvailableEngines', () => {
    it('should return available engines', async () => {
      const engines = await DownloadEngineFactory.getAvailableEngines()

      expect(Array.isArray(engines)).toBe(true)
      expect(engines.length).toBeGreaterThan(0)
    })

    it('should at least include Legacy engine', async () => {
      const engines = await DownloadEngineFactory.getAvailableEngines()

      const hasLegacy = engines.some(engine => engine.getName() === 'Legacy (Fetch)')
      expect(hasLegacy).toBe(true)
    })
  })

  describe('getBestEngine', () => {
    it('should return an available engine', async () => {
      const engine = await DownloadEngineFactory.getBestEngine()

      expect(engine).toBeDefined()
      expect(typeof engine.download).toBe('function')
      expect(typeof engine.getName).toBe('function')
    })
  })

  describe('getEngineByName', () => {
    it('should find engine by name', () => {
      const engine = DownloadEngineFactory.getEngineByName('Legacy (Fetch)')

      expect(engine).toBeInstanceOf(LegacyEngine)
    })

    it('should return null for unknown engine', () => {
      const engine = DownloadEngineFactory.getEngineByName('Unknown Engine')

      expect(engine).toBeNull()
    })
  })

  describe('registerEngine', () => {
    it('should register custom engine', () => {
      const customEngine = {
        getName: () => 'Custom',
        download: async () => ({ success: true, downloaded: 0, total: 0 }),
        pause: async () => {},
        resume: async () => {},
        getStatus: async () => ({
          status: 'downloading',
          progress: 0,
          speed: 0,
          downloaded: 0,
          total: 0,
        }),
        cancel: async () => {},
        isAvailable: async () => true,
      }

      DownloadEngineFactory.registerEngine(customEngine)

      const engines = DownloadEngineFactory.getAllEngines()
      const hasCustom = engines.some(engine => engine.getName() === 'Custom')

      expect(hasCustom).toBe(true)
    })
  })
})
