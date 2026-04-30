<script setup lang="ts">
import type { Ref } from 'vue'
import { computed, onMounted, ref, toRaw, watch } from 'vue'
import { ArrowLeft, ArrowRight, Clock3, RefreshCw, Search, X } from 'lucide-vue-next'
import { useStorage } from '@vueuse/core'
import DownloadDialog from '../components/DownloadDialog.vue'
import type { FindedResource, OGMetadata, TaskItem } from '../common.types'
import { MessageName } from '../common.types'
import { useFindedMediaStore, useTaskStore } from '../stores/'
import { toast } from '../composables/toast'

const mediaStore = useFindedMediaStore()
const { clearFindResource, setCurrentPageMeta } = mediaStore
const canGoBack = ref(false)
const canGoForward = ref(false)
const domReady = ref(false)
const downloadDialogVisible = ref(false)
const selectedTask = ref<FindedResource | null>(null)
const { sendMsg: sendMsgToMainProcess } = window.electron
const taskStore = useTaskStore()
const url = ref('')

interface HistoryRecord {
  [key: string]: number
}

interface BrowseHistoryItem {
  url: string
  title: string
  visitedAt: number
  visitCount?: number
}

const history = useStorage('history', [], localStorage) as Ref<string[]>
const historyRecord = useStorage('historyRecord', {}, localStorage) as Ref<HistoryRecord>
const browseHistory = useStorage('browse-history', [], localStorage) as Ref<BrowseHistoryItem[]>
type webviewType = Electron.WebviewTag | null
const webview = ref(null) as Ref<webviewType>
const inputUrl = ref('')
const mediaListVisible = ref(false)
const historyVisible = ref(false)

const sortedBrowseHistory = computed(() => {
  return [...browseHistory.value]
    .sort((left, right) => right.visitedAt - left.visitedAt)
    .slice(0, 30)
})

watch(() => taskStore.task2webviewUrl, (newUrl, oldUrl) => {
  console.log('new: ', newUrl, 'old: ', oldUrl)
  urlChange(newUrl)
})

function resolveMetadataImage(imageUrl: string, pageUrl: string) {
  if (!imageUrl)
    return ''
  try {
    return new URL(imageUrl, pageUrl).toString()
  }
  catch {
    return imageUrl
  }
}

