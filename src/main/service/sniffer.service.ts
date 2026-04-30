import type { BrowserWindow } from 'electron'
import Logger from 'electron-log'
import type { FindedResource, Message4Renderer } from '../common.types'
import { MessageName } from '../common.types'
import { m3u8Parser } from '../core/m3u8-parser.service'

const M3U8_URL_PATTERN = /^https?:\/\/.+\.m3u8(?:\?.*)?$/i
const MAX_ANALYSIS_DEPTH = 1
const ANALYSIS_TIMEOUT = 10000

export class Sniffer {
  win: BrowserWindow
  private readonly inspectedUrls = new Set<string>()
  private readonly pendingUrls = new Set<string>()

  constructor(win: BrowserWindow) {
    this.win = win
  }

  m3u8Find() {
    this.win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
      if (!details.webContentsId || details.webContentsId === this.win.webContents.id) {
        callback({ cancel: false })
        return
      }

      if (this.shouldInspect(details.url)) {
        const headers = this.normalizeHeaders(details.requestHeaders)
        void this.inspectDetectedUrl(details.url, headers)
      }

      callback({ cancel: false })
    })
  }

  private shouldInspect(url: string): boolean {
    return M3U8_URL_PATTERN.test(url)
  }

  private normalizeHeaders(headers: Record<string, string | string[]>): Record<string, string> {
    return Object.entries(headers).reduce<Record<string, string>>((result, [key, value]) => {
      if (Array.isArray(value))
        result[key] = value.join('; ')
      else if (typeof value === 'string')
        result[key] = value
      return result
    }, {})
  }

  private async inspectDetectedUrl(url: string, headers: Record<string, string>): Promise<void> {
    const cacheKey = this.toCacheKey(url)
    if (this.inspectedUrls.has(cacheKey) || this.pendingUrls.has(cacheKey))
      return

    this.pendingUrls.add(cacheKey)

    try {
      const parsed = await this.inspectManifest(url, headers)
      if (!parsed || parsed.suspectedAd) {
        this.inspectedUrls.add(cacheKey)
        return
      }

      this.inspectedUrls.add(cacheKey)
      this.pushResult({
        duration: parsed.duration,
        durationStr: parsed.duration > 0 ? m3u8Parser.formatDuration(parsed.duration) : undefined,
        headers,
        isLive: parsed.isLive,
        segmentCount: parsed.segmentCount,
        streamType: parsed.streamType,
        type: 'M3U8',
        url,
      })
    }
    catch (error) {
      Logger.warn('[Sniffer] Failed to inspect m3u8 url:', url, error)
    }
    finally {
      this.pendingUrls.delete(cacheKey)
    }
  }

  private async inspectManifest(url: string, headers: Record<string, string>, depth = 0) {
    const content = await this.fetchManifest(url, headers)
    if (!content.includes('#EXTM3U'))
      return null

    const parsed = m3u8Parser.parse(content, {}, url)
    if (parsed.type === 'playlist' && depth < MAX_ANALYSIS_DEPTH) {
      const selectedPlaylist = [...m3u8Parser.getPlaylists(parsed.data)]
        .sort((left, right) => (right.bandwidth || 0) - (left.bandwidth || 0))
        .find(playlist => !!playlist.uri)

      if (selectedPlaylist?.uri) {
        try {
          const nestedUrl = new URL(selectedPlaylist.uri, url).toString()
          const nestedParsed = await this.inspectManifest(nestedUrl, headers, depth + 1)
          if (nestedParsed)
            return nestedParsed
        }
        catch (error) {
          Logger.warn('[Sniffer] Failed to inspect nested playlist:', selectedPlaylist.uri, error)
        }
      }
    }

    return parsed
  }

  private async fetchManifest(url: string, headers: Record<string, string>): Promise<string> {
    const response = await fetch(url, {
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(ANALYSIS_TIMEOUT),
    })

    if (!response.ok)
      throw new Error(`Failed to load manifest: ${response.status}`)

    return await response.text()
  }

  private pushResult(item: FindedResource) {
    const req: Message4Renderer = {
      data: { browserVideoItem: item },
      name: MessageName.findM3u8,
      type: 'm3u8',
    }
    this.win.webContents.send('reply-msg', req)
  }

  private toCacheKey(url: string): string {
    try {
      const normalized = new URL(url)
      normalized.hash = ''
      return normalized.toString()
    }
    catch {
      return url
    }
  }
}
