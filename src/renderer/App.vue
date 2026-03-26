<script setup lang="ts">
import { computed, onMounted, ref, toRaw } from 'vue'
import type { MediaMessage, Message4Renderer, TaskItem } from './common.types'
import { MessageName } from './common.types'
import { useFindedMediaStore, useTaskStore } from './stores/'
import HlsPlayer from './components/HlsPlayer.vue'
import SideBar from './components/SideBar.vue'
import ToastContainer from './components/ToastContainer.vue'
import { toast } from './composables/toast'

const taskStore = useTaskStore()
const centerDialogVisible = ref(false)
interface PlayList {
  attributes: {
    'CODECS'?: string
    'FRAME-RATE'?: number
    'RESOLUTION'?: {
      width: number
      height: number
    }
    'resolution'?: {
      width: number
      height: number
    }
    'BANDWIDTH'?: number
    'bandwidth'?: number
    'PROGRAM-ID'?: number
  }
  uri: string
  timeline: number
}
const playlists = ref<PlayList[]>([])
const selectedUrl = ref('')
const waitingTask = ref<TaskItem>()

const store = useFindedMediaStore()
function getPlaylistLabel(playlist: PlayList) {
  if (!playlist || !playlist.attributes)
    return ''
  const attr = playlist.attributes
  if (attr.BANDWIDTH)
    return `BANDWIDTH - ${attr.BANDWIDTH}`

  if (attr.bandwidth)
    return `BANDWIDTH - ${attr.BANDWIDTH}`

  if (attr.RESOLUTION)
    return `RESOLUTION - ${attr.RESOLUTION.width}x${attr.RESOLUTION.height}`

  if (attr.resolution)
    return `RESOLUTION - ${attr.resolution.width}x${attr.resolution.height}`

  return `URI - ${playlist.uri}`
}

const { sendMsg, onReplyMsg } = window.electron

// Compute a full URL for HLS preview from the selected playlist URI
const hlsPreviewUrl = computed(() => {
  if (!selectedUrl.value || !waitingTask.value)
    return ''
  if (selectedUrl.value.startsWith('http'))
    return selectedUrl.value
  if (selectedUrl.value) {
    const rawURL = new URL(waitingTask.value.url)
    const listURI = rawURL.pathname.split('/').pop()
    const base = waitingTask.value.url.substring(0, waitingTask.value.url.indexOf(listURI ?? ''))
    return `${base}${selectedUrl.value}`
  }
  return ''
})
onMounted(() => {
  sendMsg({ name: MessageName.getTasks, type: '', data: null })
  sendMsg({ name: MessageName.getServerConfig, type: '', data: null })
  onReplyMsg((msg: Message4Renderer) => {
    if (msg.name === MessageName.getTasks) {
      // msg.data is the array directly, not wrapped in { tasks: [] }
      taskStore.tasks = Array.isArray(msg.data) ? msg.data : (msg.data?.tasks || [])
    }
    else if (msg.name === MessageName.findM3u8) {
      const d = msg.data as unknown as MediaMessage
      store.addFindResource(d.browserVideoItem)
    }
    else if (msg.name === MessageName.getServerConfig) {
      taskStore.serverConfig = msg.data
    }
    else if (msg.name === MessageName.getPlaylist) {
      playlists.value = msg.data.playlists
      waitingTask.value = msg.data.task
      selectedUrl.value = ''
      centerDialogVisible.value = true
    }
    else if (msg.name === MessageName.getNotification) {
      const { title, message } = msg.data
      toast.info(`${title}: ${message}`)
    }
  })
})
async function dowloadTS() {
  if (!waitingTask.value)
    return
  centerDialogVisible.value = false
  const task: TaskItem = { ...toRaw(waitingTask.value) }
  if (selectedUrl.value.startsWith('http')) {
    task.url = selectedUrl.value
  }
  else if (selectedUrl.value) {
    const rawURL = new URL(task.url)
    const listURI = rawURL.pathname.split('/').pop()
    const base = task.url.substring(0, task.url.indexOf(listURI ?? ''))
    task.url = `${base}${selectedUrl.value}`
  }
  await sendMsg({ name: MessageName.downloadM3u8, data: task, type: 'download' })
  selectedUrl.value = ''
}
</script>

<template>
  <div class="flex h-screen overflow-hidden bg-white dark:bg-gray-950 text-gray-900 dark:text-gray-100">
    <SideBar />
    <main class="flex-1 overflow-hidden">
      <router-view v-slot="{ Component }">
        <keep-alive :include="['Webview', 'Tasks']">
          <component :is="Component" />
        </keep-alive>
      </router-view>
    </main>

    <!-- Playlist quality picker -->
    <div
      v-if="centerDialogVisible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="centerDialogVisible = false"
    >
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 p-6">
        <h3 class="text-base font-semibold mb-1 text-gray-800 dark:text-gray-100">
          选择清晰度
        </h3>
        <p class="text-sm text-gray-400 mb-4">
          {{ waitingTask?.name }}
        </p>
        <!-- HLS 预览播放器 -->
        <div v-if="selectedUrl" class="mb-4 rounded-xl overflow-hidden bg-black">
          <HlsPlayer :src="hlsPreviewUrl" />
        </div>
        <div class="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
          <button
            v-for="item in playlists"
            :key="item.uri"
            type="button"
            class="w-full text-left px-4 py-2.5 rounded-xl border text-sm transition-colors"
            :class="selectedUrl === item.uri
              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
              : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'"
            @click="selectedUrl = item.uri"
          >
            {{ getPlaylistLabel(item) }}
          </button>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            @click="centerDialogVisible = false"
          >
            取消
          </button>
          <button
            type="button"
            class="px-4 py-2 rounded-xl text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
            :disabled="!selectedUrl"
            @click="dowloadTS"
          >
            确认下载
          </button>
        </div>
      </div>
    </div>

    <ToastContainer />
  </div>
</template>

<style>
*, *::before, *::after { box-sizing: border-box; }
body {
  margin: 0;
  padding: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  -webkit-font-smoothing: antialiased;
}
</style>
