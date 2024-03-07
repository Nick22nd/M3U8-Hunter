import { defineStore } from "pinia"
import { computed, ref } from "vue"
import { FindedResource, TaskItem } from "../../common/common.types"

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
export const useTaskStore = defineStore('tasks', () => {
    const tasks = ref<TaskItem[]>([])
    const tasksCount = computed(() => tasks.value.length)
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
    return { tasks, tasksCount, addTask, deleteTask, getTasks }
})
