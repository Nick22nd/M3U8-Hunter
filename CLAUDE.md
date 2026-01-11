# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

M3U8-Hunter is an Electron-based M3U8 video downloader. It automatically detects M3U8 URLs from browser network traffic and provides a Vue 3 interface for managing download tasks. The app downloads HLS (HTTP Live Streaming) video segments and can serve them via a local Express server.

## Development Commands

```bash
# Install dependencies (use npm mirror if needed in China)
npm i

# Development mode (starts Vite dev server with Electron hot-reload)
npm run dev

# Production build (type check + Vite build + Electron Builder package)
npm run build

# Run tests
npm run test          # Run Vitest tests
npm run test-ui       # Run Vitest with UI

# Linting
npm run lint          # ESLint check
npm run lint:fix      # ESLint with auto-fix
```

For Chinese users or regions requiring npm mirrors:
```bash
ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/" npm i
```

## Architecture

### Electron Multi-Process Structure

```
src/
├── main/           # Electron main process (Node.js environment)
├── preload/        # Preload script (secure bridge to renderer)
└── renderer/       # Vue 3 SPA (browser environment)
```

**Main Process** (`src/main/index.ts`):
- Entry point that creates the BrowserWindow
- Registers all IPC handlers via `handlers` object mapping to `MessageName` enum
- Initializes `ServiceContainer` which manages:
  - **Sniffer Service** - Intercepts network traffic to find M3U8 URLs
  - **Dialog Service** - Shows notifications and dialogs
  - **M3U8 Service** - Manages download tasks and TS file processing
- Spawns Express server for serving downloaded files

**IPC Communication Pattern**:
- Renderer sends messages via `window.electron.ipcRenderer.invoke('msg', { name, data })`
- Main process has a single `ipcMain.handle('msg')` handler that dispatches to `handlers[name]`
- Responses sent back via `win.webContents.send('reply-msg', message)` with `{ type, name, data }`
- All message types defined in `src/main/common.ts` as `MessageName` enum

**Renderer Process**:
- Vue 3 with Composition API
- Pinia stores for state management (`src/renderer/stores/`)
- Element Plus UI components
- Uses `window.electron` proxy (exposed via preload) for IPC

### Key Services

**M3U8 Service** (`src/main/lib/m3u8.app.ts`):
- Manages task queue with concurrent download limits
- Downloads `.ts` segments from M3U8 playlists
- Emits events for real-time UI updates (progress, status changes)
- Handles pause/resume/delete operations
- Persists tasks to JSON database

**Sniffer Service** (`src/main/service/sniffer.service.ts`):
- Uses webview to intercept network requests
- Detects M3U8 URLs from browser traffic
- Sends found resources to renderer via IPC

**Express Server** (`src/main/service/web.app.ts`):
- Serves downloaded files on configurable port
- Provides video playback URLs

### Data Models

**TaskItem** (defined in `src/main/common.types.ts`):
```typescript
interface TaskItem {
  url: string
  headers: { [key: string]: string }
  type?: string
  status: 'downloading' | 'downloaded' | 'failed' | 'paused' | 'success' | 'waiting' | 'unfinished'
  name?: string
  from?: string
  title?: string
  directory?: string
  segmentCount?: number
  downloadedCount?: number
  progress?: string
  retryCount?: number
}
```

## Platform-Specific Notes

- **Windows 7**: GPU acceleration disabled via `app.disableHardwareAcceleration()`
- **Windows 10+**: App user model ID set for proper notifications
- **macOS**: Logs in `~/Library/Logs/M3U8-Hunter`, may need Full Disk Access permission
- **Single Instance Lock**: App exits if another instance is already running

## Configuration

- **electron-store**: Stores app config (custom app data directory, etc.)
- **LowDB**: JSON-based database for task persistence
- Default app data: System-specific user data directory (configurable via settings)

## Common Issues

If app cannot generate tasks, check logs:
- macOS: `~/Library/Logs/M3U8-Hunter`

If `EPERM` errors occur, grant Full Disk Access permissions:
- System Preferences → Privacy & Security → Full Disk Access → Add app folder
