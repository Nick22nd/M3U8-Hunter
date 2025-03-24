<script setup lang="ts">
import { ref, toRaw } from 'vue'
import { ElMessage, ElMessageBox, ElTable } from 'element-plus'
import { Check, FolderClosed, Link, Pause, Play, RefreshCw, Trash, Youtube } from 'lucide-vue-next'
import { useRoute, useRouter } from 'vue-router'
import type { Message4Renderer, TaskItem } from '../common.types'
import { MessageName, TabList } from '../common.types'
import { useTaskStore } from '../stores'
import { debounce } from '../util/util'

const router = useRouter()
// const route = useRoute()
const { sendMsg: sendMsgToMainProcess } = window.electron
const taskStore = useTaskStore()
const multipleSelection = ref<TaskItem[]>([])
const search = ref('')
const tableRef = ref<null | InstanceType<typeof ElTable>>(null)
const scrollTop = ref(0)
onMounted(() => {
  if (tableRef.value) {
    // console.log('table', tableRef.value)
    // console.log(tableRef.value.scrollBarRef.wrapRef)
    const scrollElement = tableRef.value.scrollBarRef.wrapRef as HTMLElement
    scrollElement.onscroll = debounce((event: Event) => {
      const target = event.target as HTMLElement
      console.log(target.scrollTop)
      scrollTop.value = target.scrollTop || 0
    })
  }
  // table.value.
})
onActivated(() => {
  console.log('activated')
  if (tableRef.value) {
    // console.log('table', tableRef.value)
    // console.log(tableRef.value.scrollBarRef.wrapRef)
    tableRef.value.setScrollTop(scrollTop.value)
  }
})
const filterTableData = computed(() =>
  taskStore.tasks.filter(
    (data) => {
      if (search.value && !!data.name) {
        return data.name.toLowerCase().includes(search.value.toLowerCase())
          || (data.from && data.from.toLocaleLowerCase().includes(search.value.toLowerCase()))
          || (data.title && data.title.toLocaleLowerCase().includes(search.value.toLowerCase()))
      }
      else {
        return true
      }
    },
  ),
)

function handleSelectionChange(val: TaskItem[]) {
  multipleSelection.value = val
  console.log('multipleSelection', val)
}

function deleteItem(task: TaskItem) {
  console.log('handleClick', multipleSelection.value)
  console.log('handleClick', toRaw(task))

  const num = taskStore.tasks.findIndex(item => item.url === task.url)
  ElMessageBox.confirm(
    'Are you sure to delete this task and files?',
    'Warning',
    {
      confirmButtonText: 'OK',
      cancelButtonText: 'Cancel',
      type: 'warning',
    },
  )
    .then(() => {
      const newMessage: Message4Renderer = {
        name: MessageName.deleteTask,
        data: num,
        type: 'deteteTask',
      }
      sendMsgToMainProcess(newMessage)
    })
    .catch(() => {
      console.log('cancel the ELMessageBox')
      // catch error
    })
}

function openDir(task: TaskItem) {
  console.log('handleClick', toRaw(task))

  const newMessage: Message4Renderer = {
    name: MessageName.openDir,
    data: task.directory,
    type: 'openDir',
  }
  sendMsgToMainProcess(newMessage)
}
function playTask(task: TaskItem) {
  console.log('handleClick', toRaw(task))
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-expect-error
  const splitSymbol = window.navigator?.userAgentData.platform === 'Windows' ? '\\' : '/'
  const fileName = new URL(task.url).pathname.split('/').pop()
  console.log('fileName', fileName)
  taskStore.playUrl = `${taskStore.urlPrefix + task.directory?.split(splitSymbol).pop()}/${fileName}`
  taskStore.playerTitle = task.title || 'player'
  taskStore.switchTab(TabList.Home)
  router.push({ path: '/home', query: { from: 'tasks' } })
}

