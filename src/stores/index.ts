import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { FindedResource, TaskItem } from "../common.types"

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
type ServerConfig = {
    ip: string,
    port: number,
}
export const useTaskStore = defineStore('tasks', () => {
    const activeTab = ref('Tasks')
    const playUrl = ref('')
    const playerTitle = ref('')
    const tasks = ref<TaskItem[]>([])
    const tasksCount = computed(() => tasks.value.length)
    const task2webviewUrl = ref('');
    const serverConfig = ref<ServerConfig>({
        ip: 'localhost',
        port: 3000
    })
    const urlPrefix = computed(() => 'http://' + serverConfig.value.ip + ':' + serverConfig.value.port + '/')

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
    function switchTab(tab: string) {
        activeTab.value = tab
        console.log('activeTab', activeTab.value, playUrl.value)
    }
    return { activeTab, tasks, tasksCount, playUrl, task2webviewUrl, urlPrefix, playerTitle, serverConfig, addTask, deleteTask, getTasks, switchTab }
})
