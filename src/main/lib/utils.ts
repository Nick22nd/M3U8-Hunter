import os from 'node:os'
import path, { join } from 'node:path'
import fs from 'node:fs'
import fsExtra from 'fs-extra'
import Store from 'electron-store'

const store = new Store()

export function getDefaultLogDir(appName) {
  switch (process.platform) {
    case 'darwin': {
      return path.resolve(os.homedir(), 'Library/Logs', appName)
    }
    case 'win32': {
      return path.resolve(os.homedir(), 'AppData/Roaming', appName, 'logs')
    }
    default: {
      return path.resolve(os.homedir(), '.config', appName, 'logs')
    }
  }
}

export function getAppDataDir() {
  const tmpDir = store.get('config.appDir') as string
  if (tmpDir && fsExtra.pathExistsSync(tmpDir)) {
    return store.get('config.appDir')
  }
  else {
    const devDir = import.meta.env && import.meta.env.VITE_TMPDIR
    const appDir = devDir || join(os.homedir(), 'M3U8Hunter')
    fsExtra.ensureDirSync(appDir)
    return appDir
  }
}

export function copyServerHtmlToAppData() {
  const appDir = getAppDataDir()
  const serverHtml = join(process.env.DIST, 'server.html')
  const targetHtml = join(appDir, 'index.html')
  if (process.env.DIST && fs.existsSync(process.env.DIST))
  // fsExtra.copyFileSync(serverHtml, targetHtml)

    return targetHtml
}

export function timeFormat(streamDuration: number) {
  const hours = Math.floor(streamDuration / 3600)
  const minutes = Math.floor((streamDuration - hours * 3600) / 60)
  const seconds = Math.floor(streamDuration - hours * 3600 - minutes * 60)
  const str = [hours, minutes, seconds].map((item) => {
    return item.toString().padStart(2, '0')
  }).join(':')
  return str
}