function openLink(task: TaskItem) {
  console.log('handleClick', toRaw(task))

  if (task.from) {
    navigator.clipboard.writeText(task.from)
    taskStore.task2webviewUrl = task.from
    taskStore.switchTab(TabList.Explore)
    router.push({ path: '/webview', query: { from: 'tasks' } })
  }
}
function restart(task: TaskItem) {
  console.log('handleClick', toRaw(task))
  ElMessageBox.prompt('Please input new m3u8 url', 'Tip', {
    confirmButtonText: 'OK',
    cancelButtonText: 'Cancel',
    inputPattern:
      /https?:\/\/\S+/,
    inputErrorMessage: 'Invalid Url',
  })
    .then(({ value }) => {
      ElMessage({
        type: 'success',
        message: `Your m3u8 is:${value}`,
      })
      const newTask = {
        ...toRaw(task),
        url: value,
      }
      const newMessage: Message4Renderer = {
        name: MessageName.downloadM3u8,
        data: newTask,
        type: 'download',
      }
      sendMsgToMainProcess(newMessage)
    })
    .catch(() => {
      ElMessage({
        type: 'info',
        message: 'Input canceled',
      })
    })
}
function pauseTask(task: TaskItem) {
  console.log('handleClick', toRaw(task))
  const newTask = {
    ...toRaw(task),
    status: 'paused',
  }
  const newMessage: Message4Renderer = {
    name: MessageName.pauseTask,
    data: newTask,
    type: 'download',
  }
  sendMsgToMainProcess(newMessage)
}
function resumeTask(task: TaskItem) {
  console.log('handleClick', toRaw(task))
  const newTask = {
    ...toRaw(task),
    status: 'downloading',
  }
  const newMessage: Message4Renderer = {
    name: MessageName.resumeTask,
    data: newTask,
    type: 'download',
  }
  sendMsgToMainProcess(newMessage)
}
</script>

<template>
  <div class="h-full">
    <ElTable ref="tableRef" :data="filterTableData" max-height="95vh" @selection-change="handleSelectionChange">
      <!-- <el-table-column type="selection" width="50" /> -->
      <el-table-column label="Progress" width="100">
        <template #default="scope">
          <div class="flex flex-col justify-center">
            <el-text class="mx-1">
              {{ scope.row.durationStr }}
            </el-text>
            <el-text class="mx-1">
              {{ scope.row.progress }}
            </el-text>
          </div>
        </template>
      </el-table-column>
      <el-table-column property="status" label="Status" width="100">
        <template #default="scope">
          <el-tag v-if="scope.row.status === 'downloading'" type="info">
            {{ scope.row.status }}
          </el-tag>
          <el-tag v-else-if="scope.row.status === 'downloaded'" type="success">
            {{ scope.row.status }}
          </el-tag>
          <el-tag v-else-if="scope.row.status === 'failed'" type="danger">
            {{ scope.row.status }}
          </el-tag>
          <el-tag v-else-if="['paused', 'unfinished'].includes(scope.row.status)" type="warning">
            {{ scope.row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column property="title" label="Title" width="400" class="truncate">
        <template #default="scope">
          <el-text class="truncate" :title="scope.row.title">
            {{ scope.row.title }}
          </el-text>
        </template>
      </el-table-column>
      <el-table-column fixed="right" label="Operations" min-width="150">
        <template #header>
          <el-input v-model="search" size="small" placeholder="Type to search" clearable />
        </template>
        <template #default="scope">
          <div class="flex justify-start items-center flex-wrap">
            <div class="m-r-3">
              <el-button
                v-if="['paused', 'unfinished', 'failed'].includes(scope.row.status)" link type="primary"
                size="small" @click="resumeTask(scope.row)"
              >
                <Play title="start" />
              </el-button>
              <el-button
                v-else-if="scope.row.status === 'downloading'" link type="primary" size="small"
                title="pause" @click="pauseTask(scope.row)"
              >
                <Pause title="pause" />
              </el-button>
              <el-button v-else-if="scope.row.status === 'downloaded'" link type="primary" size="small">
                <Check title="ok" />
              </el-button>
              <el-button link type="primary" size="small" title="delete" @click="deleteItem(scope.row)">
                <Trash title="delete" />
              </el-button>
              <el-button link type="primary" size="small" title="open fold" @click="openDir(scope.row)">
                <FolderClosed title="open dir" />
              </el-button>
            </div>
            <div>
              <el-button link type="primary" size="small" title="play" @click="playTask(scope.row)">
                <Youtube title="play" />
              </el-button>
              <el-button link type="primary" size="small" title="link" @click="openLink(scope.row)">
                <Link title="link" />
              </el-button>
              <el-button link type="primary" size="small" title="restart" @click="restart(scope.row)">
                <RefreshCw title="restart" />
              </el-button>
            </div>
          </div>
        </template>
      </el-table-column>
    </ElTable>
    <div style="margin-top: 20px">
      <!-- <el-button @click="toggleSelection([tableData[1], tableData[2]])">Toggle selection status of second and third
                rows</el-button>
            <el-button @click="toggleSelection()">Clear selection</el-button> -->
    </div>
  </div>
</template>

<style scoped>

</style>
