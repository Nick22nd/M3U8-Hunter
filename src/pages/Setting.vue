<template>
    <div class="flex justify-center flex-col">
        <div v-for="(item) of buttonGroup" :key="item.text">
            <el-button @click="item.func" class="font-mono">{{ item.text }}</el-button>
        </div>

    </div>
</template>

<script setup lang="ts">
import { Message4Renderer, MessageName } from '../common.types';
const { sendMsg: sendMsgToMainProcess } = window.electron
const test = ref('test')
const changeDir = (e: Event) => {
    e.preventDefault()
    const target = e.target as HTMLInputElement
    const files = target.files
    console.log(target);

    console.log(files)
    if (files && files.length > 0) {
        // const newMessage: Message4Renderer = {
        //     name: MessageName.changeLogDir,
        //     data: files[0].path,
        //     type: 'changeLogDir'
        // }
        // sendMsgToMainProcess(newMessage)
    }
}

const openDir = () => {
    const newMessage: Message4Renderer = {
        name: MessageName.openLog,
        data: '',
        type: 'openLog'
    }
    sendMsgToMainProcess(newMessage)
}
const setAppDir = () => {
    const newMessage: Message4Renderer = {
        name: MessageName.setAppDataDir,
        data: '',
        type: ''
    }
    sendMsgToMainProcess(newMessage)
}
const openAppDir = () => {
    const newMessage: Message4Renderer = {
        name: MessageName.openAppDir,
        data: '',
        type: ''
    }
    sendMsgToMainProcess(newMessage)
}
const buttonGroup = [
    {
        text: 'open log dir',
        func: openDir
    },
    {
        text: 'open app dir',
        func: openAppDir
    },
    {
        text: 'set app dir',
        func: setAppDir
    }
]
</script>

<style scoped></style>