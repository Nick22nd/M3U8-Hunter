import { BrowserView, BrowserWindow } from "electron"
import { Message4Renderer, MessageName } from "../common.types"

export class Sniffer {
    win: BrowserWindow
    constructor(win: BrowserWindow) {
        this.win = win
    }
    m3u8Find() {
        this.win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
            if (!details.webContentsId || details.webContentsId === this.win.webContents.id) {
                callback({ cancel: false })
                return
            }
            // const id = details.webContentsId

            if (/http.*\.((mp4)|(m3u8)|(flv)|(mp3)|(mpd)|(wav))(\?|$)/.test(details.url)) {
                const [_null, _type] = details.url.match(/http.*\.((mp4)|(m3u8)|(flv)|(mp3)|(mpd)|(wav))(\?|$)/)

                // if (!details.url.includes('/hls') || details.url.includes('480p') || details.url.includes('live')) {
                //   callback({ cancel: true })
                //   return
                // }
                // console.log(details)
                const _item = {
                    type: _type.toUpperCase(),
                    url: details.url,
                    headers: details.requestHeaders,
                }
                const req: Message4Renderer = {
                    data: { browserVideoItem: _item },
                    name: MessageName.findM3u8,
                    type: 'm3u8',
                }
                this.win.webContents.send('reply-msg', req)
                // mainWindow && mainWindow.webContents.send('message', { browserVideoItem: _item })
            }
            callback({ cancel: false })
        })
    }
}