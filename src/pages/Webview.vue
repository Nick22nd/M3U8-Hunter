<template>
  <div class="flex flex-col h-screen box-border pb-4">
    <TopBar :url="url">
      <el-input v-model="url" placeholder="Please input URL">
        <template #prefix>
          <el-icon class="el-input__icon">
            <Search />
          </el-icon>
        </template>
      </el-input>
      <el-button class="fixed bottom-0 right-0" @click="openDevTool">
        open dev
      </el-button>
      <el-popover placement="right" :width="400" trigger="click">
        <template #reference>
          <el-button class="fixed bottom-0 left-0">
            Click to activate
          </el-button>
        </template>
        <el-table :data="mediaTasks" height="250">
          <el-table-column type="index" width="50" />
          <el-table-column :show-overflow-tooltip="true" class="truncate" width="150" property="headers"
            label="headers" />
          <el-table-column width="100" property="type" label="type" />
          <el-table-column :show-overflow-tooltip="true" class="truncate" width="300" property="url" label="url" />
          <el-table-column fixed="right" label="Operations" width="120">
            <template #default="scope">
              <el-button link type="primary" size="small" @click.prevent="download(scope.row)">
                download
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-popover>
    </TopBar>
    <webview ref="webview" :src="url" class="flex-1 w-full" preload="./preload.js" />
  </div>
</template>
<script setup lang="ts">
import type { Ref } from 'vue'
import { onBeforeMount, onMounted, onUnmounted, ref, toRaw } from 'vue'
import { Search } from 'lucide-vue-next'
import TopBar from '../components/TopBar.vue'
import { Message4Renderer, MessageName } from '../../common/common.types';

interface MediaMessage {
  headers: string
  type: string
  url: string
}
interface propsTask {
  mediaTasks: MediaMessage[]
}

defineProps<propsTask>()
function openDevTool() {
  if (webview.value?.isDevToolsOpened())
    webview.value?.closeDevTools()

  else
    webview.value?.openDevTools()
}
const { sendMsg: sendMsgToMainProcess } = window.electron
const url = ref('')
type webviewType = Electron.WebviewTag | null
const webview = ref(null) as Ref<webviewType>
onMounted(() => {
  console.log('mounted')
  url.value = localStorage.getItem('lastUrl') || ''
  webview.value?.addEventListener('dom-ready', () => {
    console.log('dom-ready')
    // webview.value?.openDevTools()
  })
  webview.value?.addEventListener('new-window', (e: any) => {
    console.log('new-window', e)
    const protocol = (new URL(e.url)).protocol
    if (protocol === 'http:' || protocol === 'https:')
      webview.value?.loadURL(e.url)
  })
  const navigateEvent = (e: { url: string; }) => {
    url.value = e.url
    const list = localStorage.getItem('lastUrls') || '[]'
    const parseList = JSON.parse(list) as string[];
    localStorage.setItem('lastUrls', JSON.stringify([...parseList, e.url]))
  }
  webview.value?.addEventListener('will-navigate', navigateEvent)
  webview.value?.addEventListener('did-navigate', navigateEvent)
})
onUnmounted(() => {
  localStorage.setItem('lastUrl', url.value)
})
onBeforeMount(
  () => {
    console.log('before mount')
  },

)

async function download(row: MediaMessage) {
  try {
    const rowRaw = toRaw(row)
    console.log('download', url, row)
    const dowloadItem: Message4Renderer = {
      name: MessageName.downloadM3u8,
      data: rowRaw,
      type: 'download'
    }
    const data = await sendMsgToMainProcess(dowloadItem)
    console.log('[main]:', data)
  }
  catch (error) {
    console.error(error)
  }
}
</script>
<style scoped></style>
