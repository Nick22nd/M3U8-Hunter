import Logger from 'electron-log'
import type { IDownloadEngine } from './download-engine.interface'
import { aria2Engine } from './aria2-engine'
import { legacyEngine } from './legacy-engine'

/**
 * Download engine factory
 */
export class DownloadEngineFactory {
  private static engines: IDownloadEngine[] = [aria2Engine, legacyEngine]

  /**
   * Get available download engines
   */
  static async getAvailableEngines(): Promise<IDownloadEngine[]> {
    const availableEngines: IDownloadEngine[] = []

    for (const engine of this.engines) {
      try {
        if (await engine.isAvailable()) {
          availableEngines.push(engine)
        }
      }
      catch (error) {
        Logger.warn(`[DownloadEngineFactory] Engine ${engine.getName()} not available:`, error)
      }
    }

    return availableEngines
  }

  /**
   * Get best available download engine
   */
  static async getBestEngine(): Promise<IDownloadEngine> {
    const availableEngines = await this.getAvailableEngines()

    if (availableEngines.length === 0) {
      throw new Error('No download engines available')
    }

    // Prefer Aria2 over Legacy for better performance
    const aria2Engine = availableEngines.find(engine => engine.getName() === 'Aria2')
    return aria2Engine || availableEngines[0]
  }

  /**
   * Get engine by name
   */
  static getEngineByName(name: string): IDownloadEngine | null {
    return this.engines.find(engine => engine.getName() === name) || null
  }

  /**
   * Register a custom download engine
   */
  static registerEngine(engine: IDownloadEngine): void {
    if (!this.engines.includes(engine)) {
      this.engines.push(engine)
      Logger.info(`[DownloadEngineFactory] Registered engine: ${engine.getName()}`)
    }
  }

  /**
   * Get all registered engines
   */
  static getAllEngines(): IDownloadEngine[] {
    return [...this.engines]
  }
}
