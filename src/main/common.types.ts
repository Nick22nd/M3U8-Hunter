export type M3U8StreamType = 'live' | 'vod' | 'unknown'

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

export interface OGMetadata {
  title: string
  image: string
  description: string
}

export interface Message4Renderer {
  type: string
  name: MessageName
  data: any
}
export interface TaskItem {
  url: string
  headers: {
    [key: string]: string
  }
  type?: string
  status: 'downloading' | 'downloaded' | 'failed' | 'paused' | 'success' | 'waiting' | 'unfinished'
  duration?: number
  durationStr?: string
  streamType?: M3U8StreamType
  isLive?: boolean
  name?: string
  from?: string
  taskId: string
  createdAt?: number
  title?: string
  directory?: string
  segmentCount?: number
  downloadedCount?: number
  progress?: string
  retryCount?: number
  og?: OGMetadata
  tags?: string[]
  folderConflict?: {
    originalName: string
    resolvedName: string
    resolutionMethod: 'suffix' | 'taskId'
  }
  createTime?: number
}
export interface FindedResource {
  url: string
  headers: {
    [key: string]: string
  }
  type: string
  duration?: number
  durationStr?: string
  streamType?: M3U8StreamType
  isLive?: boolean
  segmentCount?: number
  name?: string
  title?: string
  from?: string
  og?: OGMetadata
  tags?: string[]
}
export interface MediaMessage {
  browserVideoItem: {
    headers: {
      [key: string]: string
    }
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
    og?: OGMetadata
    tags?: string[]
  }
}
