import fs from 'node:fs'
import { join } from 'node:path'
import { Parser } from 'm3u8-parser'
import download from 'download'
import os from 'node:os'
import fsExtra from 'fs-extra'

import { jsondb } from './jsondb'
import { dialog } from 'electron'
import { TaskItem } from '../common.types'
import { downloadTS } from './m3u8.download'
import Logger from 'electron-log'
import { showPlaylistTaskDialog } from '../main'
import { getAppDataDir } from './utils'


export class M3u8Service {
    // static storagePath = getAppDataDir()
    static httpTimeout = {
        socket: 30000,
        request: 30000,
        response: 60000,
    }
    storagePath: any
    constructor() {
        this.storagePath = getAppDataDir()
        console.log('storagePath', this.storagePath)
    }

    public getTime(): number {
        return new Date().getTime()
    }
    public async getTasks() {
        // jsondb.init()
        const data = await jsondb.getDB()
        // console.log('data', data)
        return data
    }

    // download m3u8
    public async downloadM3u8(videoItem: TaskItem, targetPath = this.storagePath) {
        const m3u8Url = videoItem.url
        const headers = videoItem.headers
        const sampleFilename = new URL(m3u8Url).pathname.split('/').pop()
        const defaultName = new Date().getTime().toString()
        const dirName = videoItem.name || defaultName
        console.log("@@@dirName", dirName)
        targetPath = join(targetPath, dirName)
        if (!fs.existsSync(targetPath)) {
            console.log('targetPath', targetPath)
            fs.mkdirSync(targetPath, { recursive: true })
        }

        try {
            if (fs.existsSync(join(targetPath, sampleFilename))) {
                console.log('file exists')
                const result = analyseM3u8File(targetPath, sampleFilename)
                if (result.type === 'segments') {
                    const duration = result.duration
                    const newTask: TaskItem = {
                        ...videoItem,
                        url: m3u8Url,
                        headers: headers,
                        status: 'downloaded',
                        duration,
                        durationStr: timeFormat(duration),
                        createTime: new Date().getTime(),
                        directory: targetPath,
                    }
                    await jsondb.update(newTask)
                    try {
                        await downloadTS(newTask)
                    } catch (error) {
                        Logger.error('downloadTS in file exists', error)
                    }
                } else {
                    // playlist 
                    showPlaylistTaskDialog(result.data, videoItem)
                }
            }
            else {
                console.log('start download')
                try {
                    await download(m3u8Url, targetPath, {
                        // filename: name,
                        timeout: M3u8Service.httpTimeout,
                        headers: headers,
                        retry: {
                            retries: 3
                        }
                    })
                } catch (error) {
                    Logger.error('download m3u8 error', error)
                    return
                }
                console.log('download finished')

                const result = await analyseM3u8File(targetPath, sampleFilename)
                // segments or playlists
                if (result.type === 'segments') {
                    const duration = result.duration
                    let newTask: TaskItem = {
                        ...videoItem,
                        url: m3u8Url,
                        headers: headers,
                        status: 'downloaded',
                        duration,
                        durationStr: timeFormat(duration),
                        createTime: new Date().getTime(),
                        directory: targetPath,
                    }
                    await jsondb.update(newTask)
                    const options: Electron.MessageBoxOptions = {
                        type: 'info',
                        title: 'Application Menu Demo',
                        buttons: ['Ok'],
                        message: 'name: ' + sampleFilename + '\ntime durattion ' + timeFormat(duration) + 's',
                    }
                    dialog.showMessageBox(options)
                        .then(async (val) => {
                            try {
                                await downloadTS(newTask)
                            } catch (error) {
                                Logger.error('downloadTS', error)
                            }
                        }).catch(Logger.error);
                } else {
                    // playlist 
                    showPlaylistTaskDialog(result.data, videoItem)
                }
            }
        }
        catch (err) {
            console.log('err', err)
        }
    }
    public async deleteTask(num: number) {
        try {
            const data = await jsondb.getDB()
            const tasks = data.tasks as TaskItem[]
            if (tasks[num].status === 'downloaded') {
                fsExtra.removeSync(tasks[num].directory)
            }
            tasks.splice(num, 1)
            jsondb.db.tasks = tasks
            await jsondb.db.write()
        }
        catch (error) {
            console.log('error', error)
        }
    }
    public async refactorTask() {
        const data = await jsondb.getDB()
        const tasks = data.tasks
        tasks.forEach((item, index) => {
            // TODO: need change the name
            item.directory = join(this.storagePath, item.name.split('.')[0])
        })
        try {
            jsondb.db.tasks = tasks
            await jsondb.db.write()
        }
        catch (error) {
            console.log('error', error)
        }
    }
}

function timeFormat(streamDuration: number) {
    const hours = Math.floor(streamDuration / 3600)
    const minutes = Math.floor((streamDuration - hours * 3600) / 60)
    const seconds = Math.floor(streamDuration - hours * 3600 - minutes * 60)
    const str = [hours, minutes, seconds].map((item) => {
        return item.toString().padStart(2, '0')
    }).join(':')
    return str
}
/**
 * analyze the M3U8 file return segments or playlists
 * @param targetPath file directory
 * @param sampleFilename file name
 * @returns 
 */
function analyseM3u8File(targetPath: string, sampleFilename: string) {
    const str = fs.readFileSync(join(targetPath, sampleFilename), 'utf8')
    const parser = new Parser()
    parser.push(str)
    // console.log(parser.manifest)
    const { segments } = parser.manifest
    let streamDuration = 0
    streamDuration = segments.reduce((acc, cur) => {
        return acc + cur.duration
    }, 0)
    console.log('streamDuration: ', streamDuration, timeFormat(streamDuration))
    // console.log(parser)

    // playlist
    if (parser.manifest.playlists && parser.manifest.playlists.length !== 0) {
        console.log(parser.manifest.playlists)
        return { type: 'playlist', data: parser.manifest.playlists, duration: streamDuration }
    }
    return { type: 'segments', data: segments, duration: streamDuration }
}

export const m3u8Service = new M3u8Service()
