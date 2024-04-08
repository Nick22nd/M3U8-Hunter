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
    <webview ref="webview" :src="url" class="flex-1 w-full" preload="./preload.js" allowpopups />
  </div>
</template>

<script setup lang="ts">
import type { Ref } from 'vue'
import { onBeforeMount, onMounted, onUnmounted, ref, toRaw } from 'vue'
import { ArrowLeft, ArrowRight, X, RefreshCw, Search } from 'lucide-vue-next'
import TopBar from '../components/TopBar.vue'
import { Message4Renderer, MessageName, TaskItem } from '../common.types';
import { useStorage } from '@vueuse/core';
import { useFindedMediaStore, useTaskStore } from '../stores/';
import { ElMessage, ElMessageBox } from 'element-plus';
const { clearFindResource } = useFindedMediaStore()
const findedMediaStore = useFindedMediaStore()
interface MediaMessage {
  headers: {
    [key: string]: string
  }
  type: string
  url: string
}
const inputUrl = ref('')
const options = ref([])
function openDevTool() {
  if (webview.value?.isDevToolsOpened())
    webview.value?.closeDevTools()

  else
    webview.value?.openDevTools()
}
function refreshPage() {
  if (domReady.value) {
    webview.value?.reload()
  } else {
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
const canGoBack = ref(false)
const canGoForward = ref(false)
const domReady = ref(false)
const { sendMsg: sendMsgToMainProcess } = window.electron
const url = ref('')
const history = useStorage('history', [], localStorage) as Ref<string[]>
type webviewType = Electron.WebviewTag | null
const webview = ref(null) as Ref<webviewType>
const taskStore = useTaskStore()
watch(() => taskStore.task2webviewUrl, (newUrl, oldUrl) => {
  console.log('new: ', newUrl, 'old: ', oldUrl)
  urlChange(newUrl)
})
onMounted(() => {
  console.log('mounted', webview.value)
  url.value = history.value.at(-1) || ''
  inputUrl.value = url.value
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
    console.log('will-navigate', e.url)
    url.value = e.url
    if (!history.value.includes(e.url)) {
      history.value.push(e.url)
    } else {
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
  })
  webview.value?.addEventListener('dom-ready', () => {
    console.log('dom-ready')
    domReady.value = true
  })
  webview.value?.addEventListener('did-start-loading', () => {
    domReady.value = false
  })
})
const urlChange = (val: string | number) => {
  console.log('urlChange', val)
  url.value = val as string
  // webview.value?.loadURL(val as string)
}


async function download(row: MediaMessage) {
  try {
    const rowRaw = toRaw(row)
    console.log('download', url, row)

    ElMessageBox.prompt('Please input your task name', 'Tip', {
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
        const defaultName = new URL(rowRaw.url).pathname.split('/').pop() || ''
        const newTask: TaskItem = {
          status: 'downloading',
          from: url.value,
          title: webview.value?.getTitle() || '',
          name: value || defaultName,
          ...rowRaw
        }
        const dowloadItem: Message4Renderer = {
          name: MessageName.downloadM3u8,
          data: newTask,
          type: 'download'
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
</script>

<style scoped></style>
