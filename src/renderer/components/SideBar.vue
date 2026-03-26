<script setup lang="ts">
import { useDark, useToggle } from '@vueuse/core'
import { Film, Globe, Info, ListChecks, Moon, Settings, Sunny } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { useFindedMediaStore, useTaskStore } from '../stores'

const taskStore = useTaskStore()
const mediaStore = useFindedMediaStore()

const myRoutes = [
  { path: '/tasks', name: 'Tasks', icon: ListChecks, desc: '任务与下载状态' },
  { path: '/', name: 'Player', icon: Film, desc: '播放器与预览' },
  { path: '/webview', name: 'Explore', icon: Globe, desc: '网页探测与抓流' },
  { path: '/setting', name: 'Setting', icon: Settings, desc: '下载与 Aria2 配置' },
  { path: '/about', name: 'About', icon: Info, desc: '关于' },
]

const route = useRoute()
const isDark = useDark()
const toggleDark = useToggle(isDark)

const taskSummary = computed(() => [
  { label: '进行中', value: taskStore.activeTaskCount, color: 'text-amber-500' },
  { label: '完成', value: taskStore.completedTaskCount, color: 'text-green-500' },
  { label: '异常', value: taskStore.failedTaskCount, color: 'text-red-500' },
])

watchEffect(() => {
  document.body.classList.remove('dark', 'light')
  document.body.classList.add(isDark.value ? 'dark' : 'light')
})
</script>

<template>
  <aside class="flex flex-col h-screen w-52 shrink-0 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 select-none">
    <!-- 品牌区 -->
    <div class="px-4 pt-5 pb-3">
      <div class="flex items-center gap-2 mb-3">
        <div class="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center shrink-0">
          <Film :size="16" class="text-white" />
        </div>
        <div class="leading-tight">
          <p class="text-sm font-bold text-gray-800 dark:text-gray-100 m-0">
            M3U8 Hunter
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 m-0">
            下载工作台
          </p>
        </div>
      </div>
      <!-- 任务摘要小数字 -->
      <div class="flex gap-2">
        <div
          v-for="item in taskSummary" :key="item.label"
          class="flex-1 rounded-lg bg-gray-50 dark:bg-gray-800 p-2 text-center"
        >
          <p class="text-xs text-gray-400 dark:text-gray-500 m-0">
            {{ item.label }}
          </p>
          <p class="text-base font-bold m-0" :class="item.color">
            {{ item.value }}
          </p>
        </div>
      </div>
    </div>

    <!-- 导航列表 -->
    <nav class="flex-1 px-2 py-1 overflow-y-auto">
      <router-link
        v-for="item in myRoutes"
        :key="item.path"
        :to="item.path"
        class="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-1 no-underline transition-colors duration-150"
        :class="route.path === item.path
          ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400'
          : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'"
      >
        <component :is="item.icon" :size="18" class="shrink-0" />
        <div class="min-w-0">
          <p class="text-sm font-semibold m-0 leading-tight">
            {{ item.name }}
          </p>
          <p class="text-xs text-gray-400 dark:text-gray-500 m-0 truncate">
            {{ item.desc }}
          </p>
        </div>
        <!-- 任务数量徽标 -->
        <span
          v-if="item.path === '/tasks' && taskStore.tasksCount > 0"
          class="ml-auto shrink-0 min-w-5 h-5 rounded-full bg-blue-500 text-white text-xs flex items-center justify-center px-1"
        >{{ taskStore.tasksCount > 99 ? '99+' : taskStore.tasksCount }}</span>
        <span
          v-else-if="item.path === '/webview' && mediaStore.findedMediaListCount > 0"
          class="ml-auto shrink-0 min-w-5 h-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center px-1"
        >{{ mediaStore.findedMediaListCount > 99 ? '99+' : mediaStore.findedMediaListCount }}</span>
      </router-link>
    </nav>

    <!-- 底部主题切换 -->
    <div class="px-4 py-3 border-t border-gray-200 dark:border-gray-700">
      <button
        type="button"
        class="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        @click="toggleDark()"
      >
        <component :is="isDark ? Sunny : Moon" :size="16" />
        <span>{{ isDark ? '切换浅色' : '切换深色' }}</span>
      </button>
    </div>
  </aside>
</template>

<style scoped>
/* router-link active class override — Tailwind handles the rest */
</style>
