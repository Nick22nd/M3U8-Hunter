<script setup lang="ts">
import type { Message4Renderer } from '../common.types'
import { toast } from '../composables/toast'
import { MessageName } from '../common.types'

interface Aria2Config {
  host: string
  port: number
  secret: string
  concurrent: number
  enabled: boolean
}

const { sendMsg: sendMsgToMainProcess } = window.electron

const aria2Config = ref<Aria2Config>({
  host: '127.0.0.1',
  port: 6800,
  secret: '',
  concurrent: 5,
  enabled: true,
})

const aria2Status = ref<any>(null)
const aria2Running = ref(false)
const savingConfig = ref(false)

function openDir() {
  const newMessage: Message4Renderer = {
    name: MessageName.openLog,
    data: '',
    type: 'openLog',
  }
  sendMsgToMainProcess(newMessage)
}

function setAppDir() {
  const newMessage: Message4Renderer = {
    name: MessageName.setAppDataDir,
    data: '',
    type: '',
  }
  sendMsgToMainProcess(newMessage)
}

function openAppDir() {
  const newMessage: Message4Renderer = {
    name: MessageName.openAppDir,
    data: '',
    type: '',
  }
  sendMsgToMainProcess(newMessage)
}

function getAria2Config() {
  const newMessage: Message4Renderer = {
    name: MessageName.getAria2Config,
    data: '',
    type: 'getAria2Config',
  }
  sendMsgToMainProcess(newMessage)
}

async function setAria2Config(showMessage = true) {
  savingConfig.value = true
  const newMessage: Message4Renderer = {
    name: MessageName.setAria2Config,
    data: aria2Config.value,
    type: 'setAria2Config',
  }
  await sendMsgToMainProcess(newMessage)
  savingConfig.value = false
  if (showMessage)
    toast.success('Aria2 配置已保存')
}

async function startAria2() {
  const newMessage: Message4Renderer = {
    name: MessageName.startAria2,
    data: '',
    type: 'startAria2',
  }
  sendMsgToMainProcess(newMessage)
}

async function stopAria2() {
  const newMessage: Message4Renderer = {
    name: MessageName.stopAria2,
    data: '',
    type: 'stopAria2',
  }
  sendMsgToMainProcess(newMessage)
}

function getAria2Status() {
  const newMessage: Message4Renderer = {
    name: MessageName.getAria2Status,
    data: '',
    type: 'getAria2Status',
  }
  sendMsgToMainProcess(newMessage)
}

const connectionSummary = computed(() => [
  {
    label: '连接地址',
    value: `${aria2Config.value.host}:${aria2Config.value.port}`,
  },
  {
    label: '下载并发',
    value: `${aria2Config.value.concurrent} 任务`,
  },
  {
    label: '运行状态',
    value: aria2Running.value ? '运行中' : '未启动',
  },
])

const quickActions = [
  {
    text: '打开日志目录',
    desc: '查看运行日志和错误信息',
    func: openDir,
  },
  {
    text: '打开应用目录',
    desc: '浏览应用数据与缓存位置',
    func: openAppDir,
  },
  {
    text: '重设应用目录',
    desc: '切换下载与数据保存位置',
    func: setAppDir,
  },
]

// Listen for IPC messages
onMounted(() => {
  getAria2Config()
  getAria2Status()

  window.electron.onReplyMsg((message: Message4Renderer) => {
    if (message.type === 'aria2') {
      switch (message.name) {
        case MessageName.getAria2Config:
          aria2Config.value = message.data
          break
        case MessageName.startAria2:
          aria2Running.value = message.data.running
          getAria2Status()
          break
        case MessageName.stopAria2:
          aria2Running.value = message.data.running
          aria2Status.value = null
          break
        case MessageName.getAria2Status:
          aria2Running.value = message.data.running
          aria2Status.value = message.data.status
          break
      }
    }
  })
})
</script>

