<template>
  <div class="hls-player">
    <video ref="video" class="video" controls :poster="poster" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import Hls from 'hls.js'

const props = defineProps<{
  src: string
  poster?: string
}>()

const video = ref<HTMLVideoElement | null>(null)
let hls: Hls | null = null

onMounted(() => {
  if (Hls.isSupported() && video.value) {
    hls = new Hls()
    hls.loadSource(props.src)
    hls.attachMedia(video.value)
  } else if (video.value?.canPlayType('application/vnd.apple.mpegurl')) {
    video.value.src = props.src
  }
})

onBeforeUnmount(() => {
  hls?.destroy()
})

watch(() => props.src, (newSrc) => {
  if (hls && video.value) {
    hls.loadSource(newSrc)
    hls.attachMedia(video.value)
  } else if (video.value?.canPlayType('application/vnd.apple.mpegurl')) {
    video.value.src = newSrc
  }
})
</script>

<style scoped>
.hls-player {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}
.video {
  width: 100%;
  max-height: 80vh;
  background: #000;
}
</style>
