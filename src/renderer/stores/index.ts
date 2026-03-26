import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { MessageName } from '../common.types'
import type { FindedResource, TabList, TaskItem } from '../common.types'

export const useFindedMediaStore = defineStore('FindedMedia', () => {
  const findedMediaList = ref<FindedResource[]>([])
  const findedMediaListCount = computed(() => findedMediaList.value.length)
  function clearFindResource() {
    findedMediaList.value = []
  }
  function addFindResource(resource: FindedResource) {
    const isDuplicated = findedMediaList.value.some(item => item.url === resource.url)
    if (!isDuplicated)
      findedMediaList.value.push(resource)
    else
      console.log('duplicated')
  }

  return { findedMediaList, findedMediaListCount, clearFindResource, addFindResource }
})
interface ServerConfig {
  ip: string
  port: number
}
type TabName = (typeof TabList)[keyof typeof TabList]
export const useTaskStore = defineStore('tasks', () => {
  const activeTab = ref('Tasks')
  const playUrl = ref('')
  const playerTitle = ref('')
  const tasks = ref<TaskItem[]>([])
  const tasksCount = computed(() => tasks.value.length)
  const taskStatusCounts = computed(() => {
    return tasks.value.reduce((acc, task) => {
      const status = task.status || 'unfinished'
      acc[status] = (acc[status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
  })
  const completedTaskCount = computed(() => (taskStatusCounts.value.downloaded || 0) + (taskStatusCounts.value.success || 0))
  const activeTaskCount = computed(() => (taskStatusCounts.value.downloading || 0) + (taskStatusCounts.value.waiting || 0))
  const failedTaskCount = computed(() => (taskStatusCounts.value.failed || 0) + (taskStatusCounts.value.unfinished || 0))
  const task2webviewUrl = ref('')
  const serverConfig = ref<ServerConfig>({
    ip: 'localhost',
    port: 3000,
  })
  const urlPrefix = computed(() => `http://${serverConfig.value.ip}:${serverConfig.value.port}/`)

  function addTask(task: TaskItem) {
    tasks.value.push(task)
  }
  function deleteTask(task: TaskItem) {
    const index = tasks.value.findIndex(item => item.url === task.url)
    if (index > -1)
      tasks.value.splice(index, 1)
  }
  function getTasks() {
    return tasks.value
  }
  function loadTasks() {
    // 主进程 getTasks 通过 reply-msg 推送数据，App.vue 的 onReplyMsg 负责更新 tasks
    // 这里只需触发 IPC 消息即可，不需要等待返回值
    return window.electron.sendMsg({
      name: MessageName.getTasks,
      data: null,
      type: 'getTasks',
    })
  }
  function switchTab(tab: TabName) {
    activeTab.value = tab
    console.log('activeTab', activeTab.value, playUrl.value)
  }
  return {
    activeTab,
    tasks,
    tasksCount,
    taskStatusCounts,
    completedTaskCount,
    activeTaskCount,
    failedTaskCount,
    playUrl,
    task2webviewUrl,
    urlPrefix,
    playerTitle,
    serverConfig,
    addTask,
    deleteTask,
    getTasks,
    loadTasks,
    switchTab,
  }
})
