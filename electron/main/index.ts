import { app, BrowserWindow, shell, ipcMain } from 'electron'
import { release } from 'node:os'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { appService, getAppDataDir } from '../lib/m3u8.app'
import { Message4Renderer, MessageName } from '../common.types'
import electron from 'vite-plugin-electron'
import { downloadTS } from '../lib/m3u8.download'
import { exec } from 'child_process';
import Logger from 'electron-log'
import { runServe, serverConfig } from './server'

globalThis.__filename = fileURLToPath(import.meta.url)
globalThis.__dirname = dirname(__filename)

// The built directory structure
//
// ├─┬ dist-electron
// │ ├─┬ main
// │ │ └── index.js    > Electron-Main
// │ └─┬ preload
// │   └── index.mjs    > Preload-Scripts
// ├─┬ dist
// │ └── index.html    > Electron-Renderer
//
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1')) app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32') app.setAppUserModelId(app.getName())

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

// Remove electron security warnings
// This warning only shows in development mode
// Read more on https://www.electronjs.org/docs/latest/tutorial/security
// process.env['ELECTRON_DISABLE_SECURITY_WARNINGS'] = 'true'

let win: BrowserWindow | null = null
// Here, you can also use other preload
const preload = join(__dirname, '../preload/index.mjs')
const url = process.env.VITE_DEV_SERVER_URL
const indexHtml = join(process.env.DIST, 'index.html')

async function createWindow() {
  win = new BrowserWindow({
    title: 'M3U8-Hunter',
    icon: join(process.env.VITE_PUBLIC, 'favicon.ico'),
    width: 1024,
    height: 768,
    webPreferences: {
      preload,
      // Warning: Enable nodeIntegration and disable contextIsolation is not secure in production
      // nodeIntegration: true,

      // Consider using contextBridge.exposeInMainWorld
      // Read more on https://www.electronjs.org/docs/latest/tutorial/context-isolation
      contextIsolation: true,
      webviewTag: true,

    },
  })

  if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-vue#298
    console.log("process.env.VITE_DEV_SERVER_URLs", process.env.VITE_DEV_SERVER_URL)

    win.loadURL(url)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  } else {
    win.loadFile(indexHtml)
  }
  win.webContents.session.webRequest.onBeforeSendHeaders((details, callback) => {
    if (!details.webContentsId || details.webContentsId === win.webContents.id) {
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
      win.webContents.send('reply-msg', req)
      // mainWindow && mainWindow.webContents.send('message', { browserVideoItem: _item })
    }
    callback({ cancel: false })
  })
  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString() + ' m3u8-hunter')

  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}
// run express server
runServe()

ipcMain.handle('msg', async (event, arg) => {
  console.log('from ipc msg:', arg)
  const { type, name, data } = arg
  if (name === MessageName.getTasks) {
    const taskList = await appService.getTasks()
    // console.log('data getTasks', data, JSON.stringify(data))
    const newMessage: Message4Renderer = {
      type: 'm3u8',
      name: MessageName.getTasks,
      data: taskList,
    }
    win?.webContents.send('reply-msg', newMessage)
    return
  } else if (name === MessageName.downloadM3u8) {
    // if (['m3u8', 'M3U8'].includes(data.type)) {
    const _item = data
    appService.downloadM3u8(_item)
    // }
  } else if (name === MessageName.deleteTask) {
    console.log('deleteTask', data)
    await appService.deleteTask(data)
    const taskList = await appService.getTasks()
    // console.log('data getTasks', data, JSON.stringify(data))
    const newMessage: Message4Renderer = {
      type: 'm3u8',
      name: MessageName.getTasks,
      data: taskList,
    }
    win?.webContents.send('reply-msg', newMessage)
  } else if (name === MessageName.startTask) {
    console.log('startTask', data)
    try {
      // await appService.downloadM3u8(_item)
      await downloadTS(data)
    } catch (error) {
      console.log('error', error)
    }
  } else if (name === MessageName.openDir) {
    shell.openPath(data)
    // appService.refactorTask()
  } else if (name === MessageName.getServerConfig) {
    const newMessage: Message4Renderer = {
      type: 'server',
      name: MessageName.getServerConfig,
      data: serverConfig
    }
    win?.webContents.send('reply-msg', newMessage)
  }

})
export async function updateProgress() {
  // console.log('updateProgress')
  const tasks = await appService.getTasks()
  const newMessage: Message4Renderer = {
    type: 'm3u8',
    name: MessageName.getTasks,
    data: tasks
  }
  win?.webContents.send('reply-msg', newMessage)
}
app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  win = null
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})
app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  console.log('activate', allWindows.length)
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

// New window example arg: new windows url
ipcMain.handle('open-win', (_, arg) => {
  console.log('open-win', arg)
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (process.env.VITE_DEV_SERVER_URL) {
    console.log("process.env.VITE_DEV_SERVER_URL", process.env.VITE_DEV_SERVER_URL)
    childWindow.loadURL(`${url}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
