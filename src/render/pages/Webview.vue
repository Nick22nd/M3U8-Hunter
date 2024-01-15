<script setup lang="ts">
import type { Ref } from 'vue'
import { onBeforeMount, onMounted, onUnmounted, ref } from 'vue'
import { Search } from 'lucide-vue-next'
import TopBar from '../components/TopBar.vue'

const url = ref('')
type webviewType = Electron.WebviewTag | null
const webview = ref(null) as Ref<webviewType>
onMounted(() => {
  console.log('mounted')
  url.value = localStorage.getItem('lastUrl')
  webview.value.addEventListener('dom-ready', () => {
    console.log('dom-ready')
    // webview.value.openDevTools()
  })
  webview.value.addEventListener('new-window', (e: any) => {
    console.log('new-window', e)
    const protocol = (new URL(e.url)).protocol
    if (protocol === 'http:' || protocol === 'https:')
      webview.value.loadURL(e.url)
  })
  const navigateEvent = (e) => {
    url.value = e.url
  }
  webview.value.addEventListener('will-navigate', navigateEvent)
  webview.value.addEventListener('did-navigate', navigateEvent)
})
onUnmounted(() => {
  localStorage.setItem('lastUrl', url.value)
})
onBeforeMount(
  () => {
    console.log('before mount')
  },

)
function openDevTool() {
  if (webview.value.isDevToolsOpened())
    webview.value.closeDevTools()

  else
    webview.value.openDevTools()
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
    </TopBar>
    <webview ref="webview" :src="url" class="flex-1 w-full" />
  </div>
</template>

<style scoped></style>
