/**
 * IPC message types
 */
export interface IPCMessage<T = any> {
  type: 'request' | 'response'
  channel: string
  payload: T
  timestamp?: number
}

export interface IPCResponse<T = any> {
  success: boolean
  data?: T
  error?: {
    code: string
    message: string
    details?: any
  }
  timestamp: number
}

export interface IPCChannelMapping {
  // Task management
  'tasks:get-all': void
  'tasks:create': any
  'tasks:update': any
  'tasks:delete': string
  'tasks:pause': string
  'tasks:resume': string
  'tasks:restart': string

  // M3U8 operations
  'm3u8:download': any
  'm3u8:parse': string
  'm3u8:analyze': { content: string }

  // Server operations
  'server:get-config': void
  'server:set-config': any
  'server:get-status': void
  'server:start': void
  'server:stop': void

  // Aria2 operations
  'aria2:get-config': void
  'aria2:set-config': any
  'aria2:get-status': void
  'aria2:start': void
  'aria2:stop': void

  // System operations
  'system:open-dir': string
  'system:open-log': void
  'system:open-url': string
  'system:get-app-dir': void
  'system:set-app-dir': string
  'system:migrate-tasks': void

  // Sniffer operations
  'sniffer:start': void
  'sniffer:stop': void
  'sniffer:get-resources': void
}

export type IPCRequestData<K extends keyof IPCChannelMapping> = IPCChannelMapping[K]
export type IPCResponseData<K extends keyof IPCChannelMapping> = any
