<script setup lang="ts">
import { ref, toRaw } from 'vue'
import { ElMessage, ElMessageBox, ElTable } from 'element-plus'
import { AlertCircle, Check, FolderClosed, Link, Pause, Play, RefreshCw, Search, Trash, Youtube } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
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
const activeStatus = ref<'all' | TaskItem['status']>('all')
const tableRef = ref<null | InstanceType<typeof ElTable>>(null)
const scrollTop = ref(0)
const migrating = ref(false)
const loadingTasks = ref(false)

const taskSummaryCards = computed(() => [
  {
    key: 'all',
    label: '全部任务',
    value: taskStore.tasksCount,
    tone: 'primary',
    description: '所有下载记录',
  },
  {
    key: 'downloading',
    label: '进行中',
    value: taskStore.activeTaskCount,
    tone: 'warning',
    description: '正在执行或等待中',
  },
  {
    key: 'downloaded',
    label: '已完成',
    value: taskStore.completedTaskCount,
    tone: 'success',
    description: '可直接播放或打开目录',
  },
  {
    key: 'failed',
    label: '待处理',
    value: taskStore.failedTaskCount,
    tone: 'danger',
    description: '失败、暂停或未完成',
  },
])

const selectedTaskIds = computed(() => new Set(multipleSelection.value.map(item => item.taskId)))

