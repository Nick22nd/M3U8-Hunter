<script setup lang="ts">
import { onMounted, ref } from 'vue'
import type { TabPaneName } from 'element-plus'
import { ElNotification } from 'element-plus'
import { Film, Globe, Info, ListChecks, Settings } from 'lucide-vue-next'
import { useDark, useToggle } from '@vueuse/core'
import { Moon, Sunny } from '@element-plus/icons-vue'
import About from './pages/About.vue'
import Home from './pages/Home.vue'
import Tasks from './pages/Tasks.vue'
import WebviewVue from './pages/Webview.vue'
import type { MediaMessage, Message4Renderer, TaskItem } from './common.types'
import { MessageName, TabList } from './common.types'
import { useFindedMediaStore, useTaskStore } from './stores/'
import Setting from './pages/Setting.vue'

const tabs = [
  {
    label: 'Tasks',
    component: Tasks,
    icon: ListChecks,
  },
  {
    label: 'Player',
    component: Home,
    icon: Film,
  },
  {
    label: 'Explore',
    component: WebviewVue,
    icon: Globe,
  },
  {
    label: 'Setting',
    component: Setting,
    icon: Settings,
  },
  {
    label: 'About',
    component: About,
    icon: Info,
  },
]
const taskStore = useTaskStore()
const tabPosition = 'left'
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

const isDark = useDark()
const toggleDark = useToggle(isDark)

const { sendMsg: sendMsgToMainProcess, onReplyMsg } = window.electron
onMounted(() => {
  console.log('mounted')
  sendMsgToMainProcess({ name: MessageName.getTasks })
  sendMsgToMainProcess({ name: MessageName.getServerConfig })
  onReplyMsg((msg: Message4Renderer) => {
    const { data } = msg
    // console.log('onReplyMsg', msg)
    if (msg.name === MessageName.getTasks) {
      taskStore.tasks = msg.data.tasks || []
    }
    else if (msg.name === MessageName.findM3u8) {
      // console.log('findM3u8', data)
      const singleData = data as unknown as MediaMessage
      store.addFindResource(singleData.browserVideoItem)
    }
    else if (msg.name === MessageName.getServerConfig) {
      taskStore.serverConfig = msg.data
    }
    else if (msg.name === MessageName.getPlaylist) {
      playlists.value = msg.data.playlists
      waitingTask.value = msg.data.task
      centerDialogVisible.value = true
    }
    else if (msg.name === MessageName.getNotification) {
      const { title, message } = msg.data
      ElNotification({
        title,
        message,
        // duration: 0,
      })
    }
  })
})
function changeTabs(name: TabPaneName) {
  console.log('changeTabs', name)
  if (name === TabList.Tasks)
    sendMsgToMainProcess({ name: MessageName.getTasks })
}
async function dowloadTS() {
  centerDialogVisible.value = false
  if (waitingTask.value) {
    if (selectedUrl.value.startsWith('http')) {
      waitingTask.value.url = selectedUrl.value
    }
    else {
      const url = waitingTask.value.url
      const rawURL = new URL(url)
      const listURI = rawURL.pathname.split('/').pop()
      const baserawURL = url.substring(0, url.indexOf(listURI ?? ''))
      waitingTask.value.url = `${baserawURL}${selectedUrl.value}`
    }
  }
  else {
    console.error('waitingTask is undefined')
    return
  }
  const oldTask = toRaw(waitingTask.value)
  const newTask: TaskItem = {
    ...oldTask,
  }
  console.log('dowts,', newTask, oldTask)
  const dowloadItem: Message4Renderer = {
    name: MessageName.downloadM3u8,
    data: newTask,
    type: 'download',
  }
  await sendMsgToMainProcess(dowloadItem)
}
</script>

<template>
  <el-container class="h-screen">
    <el-tabs
      v-model:model-value="taskStore.activeTab" type="border-card" :tab-position="tabPosition"
      class="w-full demo-tabs" @tab-change="changeTabs"
    >
      <el-tab-pane v-for="tab of tabs" :key="tab.label" :label="tab.label" :name="tab.label">
        <template #label>
          <div class="flex justify-between items-center w-20">
            <el-icon class="mr-3">
              <component :is="tab.icon" />
            </el-icon>
            <span class="flex-1 text-left">{{ tab.label }}</span>
          </div>
        </template>
        <component :is="tab.component" />
      </el-tab-pane>
    </el-tabs>
    <el-dialog v-model="centerDialogVisible" title="Warning" width="500" center>
      <span>Task Name: {{ waitingTask?.name }}</span>
      <el-select v-model="selectedUrl" placeholder="Please select a zone">
        <el-option v-for="item of playlists" :key="item.uri" :label="getPlaylistLabel(item)" :value="item.uri" />
      </el-select>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="centerDialogVisible = false">
            Cancel
          </el-button>
          <el-button type="primary" @click="dowloadTS">
            Confirm
          </el-button>
        </div>
      </template>
    </el-dialog>
    <div class="fixed bottom-0 left-0 m-8">
      <el-switch
        v-model="isDark" inline-prompt :active-action-icon="Moon" :inactive-action-icon="Sunny"
        @change="toggleDark(isDark)"
      />
    </div>
  </el-container>
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  /* color: #2c3e50; */
}

body {
  margin: 0;
  padding: 0;
  --background-dark-color: #0d1117;
  --background-light: #fff;
  background-color: var(--background-light);
}

body.dark {
  --background-dark-color: #0d1117;
  --background-light: #fff;
  background-color: var(--background-dark-color);
}

.logo {
  width: 400px;
  border-radius: 1rem;
  box-shadow: 0 0 #0000, 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.container {
  display: flex;
  /* flex-direction: column; */
  align-items: center;
  justify-content: center;
}

.demo-tabs>.el-tabs__content {
  padding: 32px;
  /* color: #6b778c; */
  /* font-size: 32px; */
  font-weight: 600;
}

.el-tabs--right .el-tabs__content,
.el-tabs--left .el-tabs__content {
  height: 100%;
}
</style>
