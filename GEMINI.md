# M3U8-Hunter Project Context

## Overview
**M3U8-Hunter** is an Electron-based desktop application designed to download and process m3u8 video streams. It features a modern Vue 3 frontend and a robust Node.js backend (Main process) capable of sniffing network traffic for m3u8 links, downloading segments, decrypting content, and merging streams using FFmpeg.

## Tech Stack
*   **Runtime:** Electron
*   **Language:** TypeScript
*   **Build Tool:** Vite (with `vite-plugin-electron`)
*   **Frontend Framework:** Vue 3
*   **UI Library:** Element Plus, UnoCSS
*   **State Management:** Pinia
*   **Router:** Vue Router
*   **Core Libraries:**
    *   `ffmpeg` (via `@ffmpeg/ffmpeg` and `fluent-ffmpeg`): Video processing.
    *   `got`, `download`: Network requests.
    *   `lowdb`: Local JSON database.
    *   `electron-store`: User configuration persistence.
    *   `m3u8-parser`, `hls.js`, `dplayer`: M3U8 handling and playback.

## Project Structure

```text
D:\aispace\M3U8-Hunter\
├── src\
│   ├── main\           # Electron Main Process (Node.js)
│   │   ├── index.ts    # Application Entry Point & IPC Handlers
│   │   ├── lib\        # Core Logic (M3U8 download, decrypt, generate)
│   │   └── service\    # Services (Sniffer, Dialog, Aria2, Web Server)
│   ├── renderer\       # Vue 3 Frontend
│   │   ├── main.ts     # Frontend Entry Point
│   │   ├── App.vue     # Root Component
│   │   ├── pages\      # View Components
│   │   ├── components\ # Reusable UI Components
│   │   └── stores\     # Pinia Stores
│   └── preload\        # Electron Preload Scripts (IPC Bridge)
├── scripts\            # Standalone utility scripts (Node.js)
├── dist-electron\      # Compiled Electron Main/Preload code
├── dist\               # Compiled Renderer (Web) code
└── electron-builder.json5 # Electron packaging configuration
```

## Key Commands

### Development
*   **Start Dev Server:** `npm run dev`
    *   Launches Vite dev server and the Electron app window.

### Build & Package
*   **Build Production:** `npm run build`
    *   Runs type checks (`vue-tsc`).
    *   Builds renderer and main process (`vite build`).
    *   Packages the application (`electron-builder`).

### Testing & Linting
*   **Run Tests:** `npm test` (Vitest)
*   **Lint Code:** `npm run lint` (ESLint)
*   **Fix Lint Issues:** `npm run lint:fix`

## Development Conventions
*   **Architecture:** The project follows the standard Electron process model:
    *   **Main Process:** Handles OS-level interactions, file system, FFmpeg operations, and network sniffing.
    *   **Renderer Process:** Handles UI/UX.
    *   **Communication:** Uses `ipcMain` and `ipcRenderer` for communication between processes. Handlers are defined in `src/main/index.ts`.
*   **Type Safety:** Strict TypeScript usage across both processes.
*   **Styling:** UnoCSS is used for atomic CSS styling.
*   **Linting:** Adheres to `@antfu/eslint-config` standards.
*   **Git Hooks:** Uses `simple-git-hooks` to enforce linting on commit.

## Important Notes
*   **FFmpeg:** The app relies on FFmpeg for video merging. Ensure environment compatibility when testing related features.
*   **Sniffer:** The `Sniffer` service intercepts traffic to find m3u8 urls. This requires a BrowserWindow instance to attach to.
*   **Permissions:** On macOS, the app might need Full Disk Access to write to certain directories, as noted in the README.
