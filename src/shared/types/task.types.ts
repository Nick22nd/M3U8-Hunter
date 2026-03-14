/**
 * Task status enumeration
 */
export enum TaskStatus {
  DOWNLOADING = 'downloading',
  DOWNLOADED = 'downloaded',
  FAILED = 'failed',
  PAUSED = 'paused',
  SUCCESS = 'success',
  WAITING = 'waiting',
  UNFINISHED = 'unfinished',
}

/**
 * Task progress information
 */
export interface TaskProgress {
  segmentCount: number
  downloadedCount: number
  progress: string
  speed?: number // bytes per second
  remainingTime?: number // seconds
}

/**
 * Open Graph metadata
 */
export interface OGMetadata {
  title: string
  image: string
  description: string
}

/**
 * Folder conflict resolution information
 */
export interface FolderConflict {
  originalName: string
  resolvedName: string
  resolutionMethod: 'suffix' | 'taskId'
}

/**
 * Task item interface
 */
export interface TaskItem {
  url: string
  headers: Record<string, string>
  type?: string
  status: TaskStatus
  duration?: number
  durationStr?: string
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
  folderConflict?: FolderConflict
  createTime?: number
}

/**
 * Task creation options
 */
export interface TaskCreationOptions {
  url: string
  headers?: Record<string, string>
  name?: string
  from?: string
  og?: OGMetadata
}

/**
 * Task update options
 */
export interface TaskUpdateOptions {
  status?: TaskStatus
  segmentCount?: number
  downloadedCount?: number
  progress?: string
  directory?: string
  og?: OGMetadata
  folderConflict?: FolderConflict
}
