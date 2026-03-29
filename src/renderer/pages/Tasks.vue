<script setup lang="ts">
import { ref, toRaw } from 'vue'
import { AlertCircle, Check, FolderClosed, Link, Pause, Play, RefreshCw, Search, Trash, Youtube } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import type { Message4Renderer, TaskItem } from '../common.types'
import { MessageName, TabList } from '../common.types'
import { useTaskStore } from '../stores'
import { toast } from '../composables/toast'

const router = useRouter()
const { sendMsg: sendMsgToMainProcess } = window.electron
const taskStore = useTaskStore()
const multipleSelection = ref<TaskItem[]>([])
const search = ref('')
const activeStatus = ref<'all' | TaskItem['status']>('all')
const migrating = ref(false)
const loadingTasks = ref(false)

// ── inline modals ─────────────────────────────────
const confirmState = ref<{ visible: boolean, task: TaskItem | null }>({ visible: false, task: null })
const promptState = ref<{ visible: boolean, task: TaskItem | null, url: string }>({ visible: false, task: null, url: '' })

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

function getStatusColor(status: TaskItem['status']) {
  if (status === 'downloaded' || status === 'success')
    return 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400'
  if (status === 'failed')
    return 'bg-red-100 text-red-600 dark:bg-red-900/40 dark:text-red-400'
  if (status === 'paused' || status === 'unfinished')
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400'
  if (status === 'downloading')
    return 'bg-blue-100 text-blue-600 dark:bg-blue-900/40 dark:text-blue-500'
  return 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400'
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
    toast.success('任务列表已刷新')
  }
  catch (error) {
    toast.error(`刷新失败: ${(error as Error).message}`)
  }
  finally {
    loadingTasks.value = false
  }
}

function toggleSelect(task: TaskItem) {
  const idx = multipleSelection.value.findIndex(t => t.taskId === task.taskId)
  if (idx === -1)
    multipleSelection.value.push(task)
  else
    multipleSelection.value.splice(idx, 1)
}

function toggleSelectAll() {
  if (multipleSelection.value.length === filterTableData.value.length)
    multipleSelection.value = []
  else
    multipleSelection.value = [...filterTableData.value]
}

function deleteItem(task: TaskItem) {
  confirmState.value = { visible: true, task }
}

function doDelete() {
  if (!confirmState.value.task)
    return
  const num = taskStore.tasks.findIndex(item => item.taskId === confirmState.value.task!.taskId)
  sendMsgToMainProcess({ name: MessageName.deleteTask, data: num, type: 'deteteTask' })
  confirmState.value = { visible: false, task: null }
}

function openDir(task: TaskItem) {
  sendMsgToMainProcess({ name: MessageName.openDir, data: task.directory, type: 'openDir' })
}
function playTask(task: TaskItem) {
  // eslint-disable-next-line ts/ban-ts-comment
  // @ts-expect-error
  const splitSymbol = window.navigator?.userAgentData.platform === 'Windows' ? '\\' : '/'
  const fileName = new URL(task.url).pathname.split('/').pop()
  console.log('fileName', fileName)
  taskStore.playUrl = `${taskStore.urlPrefix + task.directory?.split(splitSymbol).pop()}/${fileName}`
  taskStore.currentTaskId = task.taskId
  taskStore.playerTitle = task.title || 'player'
  taskStore.switchTab(TabList.Player)
  router.push({ path: '/player', query: { from: 'tasks' } })
}

function openLink(task: TaskItem) {
  if (task.from) {
    navigator.clipboard.writeText(task.from)
    taskStore.task2webviewUrl = task.from
    taskStore.switchTab(TabList.Explore)
    router.push({ path: '/webview', query: { from: 'tasks' } })
  }
}
function restart(task: TaskItem) {
  promptState.value = { visible: true, task, url: task.url }
}

function doRestart() {
  if (!promptState.value.task || !promptState.value.url.trim()) {
    toast.warning('请输入有效的 m3u8 地址')
    return
  }
  const newTask = { ...toRaw(promptState.value.task), url: promptState.value.url.trim() }
  sendMsgToMainProcess({ name: MessageName.downloadM3u8, data: newTask, type: 'download' })
  promptState.value = { visible: false, task: null, url: '' }
  toast.success('已重新开始下载')
}
function pauseTask(task: TaskItem) {
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
    const result = await window.ipcRenderer.invoke('msg', {
      name: MessageName.migrateTasks,
      data: null,
    })

    if (result.success) {
      toast.success(result.message || '迁移完成', 5000)
      // Refresh task list
      await taskStore.loadTasks()
    }
    else {
      toast.error(result.message || '迁移失败', 5000)
    }
  }
  catch (error) {
    toast.error(`迁移出错: ${(error as Error).message}`, 5000)
  }
  finally {
    migrating.value = false
  }
}
</script>

