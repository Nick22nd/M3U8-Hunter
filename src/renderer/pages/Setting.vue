<script setup lang="ts">
import { ElMessage } from 'element-plus'
import type { Message4Renderer } from '../common.types'
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
    ElMessage.success('Aria2 配置已保存')
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
  <div class="setting-page">
    <section class="setting-hero">
      <div>
        <h2>下载体验设置</h2>
        <p>集中管理 Aria2、应用目录和运行状态，减少频繁切换和误操作。</p>
      </div>
      <el-button type="primary" :loading="savingConfig" @click="setAria2Config()">
        保存当前配置
      </el-button>
    </section>

    <section class="summary-grid">
      <div v-for="item in connectionSummary" :key="item.label" class="summary-card">
        <span class="summary-label">{{ item.label }}</span>
        <strong class="summary-value">{{ item.value }}</strong>
      </div>
    </section>

    <section class="setting-grid">
      <el-card shadow="hover" class="setting-card">
        <template #header>
          <div class="card-header">
            <div>
              <strong>应用目录与日志</strong>
              <p>常用目录操作集中在一个区域，方便排查问题与切换数据位置。</p>
            </div>
          </div>
        </template>
        <div class="action-list">
          <div
            v-for="item in quickActions" :key="item.text"
            class="action-row"
          >
            <div>
              <div class="action-title">
                {{ item.text }}
              </div>
              <div class="action-desc">
                {{ item.desc }}
              </div>
            </div>
            <el-button @click="item.func">
              执行
            </el-button>
          </div>
        </div>
      </el-card>

      <el-card shadow="hover" class="setting-card">
        <template #header>
          <div class="card-header">
            <div>
              <strong>Aria2 配置</strong>
              <p>推荐先确认 RPC 地址和并发数，再按需启停服务。</p>
            </div>
            <el-tag :type="aria2Running ? 'success' : 'info'">
              {{ aria2Running ? '运行中' : '未启动' }}
            </el-tag>
          </div>
        </template>

        <div class="config-grid">
          <div class="config-row config-row--full">
            <div>
              <div class="action-title">
                启用 Aria2
              </div>
              <div class="action-desc">
                启用后优先使用 Aria2 下载引擎处理任务。
              </div>
            </div>
            <el-switch v-model="aria2Config.enabled" />
          </div>

          <div class="config-row">
            <span>RPC Host</span>
            <el-input v-model="aria2Config.host" placeholder="127.0.0.1" />
          </div>

          <div class="config-row">
            <span>RPC Port</span>
            <el-input-number v-model="aria2Config.port" :min="1" :max="65535" class="w-full" />
          </div>

          <div class="config-row config-row--full">
            <span>RPC Secret</span>
            <el-input v-model="aria2Config.secret" type="password" show-password placeholder="可选" />
          </div>

          <div class="config-row config-row--full">
            <span>Concurrent Downloads</span>
            <el-slider v-model="aria2Config.concurrent" :min="1" :max="16" show-input />
          </div>
        </div>

        <div class="button-row">
          <el-button type="primary" :disabled="aria2Running" @click="startAria2">
            启动 Aria2
          </el-button>
          <el-button type="danger" :disabled="!aria2Running" @click="stopAria2">
            停止 Aria2
          </el-button>
          <el-button :disabled="!aria2Running" @click="getAria2Status">
            刷新状态
          </el-button>
        </div>
      </el-card>
    </section>

    <el-card shadow="never" class="status-card">
      <template #header>
        <div class="card-header">
          <div>
            <strong>实时状态</strong>
            <p>用于快速判断当前下载引擎的可用性。</p>
          </div>
        </div>
      </template>

      <div v-if="aria2Running" class="status-info">
        <el-text type="success">
          Aria2 当前已连接并可用
        </el-text>
        <div v-if="aria2Status" class="status-details">
          <div class="status-pill">
            Active: {{ aria2Status.numActive }}
          </div>
          <div class="status-pill">
            Waiting: {{ aria2Status.numWaiting }}
          </div>
          <div class="status-pill">
            Stopped: {{ aria2Status.numStopped }}
          </div>
          <div class="status-pill">
            Speed: {{ (Number(aria2Status.downloadSpeed) / 1024).toFixed(2) }} KB/s
          </div>
        </div>
      </div>
      <div v-else class="status-info">
        <el-text type="info">
          Aria2 未运行，系统将按当前配置回退到其他下载方式。
        </el-text>
      </div>
    </el-card>
  </div>
</template>

<style scoped>
.setting-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 20px;
}

.setting-hero,
.card-header,
.action-row,
.config-row,
.button-row,
.status-details {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.setting-hero {
  flex-wrap: wrap;
}

.setting-hero h2,
.card-header p {
  margin: 0;
}

.setting-hero p,
.card-header p,
.action-desc,
.summary-label {
  color: var(--el-text-color-secondary);
}

.summary-grid,
.setting-grid {
  display: grid;
  gap: 16px;
}

.summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.setting-grid {
  grid-template-columns: 1fr 1.2fr;
}

.summary-card,
.status-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 16px;
  padding: 16px;
  background: var(--el-bg-color-overlay);
}

.summary-value,
.action-title {
  display: block;
  font-weight: 600;
}

.summary-value {
  margin-top: 8px;
  font-size: 20px;
}

.setting-card {
  border-radius: 18px;
}

.action-list,
.status-info {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.action-row {
  padding: 12px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.action-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.config-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.config-row {
  flex-direction: column;
  align-items: flex-start;
}

.config-row--full {
  grid-column: 1 / -1;
}

.button-row,
.status-details {
  flex-wrap: wrap;
  margin-top: 16px;
}

.status-pill {
  padding: 8px 12px;
  border-radius: 999px;
  background: var(--el-fill-color-light);
}

@media (max-width: 1024px) {
  .summary-grid,
  .setting-grid,
  .config-grid {
    grid-template-columns: 1fr;
  }
}
</style>
