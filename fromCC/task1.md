## 想要用aria2 这个npm包的rpc替换掉下载功能

The aria2 RPC integration is complete. Here's a summary of the changes:

  Implementation Summary

  New Files Created

  src/main/service/aria2.service.ts - Complete aria2 service implementation:
  - Spawns aria2 as a child process with RPC enabled
  - Manages aria2 lifecycle (start/stop)
  - Provides RPC methods for downloading files
  - Supports batch downloads for TS segments
  - Includes pause/resume/remove operations
  - Fallback to fetch API if aria2 is unavailable

  Modified Files

  1. src/main/common.types.ts - Added new IPC message types:
    - getAria2Config
    - setAria2Config
    - startAria2
    - stopAria2
    - getAria2Status
  2. src/renderer/common.types.ts - Synchronized message types
  3. src/main/index.ts - Added IPC handlers for aria2 operations
  4. src/renderer/pages/Setting.vue - Added aria2 configuration UI:
    - Enable/disable toggle
    - RPC host/port settings
    - Secret token configuration
    - Concurrent downloads setting
    - Start/stop buttons
    - Status display
  5. src/main/lib/m3u8.app.ts - Replaced download package with aria2:
    - Uses aria2 for both M3U8 and TS downloads
    - Tracks aria2 GIDs for pause/resume/delete operations
    - Monitors download progress
    - Falls back to fetch API if aria2 is unavailable

  Usage

  1. Install aria2 on your system (must be in PATH):
    - Windows: choco install aria2 or download from https://github.com/aria2/aria2/releases
    - macOS: brew install aria2
    - Linux: apt install aria2 or similar
  2. Configure aria2 in Settings page:
    - Enable/disable aria2
    - Set RPC host/port (default: 127.0.0.1:6800)
    - Set secret token (optional)
    - Set concurrent downloads
  3. Start aria2 from the Settings page (it auto-starts when enabled)
  4. Download M3U8 files - aria2 will be used automatically when available

  The implementation maintains backward compatibility - if aria2 is not available or fails, it falls back to the original download method.