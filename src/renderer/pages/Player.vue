<script setup lang="ts">
import type { Ref } from 'vue'
import { computed, onMounted, ref, watch } from 'vue'
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
  if (from === 'tasks')
    autoPlay.value = true
}, { immediate: true })

const currentTask = computed(() => {
  if (taskStore.currentTaskId)
    return taskStore.tasks.find(task => task.taskId === taskStore.currentTaskId)
  return taskStore.tasks.find(task => task.url === taskStore.playUrl)
})

onMounted(() => {
  if (!taskStore.playUrl && playHistory.value.length !== 0) {
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
    autoplay: autoPlay.value,
  })

  dplayer.value = dp
  const lastViewTime = playHistory.value.find(item => item.url === taskStore.playUrl)?.time || 0
  setTimeout(() => {
    void (dplayer.value && (dplayer.value.video.currentTime = lastViewTime))
  }, 100)
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

function urlChange() {
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
  <div class="h-full overflow-y-auto flex flex-col gap-3 p-4">
    <h2
      v-if="taskStore.playerTitle"
      class="text-base font-semibold truncate text-gray-800 dark:text-gray-200 m-0"
      :title="taskStore.playerTitle"
    >
      {{ taskStore.playerTitle }}
    </h2>

    <div class="flex gap-2">
      <input
        v-model="taskStore.playUrl"
        type="text"
        placeholder="输入播放地址…"
        class="flex-1 px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:text-gray-100"
        @change="urlChange"
      >
    </div>

    <div ref="videoDom" class="flex-1 min-h-0" />

    <div v-if="currentTask?.og?.image" class="rounded-2xl border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
      <img
        :src="currentTask.og.image"
        :alt="currentTask.og.title || 'Cover'"
        class="w-full rounded-xl object-contain max-h-56"
      >
    </div>
  </div>
</template>

<style scoped></style>
