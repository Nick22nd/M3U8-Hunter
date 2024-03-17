<template>
  <el-scrollbar height="90vh">
    <h2>{{ taskStore.playerTitle }}</h2>
    <el-input v-model="taskStore.playUrl" placeholder="Please input" @change="urlChange" />
    <div ref="videoDom" class="border w-full"></div>
    <div class="flex flex-col items-center">
      <el-switch v-model="showQRCode" class="ml-2" width="30" active-text="show qr code" inactive-text="hide qr code" />
      <VueQrcode v-show="showQRCode" :value="taskStore.playUrl || taskStore.urlPrefix" @ready="onReady"></VueQrcode>
    </div>
  </el-scrollbar>
</template>

<script setup lang="ts">
import { Ref, onMounted, ref, watch } from 'vue'
import DPlayer from 'dplayer'
import Hls from 'hls.js'
import { useTaskStore } from '../stores';
import { useStorage } from '@vueuse/core';
const playHistory = useStorage('play-history', [], localStorage) as Ref<string[]>
const taskStore = useTaskStore()
const videoDom = ref(null)
const showQRCode = ref(false)
const dplayer = ref(null as DPlayer | null)
watch(() => taskStore.playUrl, async (newUrl, oldUrl) => {
  console.log('url', newUrl, oldUrl)
  let urlSet = new Set(playHistory.value)
  urlSet.add(newUrl)
  playHistory.value = Array.from(urlSet)
  if (dplayer.value) {
    if (newUrl.startsWith('file://')) {
      dplayer.value.switchVideo({
        url: newUrl,
        type: 'auto',
        // @ts-ignore
      }, undefined)

    }
    dplayer.value.switchVideo({
      url: newUrl,
      type: 'customHls',
      customType: {
        customHls(video: HTMLMediaElement, player: any) {
          const hls = new Hls()
          hls.loadSource(video.src)
          hls.attachMedia(video)
        },
      },

      // @ts-ignore
    }, undefined)
    setTimeout(() => {
      dplayer.value?.video.play()
    }, 100)
  }
})
onMounted(() => {
  console.log('mounted')
  if (!taskStore.playUrl) {
    taskStore.playUrl = playHistory.value.at(-1) || ''
  }
  const dp = new DPlayer({
    container: videoDom.value,
    video: {
      url: taskStore.playUrl,
      type: 'customHls',
      customType: {
        customHls(video: HTMLMediaElement, player: any) {
          console.log(player)
          const hls = new Hls()
          hls.loadSource(video.src)
          hls.attachMedia(video)
        },
      },
    },
    autoplay: false,
  })
  dplayer.value = dp
  // console.log('dp', dp.plugins.hls)
  // dp.play()
})
function onReady() {
  console.log('QR onReady')
}
function urlChange() {
  console.log('urlChange', taskStore.playUrl)
  if (dplayer.value)
    dplayer.value.switchVideo({
      url: taskStore.playUrl,
      type: 'customHls',
      customType: {
        customHls(video: HTMLMediaElement, player: any) {
          console.log(player)
          const hls = new Hls()
          hls.loadSource(video.src)
          hls.attachMedia(video)
        },
      },
      // @ts-ignore
    }, {})
}
</script>
<style scoped></style>