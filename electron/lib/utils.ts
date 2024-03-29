import os from 'node:os'
import path from 'node:path'
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