<template>
  <div>
    <el-button @click="openDir">open log dir</el-button>
  </div>
</template>
<script setup lang="ts">
import { toRaw } from 'vue';
import { Message4Renderer, MessageName } from '../common.types';
const { sendMsg: sendMsgToMainProcess } = window.electron

const openDir = () => {
  const macLog = '~/Library/Logs/M3U8-Hunter'
  const winLog = '%USERPROFILE%\AppData\Roaming\M3U8-Hunter\logs'
  const linuxLog = '~/.config/M3U8-Hunter/logs'
  const newMessage: Message4Renderer = {
    name: MessageName.openDir,
    data: macLog,
    type: 'openDir'
  }
  sendMsgToMainProcess(newMessage)
}
</script>

<style scoped></style>
