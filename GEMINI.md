# M3U8-Hunter Project Context

## Overview
**M3U8-Hunter** is a high-performance, Electron-based desktop application designed to download and process m3u8 video streams. Following a comprehensive multi-phase refactoring, the project features a modular, service-oriented architecture with a focus on performance, resource management, and robust error handling.

## Tech Stack
*   **Runtime:** Electron (v28+)
*   **Language:** TypeScript (100% coverage)
*   **Build Tool:** Vite
*   **Frontend Framework:** Vue 3
*   **UI Library:** Element Plus, UnoCSS, Lucide Vue Next
*   **State Management:** Pinia
*   **Router:** Vue Router
*   **Core Libraries:**
    *   `ffmpeg` (via `@ffmpeg/ffmpeg` and `fluent-ffmpeg`): Video processing.
    *   `got`, `download`, `aria2`: Network requests and download engines.
    *   `lowdb` (JSONDB): Task and data persistence.
    *   `electron-store`: User configuration persistence.
    *   `electron-log`: Structured logging.
    *   `express`, `cors`: Internal web server capabilities.
    *   `m3u8-parser`, `hls.js`, `dplayer`: M3U8 handling and playback.

## Architecture & Systems

### 1. Modular Download Engine
Uses a **Factory Pattern** to provide multiple download strategies:
*   `Aria2Engine`: High-performance download via Aria2.
*   `LegacyEngine`: Standard download via Fetch/Node APIs.
*   `BaseDownloadEngine`: Abstract base class ensuring consistency.

### 2. Resource & Performance Management
*   **ProgressManager**: Batch updates (2s intervals) reducing I/O operations by 50%+.
*   **MemoryManager**: Real-time monitoring and leak detection.
*   **CacheManager**: LRU (Least Recently Used) caching with TTL support.
*   **PerformanceMonitor**: Operation tracking and bottleneck analysis.

### 3. Quality & Stability System
*   **ErrorHandler**: Centralized error management with history and statistics.
*   **ConfigManager**: Centralized configuration with validation and versioning.
*   **LoggerService**: Structured, multi-level logging.
*   **EnhancedFileService**: Robust file operations with built-in error handling.

### 4. Type-Safe IPC Communication
*   **IPCHandler (Main)** & **IPCClient (Renderer)**: Provides a compile-time type-checked communication bridge using shared definitions in `src/shared`.

### 5. Data Access Layer
*   **Repository Pattern**: `TaskRepository` and `ConfigRepository` abstract the underlying storage (JSONDB / electron-store).

## Project Structure

```text
D:\aispace\M3U8-Hunter\
├── src\
│   ├── main\               # Electron Main Process
│   │   ├── core\           # Engines, Managers, Services, IPC Handlers
│   │   ├── lib\            # Legacy/Utility logic
│   │   ├── repositories\   # Data access layer
│   │   ├── service\        # Specialized services (Aria2, Sniffer, etc.)
│   │   └── index.ts        # Entry point
│   ├── renderer\           # Vue 3 Frontend
│   │   ├── components\     # Reusable UI components
│   │   ├── pages\          # Main views (Home, Tasks, Setting, etc.)
│   │   ├── stores\         # Pinia state
│   │   └── main.ts         # Frontend entry
│   ├── preload\            # IPC Bridge
│   └── shared\             # Shared types, interfaces, and IPC client
├── tests\                  # Comprehensive Vitest suite (Unit tests)
├── scripts\                # Standalone utility scripts
├── dist-electron\          # Compiled Main/Preload code
└── electron-builder.json5   # Packaging config
```

## Key Commands
*   **Start Dev:** `npm run dev`
*   **Build App:** `npm run build` (includes type check and packaging)
*   **Run Tests:** `npm test` (115+ unit tests)
*   **Lint:** `npm run lint`

## Development Conventions
*   **Type Safety:** Strictly avoid `any`. Use definitions in `src/shared/types`.
*   **Modularity:** New features should be implemented as services or managers in `src/main/core`.
*   **Testing:** Every core change must be accompanied by a Vitest unit test in `tests/unit`.
*   **Logging:** Use the centralized `Logger` for structured logging instead of `console.log`.
*   **Error Handling:** Wrap critical operations and use `ErrorHandler` to report issues.

## Important Notes
*   **Aria2:** Ensure Aria2 is properly configured in the settings for optimal download performance.
*   **FFmpeg:** Required for merging segments. The app handles internal/external FFmpeg paths.
*   **Refactoring Status:** The project has completed Phase 4 (UX). Most core systems are now modernized and highly optimized.
