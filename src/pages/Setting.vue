<template>
    <div>
        <el-button @click="openDir">open log dir</el-button>

    </div>
</template>

<script setup lang="ts">
import { Message4Renderer, MessageName } from '../common.types';
const { sendMsg: sendMsgToMainProcess } = window.electron

const test = ref('test')
const openDir = () => {
    const newMessage: Message4Renderer = {
        name: MessageName.openLog,
        data: '',
        type: 'openLog'
    }
    sendMsgToMainProcess(newMessage)
}
</script>

<style scoped></style>