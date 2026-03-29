<script setup lang="ts">
import { computed, ref } from 'vue'
import { Film, FolderClosed, Globe, PencilLine, Play, RefreshCw, Search, Tags } from 'lucide-vue-next'
import { useRouter } from 'vue-router'
import type { TaskItem } from '../common.types'
import { MessageName, TabList } from '../common.types'
import { toast } from '../composables/toast'
import { useTaskStore } from '../stores'

const router = useRouter()
const taskStore = useTaskStore()
const search = ref('')
const activeTag = ref('all')
const loading = ref(false)
const savingTags = ref(false)
const editState = ref<{ visible: boolean, task: TaskItem | null, input: string }>({
  visible: false,
  task: null,
  input: '',
})

const taskSummaryCards = computed(() => [
  { label: '媒体总数', value: taskStore.tasksCount, description: '已抓取并入库的下载任务' },
  { label: '带封面', value: taskStore.tasks.filter(task => !!task.og?.image).length, description: '已抓到页面封面信息' },
  { label: '已打标签', value: taskStore.tasks.filter(task => task.tags?.length).length, description: '支持按标签快速筛选' },
])

const allTags = computed(() => Array.from(new Set(taskStore.tasks.flatMap(task => task.tags || []))).sort((a, b) => a.localeCompare(b)))

const filteredTasks = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  return [...taskStore.tasks]
    .sort((left, right) => (right.createdAt || 0) - (left.createdAt || 0))
    .filter((task) => {
      const matchesKeyword = keyword.length === 0
        || [task.name, task.title, task.from, ...(task.tags || [])]
          .filter(Boolean)
          .some(item => item!.toLowerCase().includes(keyword))

      const matchesTag = activeTag.value === 'all' || (task.tags || []).includes(activeTag.value)
      return matchesKeyword && matchesTag
    })
})

function normalizeTags(input: string) {
  return Array.from(new Set(input.split(/[，,\n]/).map(item => item.trim()).filter(Boolean)))
}

function statusClass(status: TaskItem['status']) {
  if (['downloaded', 'success'].includes(status))
    return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300'
  if (status === 'downloading')
    return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300'
  if (status === 'waiting')
    return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
  if (status === 'paused')
    return 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300'
  return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300'
}

function formatTags(task: TaskItem) {
  return task.tags?.length ? task.tags : ['未分类']
}

async function refreshTasks() {
  try {
    loading.value = true
    await taskStore.loadTasks()
    toast.success('媒体库已刷新')
  }
  catch (error) {
    toast.error(`刷新失败: ${(error as Error).message}`)
  }
  finally {
    loading.value = false
  }
}

function openTagEditor(task: TaskItem) {
  editState.value = {
    visible: true,
    task,
    input: (task.tags || []).join(', '),
  }
}

async function saveTags() {
  if (!editState.value.task)
    return

  try {
    savingTags.value = true
    const tags = normalizeTags(editState.value.input)
    await window.electron.sendMsg({
      name: MessageName.updateTaskMetadata,
      type: 'task',
      data: {
        taskId: editState.value.task.taskId,
        updates: { tags },
      },
    })
    toast.success('标签已更新')
    editState.value = { visible: false, task: null, input: '' }
  }
  catch (error) {
    toast.error(`保存标签失败: ${(error as Error).message}`)
  }
  finally {
    savingTags.value = false
  }
}

function openDir(task: TaskItem) {
  if (!task.directory)
    return
  void window.electron.sendMsg({ name: MessageName.openDir, data: task.directory, type: 'openDir' })
}

function openSource(task: TaskItem) {
  if (!task.from)
    return
  void window.electron.sendMsg({ name: MessageName.openUrl, data: task.from, type: 'openUrl' })
}

function playTask(task: TaskItem) {
  if (!task.directory)
    return

  // @ts-expect-error userAgentData compatibility
  const splitSymbol = window.navigator?.userAgentData.platform === 'Windows' ? '\\' : '/'
  const fileName = new URL(task.url).pathname.split('/').pop()
  taskStore.playUrl = `${taskStore.urlPrefix + task.directory.split(splitSymbol).pop()}/${fileName}`
  taskStore.currentTaskId = task.taskId
  taskStore.playerTitle = task.title || task.name || 'player'
  taskStore.switchTab(TabList.Player)
  router.push({ path: '/player', query: { from: 'tasks' } })
}
</script>

