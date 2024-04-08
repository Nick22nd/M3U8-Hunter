import os from 'node:os'
import path from 'node:path'
import fsExtra from 'fs-extra'
import { join, dirname } from 'node:path'

export function getDefaultLogDir(appName) {
    switch (process.platform) {
        case 'darwin': {
            return path.resolve(os.homedir(), 'Library/Logs', appName);
        }
        case 'win32': {
            return path.resolve(os.homedir(), 'AppData/Roaming', appName, 'logs');
        }
        default: {
            return path.resolve(os.homedir(), '.config', appName, 'logs');
        }
    }
}
export function getAppDataDir() {
    const devDir = import.meta.env && import.meta.env.VITE_TMPDIR
    const appDir = devDir ? devDir : join(os.homedir(), 'M3U8Hunter');
    console.log('appDir', appDir)
    fsExtra.ensureDirSync(appDir)
    return appDir;
}