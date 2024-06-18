<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { Film, Globe, Info, ListChecks, Settings } from 'lucide-vue-next'
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const myRoutes = [
  {
    path: '/tasks',
    name: 'Tasks',
    icon: ListChecks,
  },
  {
    path: '/',
    name: 'Index',
    icon: Film,
  },
  {
    path: '/webview',
    name: 'Explore',
    icon: Globe,
  },
  {
    name: 'Setting',
    icon: Settings,
    path: '/setting',
  },
  {
    path: '/about',
    name: 'About',
    icon: Info,
  },
]

const route = useRoute()
function handleOpen(key: string, keyPath: string[]) {
  console.log(key, keyPath)
}
function handleClose(key: string, keyPath: string[]) {
  console.log(key, keyPath)
}

const isDark = useDark()
watchEffect(() => {
  const themeStr = isDark.value ? 'dark' : 'light'
  // document.body.classList.toggle('dark')
  document.body.classList.remove('dark', 'light')
  document.body.classList.add(themeStr)
})
</script>

<template>
  <div class="flex flex-col h-screen justify-center w-35 items-center">
    <el-menu default-active="0" class="el-menu-vertical-demo h-full" @open="handleOpen" @close="handleClose">
      <template v-for="(item, index) of myRoutes" :key="item.path">
        <router-link
          class="decoration-none" :class="{ isActive: item.path === route.path }" :to="item.path"
          :title="item.name"
        >
          <el-menu-item :index="String(index)">
            <el-icon :class="{ isActive: item.path === route.path }">
              <component :is="item.icon" />
            </el-icon>
            <el-text class="mx-1 decoration-wavy" :class="{ isActive: item.path === route.path }" size="large" tag="b">
              {{ item.name }}
            </el-text>
          </el-menu-item>
        </router-link>
      </template>
    </el-menu>
  </div>
</template>

<style scoped>
  .isActive {
    color: var(--el-menu-active-color)
  }
</style>
