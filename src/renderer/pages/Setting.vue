<script setup lang="ts">
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

function setAria2Config() {
  const newMessage: Message4Renderer = {
    name: MessageName.setAria2Config,
    data: aria2Config.value,
    type: 'setAria2Config',
  }
  sendMsgToMainProcess(newMessage)
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

const buttonGroup = [
  {
    text: 'open log dir',
    func: openDir,
  },
  {
    text: 'open app dir',
    func: openAppDir,
  },
  {
    text: 'set app dir',
    func: setAppDir,
  },
]
</script>

<template>
  <div class="flex justify-center flex-col gap-1">
    <div
      v-for="(item) of buttonGroup" :key="item.text"
      class="flex justify-between"
    >
      <el-text>{{ item.text }}</el-text>
      <el-button class="font-mono" @click="item.func">
        {{ item.text }}
      </el-button>
    </div>
    <el-divider />

    <!-- Aria2 Configuration -->
    <div class="aria2-config">
      <h3>Aria2 Configuration</h3>

      <div class="flex justify-between items-center mb-2">
        <el-text>Enable Aria2</el-text>
        <el-switch v-model="aria2Config.enabled" @change="setAria2Config" />
      </div>

      <div class="flex justify-between items-center mb-2">
        <el-text>RPC Host</el-text>
        <el-input v-model="aria2Config.host" style="width: 200px" @change="setAria2Config" />
      </div>

      <div class="flex justify-between items-center mb-2">
        <el-text>RPC Port</el-text>
        <el-input-number v-model="aria2Config.port" :min="1" :max="65535" style="width: 200px" @change="setAria2Config" />
      </div>

      <div class="flex justify-between items-center mb-2">
        <el-text>RPC Secret</el-text>
        <el-input v-model="aria2Config.secret" type="password" show-password style="width: 200px" @change="setAria2Config" />
      </div>

      <div class="flex justify-between items-center mb-2">
        <el-text>Concurrent Downloads</el-text>
        <el-input-number v-model="aria2Config.concurrent" :min="1" :max="16" style="width: 200px" @change="setAria2Config" />
      </div>

      <el-divider />

      <h3>Aria2 Status</h3>
      <div v-if="aria2Running" class="status-info">
        <el-text type="success">
          Aria2 is running
        </el-text>
        <div v-if="aria2Status" class="status-details">
          <el-text>Active: {{ aria2Status.numActive }}</el-text>
          <el-text>Waiting: {{ aria2Status.numWaiting }}</el-text>
          <el-text>Stopped: {{ aria2Status.numStopped }}</el-text>
          <el-text>Download Speed: {{ (Number(aria2Status.downloadSpeed) / 1024).toFixed(2) }} KB/s</el-text>
        </div>
      </div>
      <div v-else class="status-info">
        <el-text type="info">
          Aria2 is not running
        </el-text>
      </div>

      <div class="flex gap-2 mt-2">
        <el-button type="primary" :disabled="aria2Running" @click="startAria2">
          Start Aria2
        </el-button>
        <el-button type="danger" :disabled="!aria2Running" @click="stopAria2">
          Stop Aria2
        </el-button>
        <el-button :disabled="!aria2Running" @click="getAria2Status">
          Refresh Status
        </el-button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.aria2-config {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.status-info {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.status-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  margin-left: 1rem;
}
</style>
