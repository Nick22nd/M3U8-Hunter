<script setup lang="ts">
import { ref, watch } from 'vue'
import { ElDialog, ElInput, ElMessage } from 'element-plus'
import type { MediaMessage, TaskItem } from '../common.types'

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
  if (val) {
    taskName.value = props.pageTitle
  }
})

watch(dialogVisible, (val) => {
  emit('update:modelValue', val)
})

async function handleConfirm() {
  if (!taskName.value.trim()) {
    ElMessage.warning('Please input task name')
    return
  }

  try {
    loading.value = true
    const ogData = await getOgData()
    const newTask: TaskItem = {
      status: 'downloading',
      from: (window as any).url?.value || '',
      title: props.pageTitle,
      name: taskName.value,
      taskId: '',
      createdAt: Date.now(),
      ...props.task,
      og: ogData,
    }
    emit('confirm', newTask)
    ElMessage({
      type: 'success',
      message: `Task created: ${taskName.value}`,
    })
  }
  catch (error) {
    console.error('Download error:', error)
    ElMessage.error('Failed to create task')
  }
  finally {
    loading.value = false
    dialogVisible.value = false
  }
}

function handleCancel() {
  dialogVisible.value = false
  emit('update:modelValue', false)
  ElMessage.info('Download canceled')
}

async function getOgData() {
  try {
    const ogData = {
      title: props.pageTitle,
      image: '',
      description: '',
    }
    return ogData
  }
  catch (error) {
    console.error('Failed to get og data:', error)
    return {
      title: props.pageTitle,
      image: '',
      description: '',
    }
  }
}
</script>

<template>
  <ElDialog
    v-model="dialogVisible"
    title="Download Task"
    width="500px"
    :close-on-click-modal="false"
    :close-on-press-escape="true"
  >
    <div class="p-4">
      <el-form label-position="top">
        <el-form-item label="Task Name">
          <ElInput
            v-model="taskName"
            placeholder="Please input task name"
            :disabled="loading"
            clearable
          />
        </el-form-item>
      </el-form>
    </div>
    <template #footer>
      <el-button :disabled="loading" @click="handleCancel">
        Cancel
      </el-button>
      <el-button type="primary" :loading="loading" @click="handleConfirm">
        Download
      </el-button>
    </template>
  </ElDialog>
</template>

<style scoped>
.p-4 {
  padding: 20px;
}
</style>
