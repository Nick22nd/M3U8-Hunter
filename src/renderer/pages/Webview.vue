<script setup lang="ts">
import type { Ref } from 'vue'
import { onMounted, ref, toRaw, watch } from 'vue'
import { ArrowLeft, ArrowRight, RefreshCw, Search, X } from 'lucide-vue-next'
import { useStorage } from '@vueuse/core'
import DownloadDialog from '../components/DownloadDialog.vue'
import type { TaskItem } from '../common.types'
import { MessageName } from '../common.types'
import { useFindedMediaStore, useTaskStore } from '../stores/'
import { toast } from '../composables/toast'

const { clearFindResource } = useFindedMediaStore()
const findedMediaStore = useFindedMediaStore()
const canGoBack = ref(false)
const canGoForward = ref(false)
const domReady = ref(false)
const downloadDialogVisible = ref(false)
const selectedTask = ref<MediaMessage | null>(null)
const { sendMsg: sendMsgToMainProcess } = window.electron
const taskStore = useTaskStore()
const url = ref('')
interface HistoryRecord {
  [key: string]: number
}
const history = useStorage('history', [], localStorage) as Ref<string[]>
const historyRecord = useStorage('historyRecord', {}, localStorage) as Ref<HistoryRecord>
type webviewType = Electron.WebviewTag | null
const webview = ref(null) as Ref<webviewType>
const inputUrl = ref('')
const mediaListVisible = ref(false)

watch(() => taskStore.task2webviewUrl, (newUrl, oldUrl) => {
  console.log('new: ', newUrl, 'old: ', oldUrl)
  urlChange(newUrl)
})

interface MediaMessage {
  headers: {
    [key: string]: string
  }
  type: string
  url: string
}

async function handleConfirm(task: TaskItem) {
  try {
    const enrichedTask: TaskItem = {
      ...task,
      from: url.value,
      title: webview.value?.getTitle() || task.title,
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

function download(row: MediaMessage) {
  console.log('download', url, row)
  selectedTask.value = row
  downloadDialogVisible.value = true
}

function writeClipboard(row: MediaMessage) {
  const rowRaw = toRaw(row)
  navigator.clipboard.writeText(rowRaw.url)
  toast.success('已复制链接')
}

function openDevTool() {
  if (webview.value?.isDevToolsOpened())
    webview.value?.closeDevTools()
  else
    webview.value?.openDevTools()
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
  if (Object.keys(historyRecord.value).length === 0) {
    historyRecord.value = history.value.reduce((acc, cur) => {
      acc[cur] = 1
      return acc
    }, {} as HistoryRecord)
  }
  url.value = history.value.at(-1) || ''
  inputUrl.value = url.value
  webview.value?.addEventListener('dom-ready', () => {
    console.log('dom-ready')
    webview.value?.openDevTools()
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
    webview.value?.executeJavaScript(`
      Array.from(document.querySelectorAll('meta')).map(meta => ({
        name: meta.getAttribute('name'),
        property: meta.getAttribute('property'),
        content: meta.getAttribute('content')
      }))
    `).then((metaData) => {
      console.log('Meta data:', metaData)
    }).catch((error) => {
      console.error('Error getting meta data:', error)
    })
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
    canGoBack.value = webview.value?.canGoBack() || false
    canGoForward.value = webview.value?.canGoForward() || false
    clearFindResource()
    if (!historyRecord.value[e.url])
      historyRecord.value[e.url] = 1
    else
      historyRecord.value[e.url] += 1
  })
  webview.value?.addEventListener('dom-ready', () => {
    console.log('dom-ready')
    domReady.value = true
  })
  webview.value?.addEventListener('did-start-loading', () => {
    domReady.value = false
  })
})
onActivated(() => {
  console.log('activated webview')
})
function urlChange(val: string | number) {
  console.log('urlChange', val)
  url.value = val as string
  webview.value?.loadURL(val as string)
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
        <select
          class="appearance-none px-2 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-gray-300 max-w-28 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-400"
          @change="(e) => urlChange((e.target as HTMLSelectElement).value)"
        >
          <option value="" disabled selected>
            历史
          </option>
          <option v-for="item in [...history].reverse().slice(0, 30)" :key="item" :value="item" :title="item">
            {{ item.length > 30 ? `${item.slice(0, 30)}…` : item }}
            {{ item.length > 30 ? `${item.slice(0, 30)}…` : item }}
          </option>
        </select>
      </div>
    </div>

    <!-- Webview -->
    <webview ref="webview" :src="url" class="flex-1 w-full" allowpopups />

    <!-- DevTools button -->
    <button
      type="button"
      class="fixed bottom-4 right-4 px-3 py-1.5 text-xs rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors z-20"
      @click="openDevTool"
    >
      DevTools
    </button>

    <!-- Found M3U8 badge -->
    <button
      type="button"
      class="fixed bottom-4 left-4 z-20 flex items-center gap-2 px-3 py-2 rounded-xl bg-white dark:bg-gray-900 border shadow-lg text-sm transition-colors"
      :class="findedMediaStore.findedMediaListCount > 0 ? 'border-blue-400 text-blue-500' : 'border-gray-200 dark:border-gray-700 text-gray-400'"
      @click="mediaListVisible = !mediaListVisible"
    >
      <span
        v-if="findedMediaStore.findedMediaListCount > 0"
        class="w-4 h-4 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center font-bold leading-none"
      >{{ findedMediaStore.findedMediaListCount }}</span>
      <span>{{ findedMediaStore.findedMediaListCount > 0 ? `发现 ${findedMediaStore.findedMediaListCount} 个 M3U8` : '未发现 M3U8' }}</span>
    </button>

    <!-- Media list panel -->
    <div
      v-if="mediaListVisible"
      class="fixed bottom-16 left-4 z-30 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-800 w-96 max-h-72 flex flex-col overflow-hidden"
    >
      <div class="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-gray-800 shrink-0">
        <span class="text-sm font-semibold text-gray-800 dark:text-gray-100">发现的 M3U8</span>
        <button type="button" class="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200" @click="mediaListVisible = false">
          <X :size="14" />
        </button>
      </div>
      <div class="overflow-y-auto flex-1">
        <div
          v-for="(row, idx) in findedMediaStore.findedMediaList"
          :key="row.url"
          class="flex items-center gap-2 px-4 py-2.5 border-b border-gray-50 dark:border-gray-800/60 last:border-0 hover:bg-gray-50 dark:hover:bg-gray-800/50"
        >
          <span class="text-xs text-gray-400 w-5 shrink-0">{{ idx + 1 }}</span>
          <span class="text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 px-1.5 py-0.5 rounded shrink-0">{{ row.type }}</span>
          <span class="text-xs truncate text-gray-600 dark:text-gray-300 flex-1 min-w-0" :title="row.url">{{ row.url }}</span>
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
      :page-title="webview?.getTitle() || ''"
      @confirm="handleConfirm"
    />
  </div>
</template>

<style scoped></style>
