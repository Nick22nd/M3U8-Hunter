import { BrowserWindow } from "electron"
import { Message4Renderer, MessageName, TaskItem } from "../common.types"

export class DialogService {
    win: BrowserWindow
    constructor(win: BrowserWindow) {
        this.win = win
    }
    showPlaylistTaskDialog(playlists: any, task: TaskItem) {
        const newMessage: Message4Renderer = {
            type: 'm3u8',
            name: MessageName.getPlaylist,
            data: {
                playlists,
                task
            }
        }
        this.win.webContents.send('reply-msg', newMessage)
    }
    async updateProgress(tasks: TaskItem[]) {
        // console.log('updateProgress')
        const newMessage: Message4Renderer = {
            type: 'm3u8',
            name: MessageName.getTasks,
            data: tasks
        }
        this.win.webContents.send('reply-msg', newMessage)
    }
}