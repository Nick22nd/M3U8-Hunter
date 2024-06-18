<script setup lang="ts">
import type { Message4Renderer } from '../common.types'
import { MessageName } from '../common.types'

const { sendMsg: sendMsgToMainProcess } = window.electron

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
onMounted(() => {

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
  </div>
</template>

<style scoped></style>