function formatHistoryTime(timestamp: number) {
  if (!timestamp)
    return '刚刚'

  return new Intl.DateTimeFormat('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(timestamp)
}

function normalizeUrl(rawUrl: string) {
  return rawUrl.trim()
}

function migrateLegacyHistory() {
  if (browseHistory.value.length > 0)
    return

  const now = Date.now()
  const migratedHistory = history.value
    .filter(item => typeof item === 'string' && item.trim().length > 0)
    .map((item, index) => ({
      url: item,
      title: item,
      visitedAt: now - (history.value.length - index) * 1000,
      visitCount: historyRecord.value[item] || 1,
    }))

  if (migratedHistory.length > 0)
    browseHistory.value = migratedHistory
}

function upsertBrowseHistory(entry: { url: string, title?: string }) {
  const normalizedUrl = normalizeUrl(entry.url)
  if (!normalizedUrl)
    return

  const existingItem = browseHistory.value.find(item => item.url === normalizedUrl)
  const nextItem: BrowseHistoryItem = {
    url: normalizedUrl,
    title: entry.title?.trim() || existingItem?.title || normalizedUrl,
    visitedAt: Date.now(),
    visitCount: (existingItem?.visitCount || 0) + 1,
  }

  browseHistory.value = [
    nextItem,
    ...browseHistory.value.filter(item => item.url !== normalizedUrl),
  ].slice(0, 100)
}

function updateBrowseHistoryTitle(entry: { url: string, title?: string }) {
  const normalizedUrl = normalizeUrl(entry.url)
  if (!normalizedUrl)
    return

  const existingItem = browseHistory.value.find(item => item.url === normalizedUrl)
  if (!existingItem)
    return

  const nextTitle = entry.title?.trim()
  if (!nextTitle || nextTitle === existingItem.title)
    return

  browseHistory.value = browseHistory.value.map((item) => {
    if (item.url !== normalizedUrl)
      return item

    return {
      ...item,
      title: nextTitle,
    }
  })
}

async function syncPageMeta(pageUrl = url.value) {
  if (!webview.value || !pageUrl)
    return

  try {
    const meta = await webview.value.executeJavaScript(`(() => {
      const pick = (...selectors) => {
        for (const selector of selectors) {
          const el = document.querySelector(selector)
          const value = el?.getAttribute('content') || el?.getAttribute('href') || ''
          if (value)
            return value
        }
        return ''
      }

      return {
        title: document.title || '',
        image: pick('meta[property="og:image"]', 'meta[name="twitter:image"]', 'link[rel="apple-touch-icon"]', 'link[rel="icon"]'),
        description: pick('meta[property="og:description"]', 'meta[name="description"]', 'meta[name="twitter:description"]'),
      }
    })()`)

    const og: OGMetadata | undefined = meta?.image || meta?.description || meta?.title
      ? {
          title: meta?.title || webview.value.getTitle() || '',
          image: resolveMetadataImage(meta?.image || '', pageUrl),
          description: meta?.description || '',
        }
      : undefined

    setCurrentPageMeta({
      title: meta?.title || webview.value.getTitle() || '',
      url: pageUrl,
      og,
    })
    updateBrowseHistoryTitle({
      url: pageUrl,
      title: meta?.title || webview.value.getTitle() || pageUrl,
    })
  }
  catch (error) {
    console.error('Error getting page metadata:', error)
    setCurrentPageMeta({
      title: webview.value.getTitle() || '',
      url: pageUrl,
    })
    updateBrowseHistoryTitle({
      url: pageUrl,
      title: webview.value.getTitle() || pageUrl,
    })
  }
}

async function handleConfirm(task: TaskItem) {
  try {
    const enrichedTask: TaskItem = {
      ...task,
      from: task.from || url.value,
      title: task.title || webview.value?.getTitle() || task.title,
      headers: { ...(task.headers || {}) },
      og: task.og
        ? {
            title: task.og.title || '',
            image: task.og.image || '',
            description: task.og.description || '',
          }
        : undefined,
      tags: task.tags ? [...task.tags] : [],
    }
    const data = await sendMsgToMainProcess({
      name: MessageName.downloadM3u8,
      data: enrichedTask,
      type: 'download',
    })
    console.log('[main]:', data)
    downloadDialogVisible.value = false
    mediaListVisible.value = false
    toast.success(`已创建任务：${task.name}`)
  }
  catch (error) {
    console.error('Download error:', error)
    toast.error('创建任务失败')
    downloadDialogVisible.value = false
  }
}

function download(row: FindedResource) {
  console.log('download', url, row)
  selectedTask.value = {
    ...toRaw(row),
    headers: { ...(toRaw(row).headers || {}) },
    og: row.og
      ? {
          title: row.og.title || '',
          image: row.og.image || '',
          description: row.og.description || '',
        }
      : undefined,
    tags: row.tags ? [...row.tags] : [],
  }
  downloadDialogVisible.value = true
}

function writeClipboard(row: FindedResource) {
  const rowRaw = toRaw(row)
  navigator.clipboard.writeText(rowRaw.url)
  toast.success('已复制链接')
}

function getStreamLabel(resource: FindedResource) {
  if (resource.streamType === 'live')
    return '直播'
  if (resource.durationStr)
    return `点播 · ${resource.durationStr}`
  return '点播'
}

function getStreamTone(resource: FindedResource) {
  return resource.streamType === 'live'
    ? 'bg-red-50 text-red-600 dark:bg-red-950/30 dark:text-red-300'
    : 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300'
}

function refreshPage() {
  if (domReady.value) {
    webview.value?.reload()
  }
  else {
    webview.value?.stop()
    domReady.value = true
  }
}

function goBack() {
  webview.value?.goBack()
}

function goForward() {
  webview.value?.goForward()
}

onMounted(() => {
  console.log('mounted', webview.value)
  migrateLegacyHistory()

  url.value = browseHistory.value[0]?.url || history.value.at(-1) || ''
  inputUrl.value = url.value

  webview.value?.addEventListener('dom-ready', () => {
    console.log('dom-ready')
    // webview.value?.openDevTools()
    webview.value?.insertCSS(`
      @font-face {
        font-family: system;
        font-style: normal;
        font-weight: 300;
        src: local(".NewYork-Regular");
      }

      h1 {
        font-family: "system";
      }
    `)
    domReady.value = true
    void syncPageMeta(webview.value?.getURL() || url.value)
  })

  webview.value?.addEventListener('new-window', (e: any) => {
    console.log('new-window', e)
    const protocol = (new URL(e.url)).protocol
    if (protocol === 'http:' || protocol === 'https:')
      webview.value?.loadURL(e.url)
  })

  const navigateEvent = (e: { url: string }) => {
    console.log('will-navigate', e.url)
    url.value = e.url
  }

  webview.value?.addEventListener('will-navigate', navigateEvent)
  webview.value?.addEventListener('did-navigate', (e) => {
    console.log('did-navigate')
    url.value = e.url
    inputUrl.value = e.url
    setCurrentPageMeta({ title: '', url: e.url, og: undefined })
    canGoBack.value = webview.value?.canGoBack() || false
    canGoForward.value = webview.value?.canGoForward() || false
    clearFindResource()
    historyVisible.value = false
    if (!historyRecord.value[e.url])
      historyRecord.value[e.url] = 1
    else
      historyRecord.value[e.url] += 1

    upsertBrowseHistory({
      url: e.url,
      title: webview.value?.getTitle() || e.url,
    })
  })

  webview.value?.addEventListener('did-start-loading', () => {
    domReady.value = false
  })
})

function urlChange(val: string | number) {
  console.log('urlChange', val)
  const nextUrl = normalizeUrl(val as string)
  if (!nextUrl)
    return

  url.value = nextUrl
  inputUrl.value = nextUrl
  historyVisible.value = false
  webview.value?.loadURL(nextUrl)
}
</script>

<template>
  <div class="flex flex-col h-screen overflow-hidden">
    <!-- Navigation toolbar -->
    <div class="flex items-center gap-1.5 px-2 py-1.5 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-950 shrink-0">
      <button
        type="button" title="后退" :disabled="!canGoBack"
        class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors text-gray-500 dark:text-gray-400"
        @click="goBack"
      >
        <ArrowLeft :size="15" />
      </button>
      <button
        type="button" title="前进" :disabled="!canGoForward"
        class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-30 transition-colors text-gray-500 dark:text-gray-400"
        @click="goForward"
      >
        <ArrowRight :size="15" />
      </button>
      <button
        type="button" :title="domReady ? '刷新' : '停止加载'"
        class="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-500 dark:text-gray-400"
        @click="refreshPage"
      >
        <RefreshCw v-if="domReady" :size="15" />
        <X v-else :size="15" />
      </button>
      <div class="relative flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" :size="13" />
        <input
          v-model="inputUrl"
          type="text"
          placeholder="输入网址…"
          class="w-full pl-8 pr-3 py-1.5 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
          @keydown.enter="urlChange(inputUrl)"
        >
      </div>
      <!-- History dropdown -->
      <div class="relative">
        <button
          type="button"
          class="flex items-center gap-1.5 px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-gray-300 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
          @click="historyVisible = !historyVisible"
        >
          <Clock3 :size="13" />
          历史
        </button>
        <div
          v-if="historyVisible"
          class="absolute right-0 top-10 z-30 w-90 max-h-96 overflow-y-auto rounded-2xl border border-gray-100 bg-white p-2 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
        >
          <div v-if="sortedBrowseHistory.length === 0" class="px-3 py-8 text-center text-xs text-gray-400">
            暂无浏览历史
          </div>
          <button
            v-for="item in sortedBrowseHistory"
            :key="item.url"
            type="button"
            class="w-full rounded-xl px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            @click="urlChange(item.url)"
          >
            <div class="mb-1 truncate text-sm text-gray-700 dark:text-gray-200" :title="item.title || item.url">
              {{ item.title || item.url }}
            </div>
            <div class="truncate text-xs text-gray-400" :title="item.url">
              {{ item.url }}
            </div>
            <div class="mt-1 text-[11px] text-gray-400 flex items-center justify-between gap-2">
              <span>{{ formatHistoryTime(item.visitedAt) }}</span>
              <span>访问 {{ item.visitCount || 1 }} 次</span>
            </div>
          </button>
        </div>
      </div>
    </div>

    <!-- Webview -->
    <webview ref="webview" :src="url" class="flex-1 w-full" allowpopups />

    <!-- Found M3U8 badge -->
    <button
      type="button"
      class="fixed bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border shadow-lg text-sm transition-colors"
      :class="mediaStore.findedMediaListCount > 0 ? 'border-blue-400 text-blue-500' : 'border-gray-200 dark:border-gray-700 text-gray-400'"
      @click="mediaListVisible = !mediaListVisible"
    >
      <span
        v-if="mediaStore.findedMediaListCount > 0"
        class="w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold leading-none"
      >{{ mediaStore.findedMediaListCount }}</span>
      <span>{{ mediaStore.findedMediaListCount > 0 ? `发现 ${mediaStore.findedMediaListCount} 个媒体资源` : '未发现媒体资源' }}</span>
    </button>

    <!-- Media list panel -->
    <div
      v-if="mediaListVisible"
      class="fixed bottom-16 left-4 z-30 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-96 max-h-72 flex flex-col overflow-hidden"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">发现的媒体</span>
        <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="mediaListVisible = false">
          <X :size="14" />
        </button>
      </div>
      <div class="overflow-y-auto flex-1">
        <div
          v-for="(row, idx) in mediaStore.findedMediaList"
          :key="row.url"
          class="flex items-center gap-3 px-4 py-3 border-b border-gray-50 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          <div class="flex h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-gray-100 dark:bg-gray-800">
            <img v-if="row.og?.image" :src="row.og.image" :alt="row.title || row.name || row.url" class="h-full w-full object-cover">
            <div v-else class="flex h-full w-full items-center justify-center text-xs text-gray-400">
              {{ row.type }}
            </div>
          </div>
          <div class="min-w-0 flex-1">
            <div class="mb-1 flex items-center gap-2">
              <span class="text-xs text-gray-400 w-5 shrink-0">{{ idx + 1 }}</span>
              <span class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded shrink-0">{{ row.type }}</span>
              <span class="text-xs px-1.5 py-0.5 rounded shrink-0" :class="getStreamTone(row)">{{ getStreamLabel(row) }}</span>
            </div>
            <div class="truncate text-sm text-gray-700 dark:text-gray-200" :title="row.title || row.name || row.url">
              {{ row.title || row.name || row.url }}
            </div>
            <div class="truncate text-xs text-gray-400" :title="row.url">
              {{ row.url }}
            </div>
            <div class="mt-1 flex flex-wrap gap-1 text-[11px] text-gray-400">
              <span v-if="row.segmentCount" class="rounded-full bg-gray-100 px-2 py-0.5 dark:bg-gray-800">
                {{ row.segmentCount }} 片段
              </span>
              <span v-if="row.isLive" class="rounded-full bg-red-50 px-2 py-0.5 text-red-500 dark:bg-red-950/30 dark:text-red-300">
                持续更新
              </span>
            </div>
          </div>
          <button
            type="button"
            class="shrink-0 px-2 py-1 text-xs text-blue-500 hover:text-blue-600 rounded transition-colors"
            @click="download(row)"
          >
            下载
          </button>
          <button
            type="button"
            class="shrink-0 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded transition-colors"
            @click="writeClipboard(row)"
          >
            复制
          </button>
        </div>
      </div>
    </div>

    <DownloadDialog
      v-if="selectedTask"
      v-model="downloadDialogVisible"
      :task="{ browserVideoItem: selectedTask }"
      :page-title="selectedTask.title || selectedTask.name || webview?.getTitle() || ''"
      @confirm="handleConfirm"
    />
  </div>
</template>

<style scoped></style>
