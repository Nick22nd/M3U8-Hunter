import { release } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import process from 'node:process'
import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron'
import Store from 'electron-store'
import { M3u8Service } from './lib/m3u8.app'
import type { Message4Renderer, TaskItem } from './common.types'
import { MessageName } from './common.types'
import { runServe, serverConfig } from './service/web.app'
import { getDefaultLogDir } from './lib/utils'
import { DialogService } from './service/dialog.service'
import { Sniffer } from './service/sniffer.service'
import { ServiceContainer } from './app'
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

globalThis.__filename = fileURLToPath(import.meta.url)
globalThis.__dirname = dirname(__filename)
console.log('env file', import.meta.env.VITE_TMPDIR)
process.env.DIST_ELECTRON = join(__dirname, '..')
process.env.DIST = join(process.env.DIST_ELECTRON, '../dist')
process.env.VITE_PUBLIC = process.env.VITE_DEV_SERVER_URL
  ? join(process.env.DIST_ELECTRON, '../public')
  : process.env.DIST

// Disable GPU Acceleration for Windows 7
if (release().startsWith('6.1'))
  app.disableHardwareAcceleration()

// Set application name for Windows 10+ notifications
if (process.platform === 'win32')
  app.setAppUserModelId(app.getName())

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
// run express server
// eslint-disable-next-line import/no-mutable-exports
export let serviceHub: ServiceContainer

const store = new Store()
function registerService() {
  try {
    if (!serverConfig.serverStarted)
      runServe()
    const snifferService = new Sniffer(win)
    snifferService.m3u8Find()
    
    const dialogService = new DialogService(win)
    const m3u8Service = new M3u8Service(dialogService)
    serviceHub = new ServiceContainer(dialogService, m3u8Service)
  }
  catch (error) {
    console.log('error', error)
  }
}
async function createWindow() {
  win = new BrowserWindow({
    title: 'M3U8-Hunter',
    icon: join(process.env.VITE_PUBLIC, 'favicon.ico'),
    width: 800,
    height: 600,
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
  registerService()

  if (process.env.VITE_DEV_SERVER_URL) { // electron-vite-vue#298
    console.log('process.env.VITE_DEV_SERVER_URLs', process.env.VITE_DEV_SERVER_URL)

    win.loadURL(url)
    // Open devTool if the app is not packaged
    win.webContents.openDevTools()
  }
  else {
    win.loadFile(indexHtml)
  }
  // Test actively push message to the Electron-Renderer
  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', `${new Date().toLocaleString()} m3u8-hunter`)
  })

  // Make all links open with the browser, not with the application
  win.webContents.setWindowOpenHandler(({ url }) => {
    console.log('setWindowOpenHandler')
    if (url.startsWith('https:'))
      shell.openExternal(url)
    return { action: 'deny' }
  })
  // win.webContents.on('will-navigate', (event, url) => { }) #344
}
const handlers = {
  [MessageName.getTasks]: async () => {
    const taskList = await serviceHub.m3u8Service.getTasks()
    // console.log('data getTasks', data, JSON.stringify(data))
    const newMessage: Message4Renderer = {
      type: 'm3u8',
      name: MessageName.getTasks,
      data: taskList,
    }
    win?.webContents.send('reply-msg', newMessage)
  },
  [MessageName.downloadM3u8]: async (data: TaskItem) => {
    // if (['m3u8', 'M3U8'].includes(data.type)) {
    serviceHub.m3u8Service.downloadM3u8(data)
    // }
  },
  [MessageName.deleteTask]: async (data: number) => {
    console.log('deleteTask', data)
    await serviceHub.m3u8Service.deleteTask(data)
    const taskList = await serviceHub.m3u8Service.getTasks()
    // console.log('data getTasks', data, JSON.stringify(data))
    const newMessage: Message4Renderer = {
      type: 'm3u8',
      name: MessageName.getTasks,
      data: taskList,
    }
    win?.webContents.send('reply-msg', newMessage)
  },
  [MessageName.startTask]: async (data: TaskItem) => {
    console.log('startTask', data)
    try {
      await serviceHub.m3u8Service.downloadTS(data)
    }
    catch (error) {
      console.log('error', error)
    }
  },
  [MessageName.pauseTask]: async (data: TaskItem) => {
    console.log('pauseTask', data)
    await serviceHub.m3u8Service.pauseTask(data)
  },
  [MessageName.resumeTask]: async (data: TaskItem) => {
    console.log('resumeTask', data)
    await serviceHub.m3u8Service.resumeTask(data)
    handlers[MessageName.getTasks]()
  },
  [MessageName.openDir]: async (data: string) => {
    shell.openPath(data)

    // appService.refactorTask()
  },
  [MessageName.getServerConfig]: async () => {
    const newMessage: Message4Renderer = {
      type: 'server',
      name: MessageName.getServerConfig,
      data: serverConfig,
    }
    win?.webContents.send('reply-msg', newMessage)
  },
  [MessageName.openLog]: async () => {
    const logDir = getDefaultLogDir(app.name)
    shell.openPath(logDir)
  },
  [MessageName.openAppDir]: () => {
    const appPath = app.getPath('userData')
    shell.openPath(appPath)
  },
  [MessageName.openUrl]: async (data: string) => {
    console.log('openUrl', data)
    shell.openExternal(data)
  },
  [MessageName.setAppDataDir]: () => {
    console.log('dialog')
    dialog.showOpenDialog({
      properties: ['openDirectory'],
    }).then((result) => {
      if (!result.canceled) {
        const selectedDirectory = result.filePaths[0]
        console.log(selectedDirectory)
        store.set('config.appDir', selectedDirectory)
        app.relaunch()
        app.exit()
      }
    })
  },
}

ipcMain.handle('msg', async (event, arg) => {
  console.log('from ipc msg:', arg)
  const { name, data } = arg
  if (handlers[name])
    return handlers[name](data)
})

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  console.log('window-all-closed')
  win = null
  if (process.platform !== 'darwin')
    app.quit()
})

app.on('second-instance', () => {
  if (win) {
    // Focus on the main window if the user tried to open another
    if (win.isMinimized())
      win.restore()
    win.focus()
  }
})
app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  console.log('activate', allWindows.length)
  if (allWindows.length)
    allWindows[0].focus()
  else
    createWindow()
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
    console.log('process.env.VITE_DEV_SERVER_URL', process.env.VITE_DEV_SERVER_URL)
    childWindow.loadURL(`${url}#${arg}`)
  }
  else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
