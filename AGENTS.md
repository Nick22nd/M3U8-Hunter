# AGENTS.md - M3U8-Hunter Developer Guide

This file provides guidance for AI agents working on the M3U8-Hunter codebase.

## Project Overview

M3U8-Hunter is an Electron-based M3U8 video downloader with Vue 3 frontend:

- Electron (main + preload + renderer process architecture)
- Vue 3 with Composition API and `<script setup>`
- Pinia for state management
- Element Plus UI components
- UnoCSS for styling
- TypeScript throughout
- Vitest for testing
- ESLint with @antfu/eslint-config

## Build/Lint/Test Commands

```bash
npm i                    # Install dependencies
npm run dev              # Development mode with hot-reload
npm run build            # Production build (type check + Vite + Electron Builder)
npm run test             # Run all Vitest tests
npm run test -- <file>   # Run single test file
npm run test -- --run <file>  # Run single test (non-watch mode)
npm run test-ui          # Vitest with UI
npm run lint             # ESLint check
npm run lint:fix         # ESLint with auto-fix
```

## Code Style Guidelines

### TypeScript

- Use `type` imports for types only:
  ```typescript
  import type { MessageName, TaskItem } from './common.types'
  import { someFunction } from './utils'
  ```
- Prefer explicit types over `any`. If needed, use `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
- Use TypeScript enums for constants (see `MessageName` in `src/main/common.types.ts`)

### Vue 3

- Use Composition API with `<script setup lang="ts">`:
  ```vue
  <script setup lang="ts">
  import { computed, ref } from 'vue'
  import type { TaskItem } from './common.types'
  const tasks = ref<TaskItem[]>([])
  </script>
  ```
- Use Element Plus components with `el-` prefix: `<el-button>`, `<el-input>`, etc.
- Component names should match file names

### Pinia Stores

- Use `defineStore` with composition API style:
  ```typescript
  import { defineStore } from 'pinia'
  import { computed, ref } from 'vue'
  export const useTaskStore = defineStore('tasks', () => {
    const tasks = ref<TaskItem[]>([])
    return { tasks }
  })
  ```

### Electron IPC

- Main process handlers mapped to `MessageName` enum:
  ```typescript
  const handlers = {
    [MessageName.getTasks]: async () => {
      /* ... */
    },
  }
  ipcMain.handle('msg', async (event, arg) => {
    const { name, data } = arg
    if (handlers[name])
      return handlers[name](data)
  })
  ```
- Renderer: `window.electron.ipcRenderer.invoke('msg', { name, data })`
- Responses: `win.webContents.send('reply-msg', { type, name, data })`

### Naming Conventions

- **Files**: kebab-case for Vue (`SideBar.vue`), camelCase for TS (`m3u8.app.ts`)
- **Variables/functions**: camelCase (`getTasks`)
- **Constants/enums**: PascalCase (`MessageName`)
- **CSS classes**: kebab-case (UnoCSS)

### Import Conventions

- Node.js built-ins use `node:` prefix: `import { join } from "node:path";`
- Group imports: external libs → types → internal modules

### Error Handling

- Use try/catch for async operations
- Use `electron-log` for main process logging:
  ```typescript
  import Logger from 'electron-log'
  Logger.info('[ServiceName] Action')
  Logger.error('[ServiceName] Error:', error)
  ```

### ESLint Configuration

- `@antfu/eslint-config` with overrides:
  - `no-console`: off
  - `node/prefer-global/*`: off for main process
  - `vue/multi-word-component-names`: off
  - `ts/consistent-type-imports`: warn
  - `ts/no-explicit-any`: warn

### Project Structure

```
src/
├── main/           # Electron main process
│   ├── index.ts    # Entry point, window, IPC handlers
│   ├── app.ts      # ServiceContainer
│   ├── common.types.ts
│   ├── lib/        # Business logic
│   └── service/   # Services (sniffer, dialog, web, aria2)
├── preload/        # Preload script
│   └── index.ts
└── renderer/       # Vue 3 SPA
    ├── App.vue
    ├── components/
    ├── pages/
    ├── stores/
    └── common.types.ts
```

### Common Issues

- macOS `EPERM`: Grant Full Disk Access to the app
- App logs: macOS `~/Library/Logs/M3U8-Hunter`
- Windows 7: GPU acceleration disabled via `app.disableHardwareAcceleration()`
