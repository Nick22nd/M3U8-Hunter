<script setup lang="ts">
import type { Ref } from 'vue'
import { onMounted, ref, watch } from 'vue'
import DPlayer from 'dplayer'
import Hls from 'hls.js'
import { useStorage } from '@vueuse/core'
import { useTaskStore } from '../stores'

interface PlayHistoryItem {
  url: string
  time: number
  title: string
}
const playHistory = useStorage('play-history', [], localStorage) as Ref<PlayHistoryItem[]>
const taskStore = useTaskStore()
const videoDom = ref(null)
const dplayer = ref(null as DPlayer | null)
watch(() => taskStore.playUrl, async (newUrl, oldUrl) => {
  console.log('url', newUrl, oldUrl)
  // record play history
  let historyItem = playHistory.value.find(item => item.url === oldUrl)
  if (historyItem) {
    historyItem.time = dplayer.value?.video.currentTime || 0
    // move to last position
    playHistory.value = playHistory.value.filter(item => item.url !== oldUrl)
    playHistory.value.push(historyItem)
  }
  else {
    historyItem = {
      url: newUrl,
      time: dplayer.value?.video.currentTime || 0,
      title: taskStore.playerTitle,
    }
    playHistory.value.push(historyItem)
  }

  if (dplayer.value) {
    if (newUrl.startsWith('file://')) {
      dplayer.value.switchVideo({
        url: newUrl,
        type: 'auto',
        // @ts-expect-error dplayer type error
      }, undefined)
    }
    dplayer.value.switchVideo({
      url: newUrl,
      type: 'customHls',
      customType: {
        customHls(video: HTMLMediaElement, _player: any) {
          const hls = new Hls()
          hls.loadSource(video.src)
          hls.attachMedia(video)
        },
      },

      // @ts-expect-error dplayer type error
    }, undefined)
    const lastViewTime = playHistory.value.find(item => item.url === newUrl)?.time || 0
    setTimeout(() => {
      // dplayer.value?.video.play()
      dplayer.value && (dplayer.value.video.currentTime = lastViewTime)
    }, 100)
  }
})
onMounted(() => {
  console.log('mounted')
  // load the last play url
  if (!taskStore.playUrl) {
    taskStore.playUrl = playHistory.value.at(-1)?.url || ''
    taskStore.playerTitle = playHistory.value.at(-1)?.title || 'player'
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
    // chromecast: true,
    // airplay: true,
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
  if (dplayer.value) {
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
    // @ts-expect-error dplayer type error
    }, {})
  }
}
</script>

<template>
  <el-scrollbar height="95vh">
    <h2 class="font-sans text-xl truncate" :title="taskStore.playerTitle">
      {{ taskStore.playerTitle }}
    </h2>
    <div class="flex justify-between">
      <el-input v-model="taskStore.playUrl" placeholder="Please input" @change="urlChange" />
      <el-popover placement="top-start" :width="200" trigger="hover">
        <template #reference>
          <el-button>show QR</el-button>
        </template>
        <VueQrcode :value="taskStore.playUrl || taskStore.urlPrefix" @ready="onReady" />
      </el-popover>
    </div>
    <div ref="videoDom" class="border w-full" />
  </el-scrollbar>
</template>

<style scoped></style>