<template>
  <div class="flex flex-col gap-5 p-5 h-full overflow-y-auto">
    <!-- Hero -->
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-lg font-semibold text-gray-800 dark:text-gray-100 m-0">
          下载体验设置
        </h2>
        <p class="text-sm text-gray-400 mt-1">
          集中管理 Aria2、应用目录和运行状态。
        </p>
      </div>
      <button
        type="button"
        :disabled="savingConfig"
        class="px-4 py-2 text-sm bg-blue-500 text-white rounded-xl hover:bg-blue-600 disabled:opacity-40 transition-colors flex items-center gap-2"
        @click="setAria2Config()"
      >
        <svg v-if="savingConfig" class="animate-spin" width="14" height="14" fill="none" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" /><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
        保存当前配置
      </button>
    </div>

    <!-- Summary cards -->
    <div class="grid grid-cols-3 gap-3">
      <div
        v-for="item in connectionSummary"
        :key="item.label"
        class="rounded-2xl border border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 p-4"
      >
        <div class="text-xs text-gray-400 mb-2">
          {{ item.label }}
        </div>
        <div class="text-lg font-semibold text-gray-800 dark:text-gray-100">
          {{ item.value }}
        </div>
      </div>
    </div>

    <!-- Main grid -->
    <div class="grid grid-cols-2 gap-4">
      <!-- Quick actions -->
      <div class="rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div class="mb-4">
          <div class="font-semibold text-gray-800 dark:text-gray-100">
            应用目录与日志
          </div>
          <div class="text-sm text-gray-400 mt-1">
            常用目录操作集中在一个区域。
          </div>
        </div>
        <div class="flex flex-col divide-y divide-gray-50 dark:divide-gray-800">
          <div v-for="item in quickActions" :key="item.text" class="flex items-center justify-between py-3">
            <div>
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                {{ item.text }}
              </div>
              <div class="text-xs text-gray-400 mt-0.5">
                {{ item.desc }}
              </div>
            </div>
            <button
              type="button"
              class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors dark:text-gray-300"
              @click="item.func"
            >
              执行
            </button>
          </div>
        </div>
      </div>

      <!-- Aria2 config -->
      <div class="rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
        <div class="flex items-center justify-between mb-5">
          <div>
            <div class="font-semibold text-gray-800 dark:text-gray-100">
              Aria2 配置
            </div>
            <div class="text-sm text-gray-400 mt-1">
              推荐先确认 RPC 地址和并发数。
            </div>
          </div>
          <span
            class="px-2 py-0.5 rounded-full text-xs font-medium"
            :class="aria2Running ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'"
          >{{ aria2Running ? '运行中' : '未启动' }}</span>
        </div>

        <div class="flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div>
              <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
                启用 Aria2
              </div>
              <div class="text-xs text-gray-400 mt-0.5">
                启用后优先使用 Aria2 下载引擎。
              </div>
            </div>
            <button
              type="button" role="switch" :aria-checked="aria2Config.enabled"
              class="relative inline-flex w-10 h-5 rounded-full transition-colors focus:outline-none"
              :class="aria2Config.enabled ? 'bg-blue-500' : 'bg-gray-200 dark:bg-gray-700'"
              @click="aria2Config.enabled = !aria2Config.enabled"
            >
              <span
                class="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform"
                :class="aria2Config.enabled ? 'translate-x-5' : 'translate-x-0'"
              />
            </button>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-400">RPC Host</label>
              <input
                v-model="aria2Config.host" type="text" placeholder="127.0.0.1"
                class="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
            </div>
            <div class="flex flex-col gap-1">
              <label class="text-xs text-gray-400">RPC Port</label>
              <input
                v-model.number="aria2Config.port" type="number" min="1" max="65535"
                class="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
              >
            </div>
          </div>

          <div class="flex flex-col gap-1">
            <label class="text-xs text-gray-400">RPC Secret</label>
            <input
              v-model="aria2Config.secret" type="password" placeholder="可选"
              class="px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
          </div>

          <div class="flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <label class="text-xs text-gray-400">并发下载数</label>
              <span class="text-xs font-semibold text-blue-500">{{ aria2Config.concurrent }}</span>
            </div>
            <input
              v-model.number="aria2Config.concurrent" type="range" min="1" max="16"
              class="w-full accent-blue-500"
            >
            <div class="flex justify-between text-xs text-gray-400">
              <span>1</span><span>16</span>
            </div>
          </div>

          <div class="flex gap-2 flex-wrap pt-1">
            <button
              type="button" :disabled="aria2Running"
              class="px-3 py-1.5 text-xs rounded-lg bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-40 transition-colors"
              @click="startAria2"
            >
              启动 Aria2
            </button>
            <button
              type="button" :disabled="!aria2Running"
              class="px-3 py-1.5 text-xs rounded-lg bg-red-500 text-white hover:bg-red-600 disabled:opacity-40 transition-colors"
              @click="stopAria2"
            >
              停止 Aria2
            </button>
            <button
              type="button" :disabled="!aria2Running"
              class="px-3 py-1.5 text-xs rounded-lg border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40 transition-colors dark:text-gray-300"
              @click="getAria2Status"
            >
              刷新状态
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Status -->
    <div class="rounded-2xl border border-gray-100 dark:border-gray-800 p-5">
      <div class="font-semibold text-gray-800 dark:text-gray-100 mb-1">
        实时状态
      </div>
      <div class="text-sm text-gray-400 mb-4">
        用于快速判断当前下载引擎的可用性。
      </div>
      <div v-if="aria2Running">
        <div class="text-sm text-green-600 dark:text-green-400 mb-3">
          Aria2 当前已连接并可用
        </div>
        <div v-if="aria2Status" class="flex flex-wrap gap-2">
          <span class="px-3 py-1.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 dark:text-gray-300">Active: {{ aria2Status.numActive }}</span>
          <span class="px-3 py-1.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 dark:text-gray-300">Waiting: {{ aria2Status.numWaiting }}</span>
          <span class="px-3 py-1.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 dark:text-gray-300">Stopped: {{ aria2Status.numStopped }}</span>
          <span class="px-3 py-1.5 text-xs rounded-full bg-gray-100 dark:bg-gray-800 dark:text-gray-300">Speed: {{ (Number(aria2Status.downloadSpeed) / 1024).toFixed(2) }} KB/s</span>
        </div>
      </div>
      <div v-else class="text-sm text-gray-500">
        Aria2 未运行，系统将按当前配置回退到其他下载方式。
      </div>
    </div>
  </div>
</template>

<style scoped>
@media (max-width: 1024px) {
  .grid { grid-template-columns: 1fr !important; }
}
</style>
