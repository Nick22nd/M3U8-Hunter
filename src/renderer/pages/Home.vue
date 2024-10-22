<script setup lang="ts">
import type { Ref } from 'vue'
import { onMounted, ref, watch } from 'vue'
import DPlayer from 'dplayer'
import Hls from 'hls.js'
import { useStorage } from '@vueuse/core'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
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
const route = useRoute()
const autoPlay = ref(false)
watch(() => route.query.from, (from) => {
  console.log('from', from)
  console.log('route: ', route.query.from)
  if (from === 'tasks')
    autoPlay.value = true
}, { immediate: true })
onMounted(() => {
  console.log('mounted', playHistory.value, taskStore)
  // load the last play url
  if (!taskStore.playUrl && playHistory.value.length !== 0) {
    console.log('task: ', JSON.stringify(taskStore.playUrl))
    taskStore.playUrl = playHistory.value.at(-1)?.url || ''
    taskStore.playerTitle = playHistory.value.at(-1)?.title || 'player'
    try {
      const fixedUrl = new URL(taskStore.playUrl)
      fixedUrl.hostname = taskStore.serverConfig.ip
      fixedUrl.port = String(taskStore.serverConfig.port)
      taskStore.playUrl = fixedUrl.toString()
    }
    catch (err) {
      console.error(err)
    }
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
    autoplay: autoPlay.value,
  })
  dplayer.value = dp
  const lastViewTime = playHistory.value.find(item => item.url === taskStore.playUrl)?.time || 0
  console.log('lastViewTime', lastViewTime)
  setTimeout(() => {
    // dplayer.value?.video.play()
    dplayer.value && (dplayer.value.video.currentTime = lastViewTime)
  }, 100)
  // console.log('dp', dp.plugins.hls)
  // dp.play()
})
onBeforeRouteLeave((to, from, next) => {
  console.log('to', to)
  console.log('from', from)
  if (dplayer.value) {
    updatePlayHistory(taskStore.playUrl)
    dplayer.value.destroy()
  }
  next()
})

function updatePlayHistory(newUrl: string) {
  let historyItem = playHistory.value.find(item => item.url === newUrl)
  if (historyItem) {
    historyItem.time = dplayer.value?.video.currentTime || 0
    // move to last position
    playHistory.value = playHistory.value.filter(item => item.url !== newUrl)
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
}

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
