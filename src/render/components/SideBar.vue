<script setup lang="ts">
import { Home, PanelTop, PersonStanding } from 'lucide-vue-next'

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
function handleOpen(key: string, keyPath: string[]) {
  console.log(key, keyPath)
}
function handleClose(key: string, keyPath: string[]) {
  console.log(key, keyPath)
}
</script>

<template>
  <div class="flex flex-col h-screen justify-center w-35 items-center">
    <el-menu default-active="2" class="el-menu-vertical-demo" @open="handleOpen" @close="handleClose">
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
    </el-menu>
  </div>
</template>
