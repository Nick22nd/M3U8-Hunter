<script setup lang="ts">
import { ref, watch } from 'vue'
import type { MediaMessage, OGMetadata, TaskItem } from '../common.types'
import { toast } from '../composables/toast'

interface Props {
  modelValue: boolean
  task: MediaMessage
  pageTitle: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', value: TaskItem): void
}>()

const dialogVisible = ref(false)
const taskName = ref('')
const loading = ref(false)

watch(() => props.modelValue, (val) => {
  dialogVisible.value = val
  if (val)
    taskName.value = props.task.browserVideoItem.name || props.pageTitle
}, { immediate: true })

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

function getOgData(): OGMetadata {
  return {
    title: props.task.browserVideoItem.og?.title || props.pageTitle,
    image: props.task.browserVideoItem.og?.image || '',
    description: props.task.browserVideoItem.og?.description || '',
  }
}

async function handleConfirm() {
  if (!taskName.value.trim()) {
    toast.warning('请输入任务名称')
    return
  }

  try {
    loading.value = true
    const newTask: TaskItem = {
      status: 'downloading',
      from: props.task.browserVideoItem.from || '',
      title: props.task.browserVideoItem.title || props.pageTitle,
      name: taskName.value,
      taskId: '',
      createdAt: Date.now(),
      url: props.task.browserVideoItem.url,
      headers: props.task.browserVideoItem.headers,
      type: props.task.browserVideoItem.type,
      og: getOgData(),
      tags: props.task.browserVideoItem.tags || [],
    }
    emit('confirm', newTask)
    toast.success(`已创建任务：${taskName.value}`)
  }
  catch (error) {
    console.error('Download error:', error)
    toast.error('创建任务失败')
  }
  finally {
    loading.value = false
    dialogVisible.value = false
  }
}

function handleCancel() {
  dialogVisible.value = false
  emit('update:modelValue', false)
}
</script>

<template>
  <div
    v-if="dialogVisible"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
    @click.self="handleCancel"
  >
    <div class="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6">
      <h3 class="text-base font-semibold mb-4 text-gray-800 dark:text-gray-100">
        创建下载任务
      </h3>
      <div v-if="props.task.browserVideoItem.og?.image" class="mb-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
        <img
          :src="props.task.browserVideoItem.og.image"
          :alt="props.task.browserVideoItem.og.title || props.pageTitle"
          class="h-40 w-full object-cover"
        >
      </div>
      <label class="text-sm text-gray-500 dark:text-gray-400 mb-1 block">任务名称</label>
      <input
        v-model="taskName"
        type="text"
        placeholder="输入任务名称…"
        :disabled="loading"
        class="w-full px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400 mb-6"
        @keydown.enter="handleConfirm"
      >
      <div v-if="props.task.browserVideoItem.tags?.length" class="mb-6 flex flex-wrap gap-2">
        <span
          v-for="tag in props.task.browserVideoItem.tags"
          :key="tag"
          class="rounded-full bg-blue-50 px-2.5 py-1 text-xs text-blue-600 dark:bg-blue-900/30 dark:text-blue-300"
        >
          #{{ tag }}
        </span>
      </div>
      <div class="flex justify-end gap-3">
        <button
          type="button"
          :disabled="loading"
          class="px-4 py-2 rounded-xl text-sm border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors"
          @click="handleCancel"
        >
          取消
        </button>
        <button
          type="button"
          :disabled="loading"
          class="px-4 py-2 rounded-xl text-sm bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors flex items-center gap-2"
          @click="handleConfirm"
        >
          <svg v-if="loading" class="animate-spin" xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
          下载
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
