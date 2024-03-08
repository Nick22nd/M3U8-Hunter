<template>
  <div>
    <h2>{{ taskStore.playerTitle }}</h2>
    <el-input v-model="taskStore.playUrl" placeholder="Please input" @change="urlChange" />
    <div ref="videoDom" class="border w-full h-[10rm]" />
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import DPlayer from 'dplayer'
import Hls from 'hls.js'
import { useTaskStore } from '../stores';
const taskStore = useTaskStore()
const videoDom = ref(null)
const dplayer = ref(null as DPlayer | null)
watch(() => taskStore.playUrl, async (newUrl, oldUrl) => {
  console.log('url', newUrl, oldUrl)
  if (dplayer.value) {
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
    autoplay: true,
  })
  dplayer.value = dp
  // console.log('dp', dp.plugins.hls)
  // dp.play()
})

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