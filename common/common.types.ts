export enum MessageName {
    getTasks,
    downloadM3u8,
    findM3u8,
    deleteTask,
    startTask
}
export type Message4Renderer = {
    type: string
    name: MessageName
    data: any
}
export interface Task {
    url: string
    headers: {
        [key: string]: string
    }
    type?: string
    status: 'downloading' | 'downloaded' | 'failed',
    duration?: number
    durationStr?: string
}
export interface MediaMessage {
    browserVideoItem: {
        headers: string
        type: string
        url: string
    }
}