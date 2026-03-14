import { describe, expect, it } from 'vitest'
import { M3U8ParserService } from '../../src/main/core/m3u8-parser.service'

describe('m3U8ParserService', () => {
  let parser: M3U8ParserService

  beforeEach(() => {
    parser = new M3U8ParserService()
  })

  describe('parse', () => {
    it('should parse simple M3U8 with segments', () => {
      const content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:10
#EXTINF:10.0,
segment1.ts
#EXTINF:10.0,
segment2.ts
#EXTINF:10.0,
segment3.ts`

      const result = parser.parse(content)

      expect(result.type).toBe('segments')
      expect(result.data).toBeDefined()
      expect(result.duration).toBe(30)
    })

    it('should parse M3U8 with playlists', () => {
      const content = `#EXTM3U
#EXT-X-VERSION:3
#EXT-X-STREAM-INF:BANDWIDTH=1280000,RESOLUTION=640x360
playlist1.m3u8
#EXT-X-STREAM-INF:BANDWIDTH=2560000,RESOLUTION=1280x720
playlist2.m3u8`

      const result = parser.parse(content)

      expect(result.type).toBe('playlist')
      expect(result.data).toBeDefined()
    })

    it('should handle empty M3U8', () => {
      const content = '#EXTM3U'

      expect(() => parser.parse(content)).not.toThrow()
    })
  })

  describe('getSegments', () => {
    it('should extract segments from manifest', () => {
      const content = `#EXTM3U
#EXTINF:10.0,
segment1.ts
#EXTINF:10.0,
segment2.ts`

      const result = parser.parse(content)
      const segments = parser.getSegments(result.data)

      expect(segments).toHaveLength(2)
      expect(segments[0].uri).toBe('segment1.ts')
      expect(segments[0].duration).toBe(10)
    })
  })

  describe('formatDuration', () => {
    it('should format seconds to time string', () => {
      expect(parser.formatDuration(90)).toBe('1:30')
      expect(parser.formatDuration(3661)).toBe('1:01:01')
      expect(parser.formatDuration(10)).toBe('0:10')
    })
  })

  describe('validate', () => {
    it('should validate correct M3U8', () => {
      const content = `#EXTM3U
#EXTINF:10.0,
segment1.ts`

      const result = parser.validate(content)

      expect(result.valid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    it('should detect invalid M3U8', () => {
      const content = 'not a valid m3u8'

      const result = parser.validate(content)

      expect(result.valid).toBe(false)
      expect(result.errors.length).toBeGreaterThan(0)
    })
  })
})