<template>
  <div class="flex flex-col gap-4 h-full p-4 overflow-hidden box-border">
    <!-- Overview cards -->
    <section class="grid grid-cols-4 gap-3 shrink-0">
      <button
        v-for="card in taskSummaryCards"
        :key="card.key"
        type="button"
        class="rounded-2xl border p-4 text-left transition-all cursor-pointer hover:-translate-y-0.5 hover:shadow-lg"
        :class="[
          activeStatus === card.key
            ? 'border-blue-400 shadow-md shadow-blue-500/10'
            : 'border-gray-200 dark:border-gray-800',
          card.tone === 'primary' ? 'bg-gradient-to-br from-blue-50/60 dark:from-blue-950/30' : '',
          card.tone === 'warning' ? 'bg-gradient-to-br from-amber-50/60 dark:from-amber-950/30' : '',
          card.tone === 'success' ? 'bg-gradient-to-br from-green-50/60 dark:from-green-950/30' : '',
          card.tone === 'danger' ? 'bg-gradient-to-br from-red-50/60 dark:from-red-950/30' : '',
        ]"
        @click="setStatusFilter(card.key as 'all' | TaskItem['status'])"
      >
        <div class="flex items-center justify-between mb-3 text-xs text-gray-500 dark:text-gray-400">
          <span>{{ card.label }}</span>
          <span class="px-1.5 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 font-mono">{{ card.value }}</span>
        </div>
        <div class="text-3xl font-bold text-gray-800 dark:text-gray-100 mb-1">
          {{ card.value }}
        </div>
        <div class="text-xs text-gray-400">
          {{ card.description }}
        </div>
      </button>
    </section>

    <!-- Toolbar -->
    <div class="flex items-center justify-between gap-3 shrink-0 flex-wrap">
      <div class="flex items-center gap-2 flex-wrap">
        <div class="relative">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" :size="14" />
          <input
            v-model="search"
            type="text"
            placeholder="搜索标题、名称或来源地址"
            class="pl-8 pr-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 w-72"
          >
        </div>
        <button
          type="button"
          :disabled="!hasFilters"
          class="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors dark:text-gray-300"
          @click="clearFilters"
        >
          清空筛选
        </button>
        <button
          type="button"
          :disabled="loadingTasks"
          class="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors dark:text-gray-300 flex items-center gap-1.5"
          @click="refreshTasks"
        >
          <RefreshCw :class="loadingTasks ? 'animate-spin' : ''" :size="13" />
          刷新列表
        </button>
        <button
          type="button"
          :disabled="migrating"
          class="px-3 py-2 text-sm rounded-xl bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors flex items-center gap-1.5"
          @click="handleMigrate"
        >
          <RefreshCw v-if="migrating" class="animate-spin" :size="13" />
          迁移历史任务
        </button>
      </div>
      <div class="flex items-center gap-3 text-xs text-gray-400">
        <span>显示 {{ filterTableData.length }} / {{ taskStore.tasksCount }} 项</span>
        <span v-if="multipleSelection.length" class="text-blue-500">已选 {{ multipleSelection.length }} 项</span>
      </div>
    </div>

    <!-- Empty state -->
    <div
      v-if="!filterTableData.length"
      class="flex-1 flex flex-col items-center justify-center gap-4 border border-dashed border-gray-200 dark:border-gray-700 rounded-2xl"
    >
      <div class="text-4xl">
        📭
      </div>
      <div class="text-center">
        <div class="font-semibold text-gray-700 dark:text-gray-300 mb-1">
          {{ taskStore.tasksCount ? '当前筛选条件下暂无结果' : '还没有任何下载任务' }}
        </div>
        <div class="text-sm text-gray-400">
          {{ taskStore.tasksCount ? '可以尝试切换状态、清空搜索词后再查看。' : '去 Explore 页面抓取 m3u8，或从历史任务执行迁移。' }}
        </div>
      </div>
      <button
        type="button"
        class="px-4 py-2 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 transition-colors"
        @click="router.push('/webview')"
      >
        前往 Explore
      </button>
    </div>

    <!-- Task list table -->
    <div v-else class="flex-1 overflow-y-auto min-h-0 rounded-2xl border border-gray-100 dark:border-gray-800">
      <!-- Header -->
      <div class="sticky top-0 grid grid-cols-[32px_90px_100px_1fr_170px] gap-2 px-3 py-2.5 bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 text-xs text-gray-400 font-medium z-10">
        <div class="flex items-center justify-center">
          <input
            type="checkbox"
            class="rounded cursor-pointer"
            :checked="multipleSelection.length === filterTableData.length && filterTableData.length > 0"
            @change="toggleSelectAll"
          >
        </div>
        <div>进度</div>
        <div>状态</div>
        <div>标题</div>
        <div>操作</div>
      </div>

      <!-- Rows -->
      <div
        v-for="task in filterTableData"
        :key="task.taskId"
        class="grid grid-cols-[32px_90px_100px_1fr_170px] gap-2 px-3 py-3 border-b border-gray-50 dark:border-gray-800/60 hover:bg-gray-50/70 dark:hover:bg-gray-900/60 transition-colors items-center"
        :class="selectedTaskIds.has(task.taskId) ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''"
      >
        <div class="flex items-center justify-center">
          <input
            type="checkbox"
            class="rounded cursor-pointer"
            :checked="selectedTaskIds.has(task.taskId)"
            @change="toggleSelect(task)"
          >
        </div>
        <!-- Progress -->
        <div class="flex flex-col gap-0.5 min-w-0">
          <span class="text-xs text-gray-500 dark:text-gray-400">{{ task.durationStr || '—' }}</span>
          <div v-if="task.progress && task.progress.includes('%')" class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1 my-0.5">
            <div class="h-1 rounded-full bg-blue-500 transition-all" :style="{ width: task.progress }" />
          </div>
          <span class="text-xs text-gray-400">{{ task.progress || '等待中' }}</span>
        </div>
        <!-- Status -->
        <div>
          <span
            class="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium"
            :class="getStatusColor(task.status)"
          >{{ task.status }}</span>
        </div>
        <!-- Title -->
        <div class="flex flex-col min-w-0 overflow-hidden">
          <span class="text-sm truncate text-gray-800 dark:text-gray-200" :title="task.title || task.name">
            {{ task.title || task.name || '未命名任务' }}
          </span>
          <span class="text-xs truncate text-gray-400" :title="task.from || task.url">
            {{ task.from || task.url }}
          </span>
        </div>
        <!-- Actions -->
        <div class="flex items-center gap-0.5 flex-wrap">
          <button
            v-if="['paused', 'unfinished', 'failed'].includes(task.status)"
            type="button" title="恢复下载"
            class="p-1.5 rounded-lg text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
            @click="resumeTask(task)"
          >
            <Play :size="14" />
          </button>
          <button
            v-if="task.status === 'downloading'"
            type="button" title="暂停任务"
            class="p-1.5 rounded-lg text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
            @click="pauseTask(task)"
          >
            <Pause :size="14" />
          </button>
          <span
            v-if="task.status === 'downloaded'"
            title="已完成"
            class="p-1.5 text-green-500"
          ><Check :size="14" /></span>
          <button
            type="button" title="删除任务"
            class="p-1.5 rounded-lg text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
            @click="deleteItem(task)"
          >
            <Trash :size="14" />
          </button>
          <button
            type="button" title="打开目录"
            class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            @click="openDir(task)"
          >
            <FolderClosed :size="14" />
          </button>
          <button
            type="button" title="播放"
            class="p-1.5 rounded-lg text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/30 transition-colors"
            @click="playTask(task)"
          >
            <Youtube :size="14" />
          </button>
          <button
            type="button" title="回到来源页"
            class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            @click="openLink(task)"
          >
            <Link :size="14" />
          </button>
          <button
            type="button" title="重新下载"
            class="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            @click="restart(task)"
          >
            <RefreshCw :size="14" />
          </button>
        </div>
      </div>
    </div>

    <!-- Failed tip -->
    <div
      v-if="activeStatus === 'failed' && filterTableData.length"
      class="shrink-0 inline-flex items-center gap-2 px-3 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 text-sm"
    >
      <AlertCircle :size="14" />
      <span>建议优先处理失败或暂停任务，避免分片与原始链接失效。</span>
    </div>

    <!-- Delete confirm modal -->
    <div
      v-if="confirmState.visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="confirmState.visible = false"
    >
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-6">
        <h3 class="text-base font-semibold mb-2 text-gray-800 dark:text-gray-100">
          确认删除
        </h3>
        <p class="text-sm text-gray-500 dark:text-gray-400 mb-6">
          确定要删除任务 <strong>{{ confirmState.task?.name || confirmState.task?.title }}</strong> 及其文件吗？
        </p>
        <div class="flex justify-end gap-3">
          <button type="button" class="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" @click="confirmState.visible = false">
            取消
          </button>
          <button type="button" class="px-4 py-2 rounded-xl text-sm bg-red-500 text-white hover:bg-red-600 transition-colors" @click="doDelete">
            确认删除
          </button>
        </div>
      </div>
    </div>

    <!-- Restart URL prompt modal -->
    <div
      v-if="promptState.visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      @click.self="promptState.visible = false"
    >
      <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
        <h3 class="text-base font-semibold mb-2 text-gray-800 dark:text-gray-100">
          重新下载
        </h3>
        <p class="text-sm text-gray-400 mb-3">
          输入新的 m3u8 地址：
        </p>
        <input
          v-model="promptState.url"
          type="text"
          placeholder="https://..."
          class="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-6"
          @keydown.enter="doRestart"
        >
        <div class="flex justify-end gap-3">
          <button type="button" class="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors" @click="promptState.visible = false">
            取消
          </button>
          <button type="button" class="px-4 py-2 rounded-xl text-sm bg-blue-500 text-white hover:bg-blue-600 transition-colors" @click="doRestart">
            确认
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 1200px) { section { grid-template-columns: repeat(2, 1fr) !important; } }
@media (max-width: 768px) { section { grid-template-columns: 1fr !important; } }
</style>
