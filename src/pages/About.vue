<template>
  <div class="test gap-4 flex-wrap flex justify-center flex-col items-start ">
    <span class="self-center">About M3U8 Hunter</span>
    <span>1. go to the explore page</span>
    <span>2. input the url</span>
    <span>3. if there is m3u8 file on the page there will be message tip on the left-bottom
      button</span>
    <span>4. click the button, select the m3u8 file to download</span>
    <div class="self-center">if you has any problem, can report to
      <a class=" hover:decoration-blue-500 underline decoration-sky-300 cursor-pointer" @click="openLink">
        Github issue
      </a>
    </div>
  </div>
</template>
<script setup lang="ts">
import { Message4Renderer, MessageName } from '../common.types';
const { sendMsg: sendMsgToMainProcess } = window.electron

const openLink = () => {
  console.log(window.electron)
  const url = 'https://github.com/Nick22nd/M3U8-Hunter/issues'
  // openExternal(url);
  const newMessage: Message4Renderer = {
    name: MessageName.openUrl,
    data: url,
    type: 'default'
  }
  sendMsgToMainProcess(newMessage)
};
</script>
<style scoped>
.test {
  text-align: left;
}
</style>
