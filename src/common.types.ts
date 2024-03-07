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
export interface TaskItem {
    url: string
    headers: {
        [key: string]: string
    }
    type?: string
    status: 'downloading' | 'downloaded' | 'failed',
    duration?: number
    durationStr?: string
    name?: string,
    from?: string,
    createTime?: number
    title?: string
}
export interface FindedResource {
    url: string
    headers: {
        [key: string]: string
    }
    type: string
}
export interface MediaMessage {
    browserVideoItem: {
        headers: {
            [key: string]: string
        }
        type: string
        url: string
    }
}