<script setup lang="ts">
import type { Ref } from 'vue'
import { onBeforeMount, onMounted, onUnmounted, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import TopBar from '../components/TopBar.vue'

interface MediaMessage {
  browserVideoItem: {
    headers: string
    type: string
    url: string
  }
}
const gridData = ref<Array<MediaMessage['browserVideoItem']>>([])
const { onReplyMsg } = window.electron
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
onReplyMsg((msg: string) => {
  console.log('onReplyMsg', msg)
  if (typeof msg === 'string') {
    console.log('msg is string', msg)
    return
  }
  const browserVideoItem = msg as unknown as MediaMessage
  const isDuplicated = gridData.value.some(item => item.url === browserVideoItem.browserVideoItem.url)
  if (!isDuplicated)
    gridData.value.push(browserVideoItem.browserVideoItem)
  else
    console.log('duplicated')
})
function openDevTool() {
  if (webview.value?.isDevToolsOpened())
    webview.value?.closeDevTools()

  else
    webview.value?.openDevTools()
}
const { sendMsg: sendMsgToMainProcess } = window.electron

const log = ref('')
const msg = ref('')


async function download(row: MediaMessage['browserVideoItem']) {
  try {
    console.log('download', url)
    const data = await sendMsgToMainProcess(JSON.stringify(row))
    console.log('[main]:', data)
  }
  catch (error) {
    console.error(error)
  }
}
</script>

<template>
  <div class="flex flex-col h-full">
    <TopBar :url="url">
      <el-input v-model="url" placeholder="Please input">
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
        <el-table :data="gridData" height="250">
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

<style scoped></style>
