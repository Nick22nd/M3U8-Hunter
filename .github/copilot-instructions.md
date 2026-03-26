# Copilot Instructions for M3U8-Hunter

## Commands

```bash
npm run dev          # Start Vite dev server + Electron (hot-reload)
npm run build        # vue-tsc --noEmit && vite build && electron-builder
npm run test         # Run all Vitest tests
npm run test-ui      # Run Vitest with browser UI
npm run lint         # ESLint check
npm run lint:fix     # ESLint auto-fix
```

**Single test:**
```bash
npm run test -- tests/unit/simple.test.ts            # Run one file
npm run test -- -t "should add numbers correctly"    # Run by name
npm run test -- --watch                              # Watch mode
npm run test -- --coverage                           # With coverage
```

## Architecture

### Electron Process Structure

```
src/main/       → Main process (Node.js): services, IPC handlers, file system
src/preload/    → IPC bridge: exposes safe APIs to renderer via contextBridge
src/renderer/   → Vue 3 SPA: UI, Pinia stores, routing
src/shared/     → Types/constants shared across processes
```

### IPC Communication Pattern

All renderer→main communication goes through a single channel `'msg'`. The renderer calls `window.electron.sendMsg({ name: MessageName.X, data, type })`, which invokes `ipcMain.handle('msg')`. The main process dispatches to `handlers[name](data)` using a `MessageName`-keyed object.

Main→renderer pushes are sent via `win.webContents.send('reply-msg', message)` and received with `window.electron.onReplyMsg(cb)` registered in the renderer.

```
Renderer sendMsg() → ipcMain.handle('msg') → handlers[MessageName.X](data)
                                                       ↓
Renderer onReplyMsg(cb) ← win.webContents.send('reply-msg', msg)
```

### Adding a New IPC Handler

1. Add a value to `MessageName` enum in **both** `src/main/common.types.ts` and `src/renderer/common.types.ts` (types are intentionally duplicated — Electron context isolation prevents cross-process imports).
2. Add a handler in `src/main/index.ts` inside the `handlers` object.
3. Call from renderer using `window.electron.sendMsg({ name: MessageName.NewAction, ... })`.

### Service Initialization

`registerService()` in `src/main/index.ts` creates services after `BrowserWindow` is ready:
- `Sniffer` — Intercepts `webContents.session.webRequest` to detect media URLs (m3u8, mp4, flv, mpd, etc.) and pushes `findM3u8` messages to the renderer.
- `DialogService` — Wraps IPC push calls to the renderer (progress updates, notifications, playlist selection).
- `M3u8Service` — Core download engine; manages the task queue, TS segment downloads, and aria2 integration.
- `ServiceContainer` — Holds references to `dialogService` and `m3u8Service`; exported as `serviceHub` for use in handlers.

### M3U8 Download Pipeline

**Task statuses:** `waiting → downloading → downloaded/failed/paused → success`

1. `downloadM3u8(data)` — Downloads and parses the `.m3u8` file. If it's a variant playlist, shows a quality picker; if it lists segments, proceeds to `downloadTS`.
2. `downloadTS(data)` — Extracts base URL and encryption key, then chooses an engine:
   - **Aria2** (preferred): Batches 50 segments per RPC call, monitors via polling, supports pause/resume.
   - **Legacy** (fallback): `TaskManager` promise queue (5 concurrent downloads by default).
3. After all segments download, merges with FFmpeg (via `fluent-ffmpeg`).

Task state is persisted with **LowDB** (JSON file at app data directory). Progress updates are pushed to the renderer via `dialogService`.

## Key Conventions

### TypeScript

- Strict mode is enabled (`"strict": true`).
- Use `import type` for type-only imports — enforced by ESLint (`ts/consistent-type-imports: warn`).
- Path alias `@` resolves to `src/` (vitest); `@render` → `src/renderer`, `@main` → `src/main` (vite).

### Vue Components

All components use `<script setup lang="ts">`. No Options API.

```vue
<script setup lang="ts">
import type { TaskItem } from '../common.types'

const store = useTaskStore()         // Pinia store
const items = ref<TaskItem[]>([])
const filtered = computed(() => items.value.filter(...))
</script>
```

Vue composables (`ref`, `computed`, `watch`, `onMounted`, etc.) are **auto-imported** via `unplugin-auto-import` — no explicit imports needed in `.vue` files.

### Pinia Stores (`src/renderer/stores/index.ts`)

Stores use the Composition API style (factory function, not options object):

```typescript
export const useTaskStore = defineStore('tasks', () => {
  const tasks = ref<TaskItem[]>([])
  const count = computed(() => tasks.value.length)
  function addTask(task: TaskItem) { tasks.value.push(task) }
  return { tasks, count, addTask }
})
```

### Styling

UnoCSS with the Wind preset (Tailwind-compatible utility classes). Element Plus provides UI components. Avoid inline styles; use UnoCSS classes.

### Logging

- Development: `console.log/error` (allowed by ESLint — `no-console: off`).
- Production: `electron-log` (`Logger.info`, `Logger.error`) for persistent log files.

### File Naming

| Type | Convention | Example |
|------|-----------|---------|
| Vue components/pages | PascalCase | `Tasks.vue`, `HlsPlayer.vue` |
| Composables | camelCase | `ipc.ts`, `toast.ts` |
| Services/Classes | PascalCase | `DialogService`, `M3u8Service` |
| Utility modules | kebab-case | `folder-utils.ts`, `id-generator.ts` |
| Tests | `*.test.ts` | `m3u8-parser.service.test.ts` |

### Testing

Tests live in `tests/unit/`. Use Vitest globals (`describe`, `it`, `expect`) — no imports needed. Test environment is Node (not jsdom). Setup file: `tests/setup.ts`.
