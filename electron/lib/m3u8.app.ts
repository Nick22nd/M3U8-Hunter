import fs from 'node:fs'
import { join } from 'node:path'
import { Parser } from 'm3u8-parser'
import download from 'download'
import os from 'node:os'
import fsExtra from 'fs-extra'

import { jsondb } from './jsondb'
import { dialog } from 'electron'
import { TaskItem } from '../common.types'

export function getAppDataDir() {
    const devDir = import.meta.env.VITE_TMPDIR
    const appDir = devDir ? devDir : join(os.homedir(), 'M3U8Hunter');
    console.log('appDir', appDir)
    fsExtra.ensureDirSync(appDir)
    return appDir;
}
export class AppService {
    storagePath = getAppDataDir()
    httpTimeout = {
        socket: 30000,
        request: 30000,
        response: 60000,
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
                const duration = analyseM3u8File(targetPath, sampleFilename)
                await jsondb.update({
                    ...videoItem,
                    url: m3u8Url,
                    headers: headers,
                    status: 'downloaded',
                    duration,
                    durationStr: timeFormat(duration),
                    createTime: new Date().getTime(),
                    directory: targetPath,
                })
            }
            else {
                console.log('start download')

                await downloadFile(m3u8Url, targetPath, headers)
                console.log('download finished')
                const duration = await analyseM3u8File(targetPath, sampleFilename)
                try {
                    await jsondb.update({
                        ...videoItem,
                        url: m3u8Url,
                        headers: headers,
                        status: 'downloaded',
                        duration,
                        durationStr: timeFormat(duration),
                        createTime: new Date().getTime(),
                        directory: targetPath,
                    })
                    const options: Electron.MessageBoxOptions = {
                        type: 'info',
                        title: 'Application Menu Demo',
                        buttons: ['Ok'],
                        message: 'name: ' + sampleFilename + '\ntime durattion ' + timeFormat(duration) + 's',
                    }
                    dialog.showMessageBox(options)
                } catch (error) {
                    console.log('error', error)
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
async function downloadFile(url: string, targetPath: string, headers: TaskItem["headers"]) {
    // const stream = got.stream(url)
    // name = name || new URL(url).pathname.split('/').pop()
    // console.log('name', name)
    // console.log(targetPath, name)
    // const writer = fs.createWriteStream(join(targetPath, name))

    // stream.pipe(writer)
    // return new Promise((resolve, reject) => {
    //   writer.on('finish', resolve)
    //   writer.on('error', reject)
    // })
    const _headers = headers
    try {
        await jsondb.update({
            url,
            headers: _headers,
            status: 'downloading',
        })
    }
    catch (error) {
        console.log('error', error)
    }
    return download(url, targetPath, {
        // filename: name,
        timeout: appService.httpTimeout,
        headers: _headers,
    })
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
    return streamDuration
}

export const appService = new AppService()
