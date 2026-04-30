/**
 * M3U8 parser types
 */
export interface M3U8Manifest {
  isPlaylist: boolean
  playlists?: M3U8Playlist[]
  segments?: M3U8Segment[]
  duration?: number
  targetDuration?: number
  version?: number
  endList?: boolean
  mediaSequence?: number
}

export interface M3U8Playlist {
  uri: string
  bandwidth?: number
  codecs?: string
  resolution?: {
    width: number
    height: number
  }
  frameRate?: number
}

export interface M3U8Segment {
  uri: string
  duration: number
  key?: M3U8Key
  byteRange?: string
  programDateTime?: string
}

export interface M3U8Key {
  method: string
  uri: string
  iv?: string
  keyFormat?: string
  keyFormatVersions?: string
}

export type M3U8StreamType = 'live' | 'vod' | 'unknown'

export interface ParsedM3U8 {
  type: 'playlist' | 'segments'
  data: M3U8Manifest
  duration: number
  streamType: M3U8StreamType
  segmentCount: number
  isLive: boolean
  suspectedAd: boolean
  adSignals: string[]
}

export interface ParsedSegment {
  url: string
  duration: number
  keyUrl?: string
  iv?: string
  byteRange?: string
}

export interface ParsingOptions {
  strict?: boolean
  timeout?: number
}
