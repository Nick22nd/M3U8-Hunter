<script setup lang="ts">
import { onMounted, ref } from 'vue'
import DPlayer from 'dplayer'
import Hls from 'hls.js'

const videoDom = ref(null)
const m3u8Url = ref('http://localhost:3000/first-take.m3u8')
const dplayer = ref(null as DPlayer | null)
onMounted(() => {
  console.log('mounted')
  const dp = new DPlayer({
    container: videoDom.value,
    video: {
      url: m3u8Url.value,
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
  })
  dplayer.value = dp
  // console.log('dp', dp.plugins.hls)
  dp.play()
})
function urlChange() {
  if (dplayer.value)
    dplayer.value.switchVideo({
      url: m3u8Url.value,
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

<template>
  <div>
    <h2>Hello Index</h2>
    <el-input v-model="m3u8Url" placeholder="Please input" @change="urlChange" />
    <div ref="videoDom" class="border w-full h-[10rm]" />
  </div>
</template>

<style scoped></style>