const filteredTasksByStatus = computed(() => {
  if (activeStatus.value === 'all')
    return taskStore.tasks

  if (activeStatus.value === 'failed')
    return taskStore.tasks.filter(task => ['failed', 'paused', 'unfinished'].includes(task.status))

  if (activeStatus.value === 'downloaded')
    return taskStore.tasks.filter(task => ['downloaded', 'success'].includes(task.status))

  if (activeStatus.value === 'downloading')
    return taskStore.tasks.filter(task => ['downloading', 'waiting'].includes(task.status))

  return taskStore.tasks.filter(task => task.status === activeStatus.value)
})

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
  filteredTasksByStatus.value.filter(
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

const hasFilters = computed(() => search.value.trim().length > 0 || activeStatus.value !== 'all')

function getStatusType(status: TaskItem['status']) {
  if (status === 'downloaded' || status === 'success')
    return 'success'
  if (status === 'failed')
    return 'danger'
  if (status === 'paused' || status === 'unfinished')
    return 'warning'
  return 'info'
}

function formatTaskCount(count: number) {
  return `${count} 项`
}

function setStatusFilter(status: 'all' | TaskItem['status']) {
  activeStatus.value = status
}

function clearFilters() {
  search.value = ''
  activeStatus.value = 'all'
}

async function refreshTasks() {
  try {
    loadingTasks.value = true
    await taskStore.loadTasks()
    ElMessage.success('任务列表已刷新')
  }
  catch (error) {
    ElMessage.error(`刷新失败: ${(error as Error).message}`)
  }
  finally {
    loadingTasks.value = false
  }
}

function rowClassName({ row }: { row: TaskItem }) {
  return selectedTaskIds.value.has(row.taskId) ? 'task-row-selected' : ''
}

function handleSelectionChange(val: TaskItem[]) {
  multipleSelection.value = val
  console.log('multipleSelection', val)
}

function deleteItem(task: TaskItem) {
  console.log('handleClick', multipleSelection.value)
  console.log('handleClick', toRaw(task))

  const num = taskStore.tasks.findIndex(item => item.taskId === task.taskId)
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

async function handleMigrate() {
  try {
    migrating.value = true
    const result = await window.electron.ipcRenderer.invoke('msg', {
      name: MessageName.migrateTasks,
      data: null,
    })

    if (result.success) {
      ElMessage({
        type: 'success',
        message: result.message || 'Migration completed',
        duration: 5000,
      })
      // Refresh task list
      await taskStore.loadTasks()
    }
    else {
      ElMessage({
        type: 'error',
        message: result.message || 'Migration failed',
        duration: 5000,
      })
    }
  }
  catch (error) {
    ElMessage({
      type: 'error',
      message: `Migration error: ${(error as Error).message}`,
      duration: 5000,
    })
  }
  finally {
    migrating.value = false
  }
}
</script>

<template>
  <div class="task-page">
    <section class="task-overview">
      <button
        v-for="card in taskSummaryCards"
        :key="card.key"
        type="button"
        class="overview-card"
        :class="[`overview-card--${card.tone}`, { 'overview-card--active': activeStatus === card.key }]"
        @click="setStatusFilter(card.key as 'all' | TaskItem['status'])"
      >
        <div class="overview-card__header">
          <span>{{ card.label }}</span>
          <el-tag size="small" :type="card.tone === 'danger' ? 'danger' : card.tone === 'success' ? 'success' : card.tone === 'warning' ? 'warning' : 'primary'">
            {{ formatTaskCount(card.value) }}
          </el-tag>
        </div>
        <strong class="overview-card__value">{{ card.value }}</strong>
        <span class="overview-card__desc">{{ card.description }}</span>
      </button>
    </section>

    <section class="task-toolbar">
      <div class="toolbar-main">
        <el-input v-model="search" size="large" placeholder="搜索标题、名称或来源地址" clearable class="toolbar-search">
          <template #prefix>
            <el-icon>
              <Search />
            </el-icon>
          </template>
        </el-input>
        <el-button plain :disabled="!hasFilters" @click="clearFilters">
          清空筛选
        </el-button>
        <el-button :loading="loadingTasks" @click="refreshTasks">
          刷新列表
        </el-button>
        <el-button
          type="primary"
          :loading="migrating"
          @click="handleMigrate"
        >
          迁移历史任务
        </el-button>
      </div>
      <div class="toolbar-meta">
        <el-text type="info">
          当前显示 {{ filterTableData.length }} / {{ taskStore.tasksCount }} 项
        </el-text>
        <el-text v-if="multipleSelection.length" type="primary">
          已选 {{ multipleSelection.length }} 项
        </el-text>
      </div>
    </section>

    <el-empty
      v-if="!filterTableData.length"
      :image-size="120"
      description="还没有匹配的下载任务"
      class="task-empty"
    >
      <template #description>
        <div class="task-empty__content">
          <strong>{{ taskStore.tasksCount ? '当前筛选条件下暂无结果' : '还没有任何下载任务' }}</strong>
          <span>{{ taskStore.tasksCount ? '可以尝试切换状态、清空搜索词后再查看。' : '去 Explore 页面抓取 m3u8，或从历史任务执行迁移。' }}</span>
        </div>
      </template>
      <el-button type="primary" @click="router.push('/webview')">
        前往 Explore
      </el-button>
    </el-empty>

    <ElTable
      v-else
      ref="tableRef"
      :data="filterTableData"
      max-height="calc(100vh - 240px)"
      :row-class-name="rowClassName"
      @selection-change="handleSelectionChange"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column label="Progress" width="100">
        <template #default="scope">
          <div class="flex flex-col justify-center gap-1">
            <el-text class="mx-1">
              {{ scope.row.durationStr }}
            </el-text>
            <el-progress
              v-if="scope.row.progress && scope.row.progress.includes('%')"
              :stroke-width="6"
              :percentage="Number.parseFloat(scope.row.progress) || 0"
              :show-text="false"
            />
            <el-text class="mx-1" size="small" type="info">
              {{ scope.row.progress || '等待中' }}
            </el-text>
          </div>
        </template>
      </el-table-column>
      <el-table-column property="status" label="Status" width="100">
        <template #default="scope">
          <el-tag :type="getStatusType(scope.row.status)">
            {{ scope.row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column property="title" label="Title" width="400" class="truncate">
        <template #default="scope">
          <div class="task-title-cell">
            <el-text class="truncate task-title" :title="scope.row.title || scope.row.name">
              {{ scope.row.title || scope.row.name || '未命名任务' }}
            </el-text>
            <el-text class="task-subtitle" size="small" type="info" :title="scope.row.from || scope.row.url">
              {{ scope.row.from || scope.row.url }}
            </el-text>
          </div>
        </template>
      </el-table-column>
      <el-table-column fixed="right" label="Operations" min-width="180">
        <template #default="scope">
          <div class="flex justify-start items-center flex-wrap gap-1">
            <div class="m-r-3">
              <el-tooltip content="恢复下载" placement="top">
                <el-button
                  v-if="['paused', 'unfinished', 'failed'].includes(scope.row.status)" link type="primary"
                  size="small" @click="resumeTask(scope.row)"
                >
                  <Play title="start" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="暂停任务" placement="top">
                <el-button
                  v-if="scope.row.status === 'downloading'" link type="primary" size="small"
                  title="pause" @click="pauseTask(scope.row)"
                >
                  <Pause title="pause" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="已完成" placement="top">
                <el-button v-if="scope.row.status === 'downloaded'" link type="success" size="small">
                  <Check title="ok" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除任务" placement="top">
                <el-button link type="danger" size="small" title="delete" @click="deleteItem(scope.row)">
                  <Trash title="delete" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="打开目录" placement="top">
                <el-button link type="primary" size="small" title="open fold" @click="openDir(scope.row)">
                  <FolderClosed title="open dir" />
                </el-button>
              </el-tooltip>
            </div>
            <div class="flex items-center gap-1">
              <el-tooltip content="播放" placement="top">
                <el-button link type="primary" size="small" title="play" @click="playTask(scope.row)">
                  <Youtube title="play" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="回到来源页" placement="top">
                <el-button link type="primary" size="small" title="link" @click="openLink(scope.row)">
                  <Link title="link" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="重新下载" placement="top">
                <el-button link type="primary" size="small" title="restart" @click="restart(scope.row)">
                  <RefreshCw title="restart" />
                </el-button>
              </el-tooltip>
            </div>
          </div>
        </template>
      </el-table-column>
    </ElTable>

    <div v-if="activeStatus === 'failed' && filterTableData.length" class="task-tip">
      <AlertCircle :size="16" />
      <span>建议优先处理失败或暂停任务，避免分片与原始链接失效。</span>
    </div>
  </div>
</template>

<style scoped>
.task-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
}

.task-overview {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 12px;
}

.overview-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 16px;
  background: var(--el-bg-color-overlay);
  padding: 16px;
  text-align: left;
  transition: all 0.2s ease;
  cursor: pointer;
}

.overview-card:hover,
.overview-card--active {
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgb(15 23 42 / 8%);
  border-color: var(--el-color-primary-light-5);
}

.overview-card--primary {
  background: linear-gradient(135deg, rgb(64 158 255 / 10%), transparent 70%);
}

.overview-card--warning {
  background: linear-gradient(135deg, rgb(230 162 60 / 10%), transparent 70%);
}

.overview-card--success {
  background: linear-gradient(135deg, rgb(103 194 58 / 10%), transparent 70%);
}

.overview-card--danger {
  background: linear-gradient(135deg, rgb(245 108 108 / 10%), transparent 70%);
}

.overview-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  color: var(--el-text-color-secondary);
}

.overview-card__value {
  display: block;
  margin: 14px 0 6px;
  font-size: 28px;
  line-height: 1;
}

.overview-card__desc {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.task-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-main {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.toolbar-search {
  width: min(420px, 60vw);
}

.toolbar-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.task-empty {
  flex: 1;
  border: 1px dashed var(--el-border-color);
  border-radius: 18px;
  background: var(--el-fill-color-blank);
}

.task-empty__content {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.task-title-cell {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.task-title {
  justify-content: flex-start;
}

.task-subtitle {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.task-tip {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  align-self: flex-start;
  padding: 10px 12px;
  border-radius: 12px;
  background: rgb(230 162 60 / 10%);
  color: var(--el-color-warning-dark-2);
}

:deep(.task-row-selected) {
  --el-table-tr-bg-color: color-mix(in srgb, var(--el-color-primary) 8%, transparent);
}

@media (max-width: 1200px) {
  .task-overview {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .task-overview {
    grid-template-columns: 1fr;
  }

  .toolbar-search {
    width: 100%;
  }
}
</style>
