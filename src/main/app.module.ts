import { join } from 'node:path'
import { Module } from '@nestjs/common'
import { ElectronModule } from '@doubleshot/nest-electron'
import { BrowserWindow, app } from 'electron'
import { AppController } from './app.controller'
import { AppService } from './app.service'

@Module({
  imports: [
    ElectronModule.registerAsync({
      useFactory: async () => {
        const isDev = !app.isPackaged
        const lang = app.getPreferredSystemLanguages()[0]
        console.log(lang)
        const win = new BrowserWindow({
          width: 1024,
          height: 768,
          autoHideMenuBar: true,
          webPreferences: {
            contextIsolation: true,
            preload: join(__dirname, '../preload/index.js'),
            webviewTag: true,
          },
        })

        win.on('closed', () => {
          win.destroy()
        })

        const URL = isDev
          ? process.env.DS_RENDERER_URL
          : `file://${join(app.getAppPath(), 'dist/render/index.html')}`

        win.loadURL(URL)
        win.webContents.openDevTools()
        win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
          if (!details.webContentsId || details.webContentsId === win.webContents.id) {
            callback({ cancel: false })
            return
          }
          // const id = details.webContentsId

          if (/http.*\.((mp4)|(m3u8)|(flv)|(mp3)|(mpd)|(wav))(\?|$)/.test(details.url)) {
            const [_null, _type] = details.url.match(/http.*\.((mp4)|(m3u8)|(flv)|(mp3)|(mpd)|(wav))(\?|$)/)

            if (!details.url.includes('/hls') || details.url.includes('480p') || details.url.includes('live')) {
              callback({ cancel: true })
              return
            }
            // console.log(details)
            const _item = {
              type: _type.toUpperCase(),
              url: details.url,
              headers: JSON.stringify(details.requestHeaders),
            }
            win.webContents.send('reply-msg', { browserVideoItem: _item })
            // mainWindow && mainWindow.webContents.send('message', { browserVideoItem: _item })
          }

          callback({ cancel: false })
        })
        return { win }
      },
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