<template>
  <div class="flex h-full flex-col gap-4 overflow-y-auto p-4">
    <section class="rounded-3xl border border-gray-100 bg-gradient-to-br from-blue-50 via-white to-purple-50 p-6 dark:border-gray-800 dark:from-gray-900 dark:via-gray-950 dark:to-gray-900">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div class="mb-2 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs text-blue-600 shadow-sm dark:bg-gray-900 dark:text-blue-300">
            <Film :size="14" />
            媒体管理主页
          </div>
          <h1 class="m-0 text-2xl font-bold text-gray-900 dark:text-gray-100">
            封面 + Tag 媒体库
          </h1>
          <p class="mb-0 mt-2 text-sm text-gray-500 dark:text-gray-400">
            抓流时同步保存页面封面，下载后在这里集中管理标签、来源和播放入口。
          </p>
        </div>
        <button
          type="button"
          :disabled="loading"
          class="inline-flex items-center gap-2 rounded-2xl bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
          @click="refreshTasks"
        >
          <RefreshCw :class="loading ? 'animate-spin' : ''" :size="15" />
          刷新媒体库
        </button>
      </div>
      <div class="mt-5 grid gap-3 md:grid-cols-3">
        <div
          v-for="card in taskSummaryCards"
          :key="card.label"
          class="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur dark:border-gray-800 dark:bg-gray-900/70"
        >
          <div class="text-xs text-gray-400">
            {{ card.label }}
          </div>
          <div class="mt-2 text-3xl font-bold text-gray-900 dark:text-gray-100">
            {{ card.value }}
          </div>
          <div class="mt-1 text-xs text-gray-400">
            {{ card.description }}
          </div>
        </div>
      </div>
    </section>

    <section class="flex flex-wrap items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
      <div class="relative min-w-72 flex-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" :size="15" />
        <input
          v-model="search"
          type="text"
          placeholder="搜索标题、来源或标签"
          class="w-full rounded-2xl border border-gray-200 bg-gray-50 py-2 pl-9 pr-3 text-sm outline-none transition focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
        >
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button
          type="button"
          class="rounded-full px-3 py-1.5 text-xs transition-colors"
          :class="activeTag === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
          @click="activeTag = 'all'"
        >
          全部标签
        </button>
        <button
          v-for="tag in allTags"
          :key="tag"
          type="button"
          class="rounded-full px-3 py-1.5 text-xs transition-colors"
          :class="activeTag === tag ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'"
          @click="activeTag = tag"
        >
          #{{ tag }}
        </button>
      </div>
    </section>

    <section
      v-if="filteredTasks.length === 0"
      class="flex flex-1 flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-gray-200 bg-white p-10 dark:border-gray-700 dark:bg-gray-900"
    >
      <div class="rounded-3xl bg-blue-50 p-4 text-blue-500 dark:bg-blue-900/30 dark:text-blue-300">
        <Tags :size="28" />
      </div>
      <div class="text-center">
        <div class="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {{ taskStore.tasksCount ? '当前筛选下没有媒体' : '还没有可管理的媒体任务' }}
        </div>
        <div class="mt-1 text-sm text-gray-400">
          {{ taskStore.tasksCount ? '换个关键词或标签试试。' : '去 Explore 抓取媒体，系统会自动带回封面信息。' }}
        </div>
      </div>
      <button
        type="button"
        class="rounded-2xl bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600"
        @click="router.push('/webview')"
      >
        前往 Explore
      </button>
    </section>

    <section v-else class="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="task in filteredTasks"
        :key="task.taskId"
        class="overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-gray-800 dark:bg-gray-900"
      >
        <div class="relative aspect-[16/10] overflow-hidden bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900">
          <img v-if="task.og?.image" :src="task.og.image" :alt="task.og.title || task.title || task.name || 'cover'" class="h-full w-full object-cover">
          <div v-else class="flex h-full w-full items-center justify-center">
            <Film :size="36" class="text-gray-400" />
          </div>
          <span class="absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-medium" :class="statusClass(task.status)">
            {{ task.status }}
          </span>
        </div>
        <div class="space-y-4 p-4">
          <div>
            <h3 class="m-0 line-clamp-1 text-base font-semibold text-gray-900 dark:text-gray-100">
              {{ task.title || task.name || task.url }}
            </h3>
            <p class="mt-1 line-clamp-2 text-sm text-gray-400">
              {{ task.from || task.url }}
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <span
              v-for="tag in formatTags(task)"
              :key="tag"
              class="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-500 dark:bg-gray-800 dark:text-gray-300"
            >
              #{{ tag }}
            </span>
          </div>

          <div class="grid grid-cols-2 gap-3 rounded-2xl bg-gray-50 p-3 text-xs text-gray-500 dark:bg-gray-950 dark:text-gray-400">
            <div>
              <div class="text-gray-400">
                时长
              </div>
              <div class="mt-1 text-sm text-gray-700 dark:text-gray-200">
                {{ task.durationStr || '--' }}
              </div>
            </div>
            <div>
              <div class="text-gray-400">
                进度
              </div>
              <div class="mt-1 text-sm text-gray-700 dark:text-gray-200">
                {{ task.progress || '--' }}
              </div>
            </div>
          </div>

          <div class="flex flex-wrap gap-2">
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-2xl bg-blue-500 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-600 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!task.directory"
              @click="playTask(task)"
            >
              <Play :size="14" />
              播放
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              @click="openTagEditor(task)"
            >
              <PencilLine :size="14" />
              标签
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!task.from"
              @click="openSource(task)"
            >
              <Globe :size="14" />
              来源
            </button>
            <button
              type="button"
              class="inline-flex items-center gap-1.5 rounded-2xl border border-gray-200 px-3 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!task.directory"
              @click="openDir(task)"
            >
              <FolderClosed :size="14" />
              目录
            </button>
          </div>
        </div>
      </article>
    </section>

    <div
      v-if="editState.visible"
      class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      @click.self="editState = { visible: false, task: null, input: '' }"
    >
      <div class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        <h3 class="m-0 text-base font-semibold text-gray-900 dark:text-gray-100">
          管理标签
        </h3>
        <p class="mb-4 mt-2 text-sm text-gray-400">
          使用逗号分隔多个标签，例如：综艺, 收藏, 待整理
        </p>
        <textarea
          v-model="editState.input"
          rows="4"
          class="w-full rounded-2xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none transition focus:ring-2 focus:ring-blue-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100"
          placeholder="输入标签"
        />
        <div class="mt-5 flex justify-end gap-3">
          <button
            type="button"
            class="rounded-2xl border border-gray-200 px-4 py-2 text-sm text-gray-600 transition-colors hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            @click="editState = { visible: false, task: null, input: '' }"
          >
            取消
          </button>
          <button
            type="button"
            :disabled="savingTags"
            class="rounded-2xl bg-blue-500 px-4 py-2 text-sm text-white transition-colors hover:bg-blue-600 disabled:opacity-50"
            @click="saveTags"
          >
            保存标签
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
