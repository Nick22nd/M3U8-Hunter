/**
 * Shared types exports
 */
export * from './task.types'
export * from './download.types'
export * from './config.types'
export * from './ipc.types'
export * from './m3u8.types'
export * from './error.types'

// Re-export legacy types for backward compatibility
export enum MessageName {
  getTasks,
  downloadM3u8,
  findM3u8,
  deleteTask,
  startTask,
  openDir,
  getServerConfig,
  openLog,
  openUrl,
  getPlaylist,
  getNotification,
  setAppDataDir,
  openAppDir,
  pauseTask,
  resumeTask,
  getAria2Config,
  setAria2Config,
  startAria2,
  stopAria2,
  getAria2Status,
  migrateTasks,
  updateTaskMetadata,
}

export interface Message4Renderer {
  type: string
  name: MessageName
  data: any
}

export interface FindedResource {
  url: string
  headers: Record<string, string>
  type: string
  duration?: number
  durationStr?: string
  streamType?: M3U8StreamType
  isLive?: boolean
  segmentCount?: number
  name?: string
  title?: string
  from?: string
  og?: {
    title: string
    image: string
    description: string
  }
  tags?: string[]
}

export interface MediaMessage {
  browserVideoItem: {
    headers: Record<string, string>
    type: string
    duration?: number
    durationStr?: string
    streamType?: M3U8StreamType
    isLive?: boolean
    segmentCount?: number
    url: string
    name?: string
    title?: string
    from?: string
    og?: {
      title: string
      image: string
      description: string
    }
    tags?: string[]
  }
}
