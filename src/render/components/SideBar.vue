<script setup lang="ts">
import { Home, Moon, PanelTop, PersonStanding, Sun } from 'lucide-vue-next'
import { ref } from 'vue'

const myRoutes = [
  {
    path: '/',
    name: 'Index',
    icon: Home,
  },
  {
    path: '/about',
    name: 'About',
    icon: PersonStanding,
  },
  {
    path: '/webview',
    name: 'WebView',
    icon: PanelTop,
  },
]
const themes = {
  icon: {
    dark: Moon,
    light: Sun,
  },
}
const theme = ref('dark')
function handleOpen(key: string, keyPath: string[]) {
  console.log(key, keyPath)
}
function handleClose(key: string, keyPath: string[]) {
  console.log(key, keyPath)
}
function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
  document.body.classList.toggle('dark')
}
</script>

<template>
  <div class="flex flex-col h-screen justify-center w-35 items-center">
    <el-menu default-active="0" class="el-menu-vertical-demo" @open="handleOpen" @close="handleClose">
      <template v-for="(item, index) of myRoutes" :key="item.path">
        <router-link class="decoration-none" :to="item.path" :title="item.name">
          <el-menu-item :index="String(index)">
            <el-icon>
              <component :is="item.icon" />
            </el-icon>
            <el-text class="mx-1 decoration-wavy" size="large" tag="b">
              {{ item.name }}
            </el-text>
          </el-menu-item>
        </router-link>
      </template>
      <el-menu-item @click="toggleTheme">
        <el-icon>
          <component :is="themes.icon[theme]" />
        </el-icon>
        <el-text class="mx-1 decoration-wavy" size="large" tag="b">
          theme
        </el-text>
      </el-menu-item>
    </el-menu>
  </div>
</template>
