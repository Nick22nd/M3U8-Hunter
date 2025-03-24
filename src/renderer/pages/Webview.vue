<script setup lang="ts">
import type { Ref } from 'vue'
import { onMounted, ref, toRaw } from 'vue'
import { ArrowLeft, ArrowRight, RefreshCw, Search, X } from 'lucide-vue-next'
import { useStorage } from '@vueuse/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import TopBar from '../components/TopBar.vue'
import type { Message4Renderer, TaskItem } from '../common.types'
import { MessageName } from '../common.types'
import { useFindedMediaStore, useTaskStore } from '../stores/'

const { clearFindResource } = useFindedMediaStore()
const findedMediaStore = useFindedMediaStore()
const canGoBack = ref(false)
const canGoForward = ref(false)
const domReady = ref(false)
const { sendMsg: sendMsgToMainProcess } = window.electron
const url = ref('')
interface HistoryRecord {
  [key: string]: number
}
const history = useStorage('history', [], localStorage) as Ref<string[]>
const historyRecord = useStorage('historyRecord', {}, localStorage) as Ref<HistoryRecord>
type webviewType = Electron.WebviewTag | null
const webview = ref(null) as Ref<webviewType>
const taskStore = useTaskStore()
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
const inputUrl = ref('')
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

    // const content = urlMetadata(null, { parseResponseObject: })
    console.log('dom-ready', webview.value?.getTitle())
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

    if (!history.value.includes(e.url)) {
      history.value.push(e.url)
    }
    else {
      // move item to last position
      const indexOfItem = history.value.indexOf(e.url)
      const lastOne = history.value.length - 1
      history.value[indexOfItem] = history.value[lastOne]
      history.value[lastOne] = e.url
    }
    clearFindResource()
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
  // webview.value?.loadURL(val as string)
}

async function download(row: MediaMessage) {
  try {
    const rowRaw = toRaw(row)
    console.log('download', url, row)

    ElMessageBox.prompt(`Please input your task name${webview.value?.getURL()}`, 'Tip', {
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      // inputPattern:
      //   /[\w!#$%&'*+/=?^_`{|}~-]+(?:\.[\w!#$%&'*+/=?^_`{|}~-]+)*@(?:[\w](?:[\w-]*[\w])?\.)+[\w](?:[\w-]*[\w])?/,
      // inputErrorMessage: 'Invalid Email',
    })
      .then(async ({ value }) => {
        ElMessage({
          type: 'success',
          message: `Your task name is:${value}`,
        })
        const defaultName = Date.now().toString()
        const newTask: TaskItem = {
          status: 'downloading',
          from: url.value,
          title: webview.value?.getTitle() || '',
          name: value || defaultName,
          ...rowRaw,
        }
        const dowloadItem: Message4Renderer = {
          name: MessageName.downloadM3u8,
          data: newTask,
          type: 'download',
        }
        const data = await sendMsgToMainProcess(dowloadItem)
        console.log('[main]:', data)
      })
      .catch(() => {
        ElMessage({
          type: 'info',
          message: 'Input canceled',
        })
      })
  }
  catch (error) {
    console.error(error)
  }
}
function writeClipboard(row: MediaMessage) {
  const rowRaw = toRaw(row)
  console.log('writeClipboard', row)
  navigator.clipboard.writeText(rowRaw.url)
  ElMessage({
    type: 'success',
    message: 'Copy success',
  })
}
</script>

<template>
  <div class="flex flex-col h-screen box-border pb-4">
    <TopBar :url="url">
      <div class="flex justify-between items-center">
        <el-icon class="px-2" @click="goBack">
          <ArrowLeft :class="{ 'text-gray-200': !canGoBack }" />
        </el-icon>
        <el-icon class="px-2" @click="goForward">
          <ArrowRight :class="{ 'text-gray-200': !canGoForward }" />
        </el-icon>
        <el-icon class="px-2" @click="refreshPage">
          <RefreshCw v-if="domReady" />
          <X v-else />
        </el-icon>
        <el-input v-model="inputUrl" placeholder="Please input URL" @change="urlChange">
          <template #prefix>
            <el-icon class="el-input__icon">
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-select v-model="url" placeholder="Select" style="width: 40px">
          <el-option v-for="item in history" :key="item" :label="item" :value="item" style="width: 240px" />
        </el-select>
      </div>
      <el-button class="fixed bottom-0 right-0" @click="openDevTool">
        open dev
      </el-button>
      <el-popover placement="right" :width="400" trigger="click">
        <template #reference>
          <div class="fixed bottom-0 left-0">
            <el-badge :value="findedMediaStore.findedMediaList.length">
              <el-button>finded m3u8</el-button>
            </el-badge>
          </div>
        </template>
        <el-table :data="findedMediaStore.findedMediaList" height="250">
          <el-table-column type="index" width="50" />
          <el-table-column width="70" property="type" label="type" />
          <el-table-column :show-overflow-tooltip="true" class="truncate" width="300" property="url" label="url" />
          <!-- <el-table-column :show-overflow-tooltip="true" class="truncate" width="150" property="headers"
            label="headers" /> -->
          <el-table-column fixed="right" label="Operations" width="150">
            <template #default="scope">
              <el-button link type="primary" size="small" @click.prevent="download(scope.row)">
                download
              </el-button>
              <el-button link type="primary" size="small" @click.prevent="writeClipboard(scope.row)">
                copy
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-popover>
    </TopBar>
    <webview ref="webview" :src="url" class="flex-1 w-full" allowpopups />
  </div>
</template>

<style scoped></style>
