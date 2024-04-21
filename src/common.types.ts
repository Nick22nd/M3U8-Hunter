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
    getPlaylist
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
    directory?: string
    segmentCount?: number
    downloadedCount?: number
    progress?: string,
    retryCount?: number,
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

export const TabList = {
    Home: 'Player',
    Tasks: 'Tasks',
    Explore: 'Explore',
    Setting: 'Setting',
    About: 'About'
}