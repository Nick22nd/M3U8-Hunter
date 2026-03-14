import { Parser } from 'm3u8-parser'
import Logger from 'electron-log'
import type { M3U8Manifest, M3U8Playlist, M3U8Segment, ParsedM3U8, ParsingOptions } from '../../shared/types'

/**
 * M3U8 Parser service
 */
export class M3U8ParserService {
  /**
   * Parse M3U8 content
   */
  parse(content: string, options: ParsingOptions = {}): ParsedM3U8 {
    try {
      const parser = new Parser(options.strict ? { strictMode: true } : {})
      parser.push(content)

      const manifest = parser.manifest
      const duration = this.calculateDuration(manifest)

      if (this.isPlaylist(manifest)) {
        return {
          type: 'playlist',
          data: manifest,
          duration,
        }
      }
      else {
        return {
          type: 'segments',
          data: manifest,
          duration,
        }
      }
    }
    catch (error) {
      Logger.error('[M3U8ParserService] Failed to parse M3U8 content:', error)
      throw new Error(`M3U8 parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Parse M3U8 file
   */
  async parseFile(filePath: string): Promise<ParsedM3U8> {
    try {
      const fs = await import('node:fs')
      const content = fs.readFileSync(filePath, 'utf8')
      return this.parse(content)
    }
    catch (error) {
      Logger.error(`[M3U8ParserService] Failed to parse M3U8 file: ${filePath}`, error)
      throw new Error(`Failed to read M3U8 file: ${filePath}`)
    }
  }

  /**
   * Check if manifest is a playlist (has sub-playlists) or segments
   */
  private isPlaylist(manifest: any): boolean {
    return manifest.playlists && manifest.playlists.length > 0
  }

  /**
   * Calculate total duration from manifest
   */
  private calculateDuration(manifest: any): number {
    if (manifest.segments && manifest.segments.length > 0) {
      return manifest.segments.reduce((total: number, segment: any) => {
        return total + (segment.duration || 0)
      }, 0)
    }
    return 0
  }

  /**
   * Get segments from manifest
   */
  getSegments(manifest: M3U8Manifest): M3U8Segment[] {
    return manifest.segments || []
  }

  /**
   * Get playlists from manifest
   */
  getPlaylists(manifest: M3U8Manifest): M3U8Playlist[] {
    return manifest.playlists || []
  }

  /**
   * Get target duration
   */
  getTargetDuration(manifest: M3U8Manifest): number | undefined {
    return manifest.targetDuration
  }

  /**
   * Get version
   */
  getVersion(manifest: M3U8Manifest): number | undefined {
    return manifest.version
  }

  /**
   * Format duration to time string
   */
  formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
    }
    return `${minutes}:${String(secs).padStart(2, '0')}`
  }

  /**
   * Validate M3U8 content
   */
  validate(content: string): { valid: boolean, errors: string[] } {
    const errors: string[] = []

    try {
      const parsed = this.parse(content)

      if (!parsed.data) {
        errors.push('Invalid M3U8 format: no data found')
      }

      if (parsed.type === 'segments') {
        const segments = this.getSegments(parsed.data)
        if (segments.length === 0) {
          errors.push('No segments found in M3U8')
        }
      }
      else if (parsed.type === 'playlist') {
        const playlists = this.getPlaylists(parsed.data)
        if (playlists.length === 0) {
          errors.push('No playlists found in M3U8')
        }
      }

      return {
        valid: errors.length === 0,
        errors,
      }
    }
    catch (error) {
      return {
        valid: false,
        errors: [`Parse error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      }
    }
  }

  /**
   * Get segment count
   */
  getSegmentCount(manifest: M3U8Manifest): number {
    return this.getSegments(manifest).length
  }

  /**
   * Get playlist count
   */
  getPlaylistCount(manifest: M3U8Manifest): number {
    return this.getPlaylists(manifest).length
  }
}

// Export singleton instance
export const m3u8Parser = new M3U8ParserService()
