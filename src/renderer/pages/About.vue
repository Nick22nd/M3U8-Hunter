<script setup lang="ts">
import type { Message4Renderer } from '../common.types'
import { MessageName } from '../common.types'

const { sendMsg: sendMsgToMainProcess } = window.electron

function openLink() {
  console.log(window.electron)
  const url = 'https://github.com/Nick22nd/M3U8-Hunter/issues'
  // openExternal(url);
  const newMessage: Message4Renderer = {
    name: MessageName.openUrl,
    data: url,
    type: 'default',
  }
  sendMsgToMainProcess(newMessage)
}
</script>

<template>
  <div class="h-full flex items-start justify-center p-8 overflow-y-auto">
    <div class="max-w-md w-full text-left">
      <h2 class="text-xl font-bold text-gray-800 dark:text-gray-100 mb-6">
        About M3U8 Hunter
      </h2>
      <ol class="flex flex-col gap-3 text-sm text-gray-600 dark:text-gray-400 list-decimal list-inside">
        <li>前往 <strong class="text-gray-800 dark:text-gray-200">Explore</strong> 页面</li>
        <li>输入视频网站地址，等待页面加载</li>
        <li>如果页面中有 M3U8 流，左下角按钮会显示数量提示</li>
        <li>点击按钮，选择目标流地址后点击下载</li>
      </ol>
      <div class="mt-6 text-sm text-gray-500 dark:text-gray-500">
        遇到问题？可以前往
        <a
          class="text-blue-500 hover:underline cursor-pointer"
          @click="openLink"
        >GitHub Issues</a>
        反馈。
      </div>
    </div>
  </div>
</template>

<style scoped></style>
