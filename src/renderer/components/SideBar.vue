<script setup lang="ts">
import { useDark } from '@vueuse/core'
import { Film, Globe, Info, ListChecks, Settings } from 'lucide-vue-next'
import { useRoute } from 'vue-router'
import { useFindedMediaStore, useTaskStore } from '../stores'

const taskStore = useTaskStore()
const mediaStore = useFindedMediaStore()

const myRoutes = [
  {
    path: '/tasks',
    name: 'Tasks',
    icon: ListChecks,
    description: '下载任务与状态概览',
  },
  {
    path: '/',
    name: 'Index',
    icon: Film,
    description: '播放器与预览',
  },
  {
    path: '/webview',
    name: 'Explore',
    icon: Globe,
    description: '网页探测与抓流',
  },
  {
    name: 'Setting',
    icon: Settings,
    path: '/setting',
    description: '下载与 Aria2 配置',
  },
  {
    path: '/about',
    name: 'About',
    icon: Info,
    description: '项目信息',
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
const taskSummary = computed(() => [
  {
    label: '进行中',
    value: taskStore.activeTaskCount,
  },
  {
    label: '已完成',
    value: taskStore.completedTaskCount,
  },
  {
    label: '待处理',
    value: taskStore.failedTaskCount,
  },
])

watchEffect(() => {
  const themeStr = isDark.value ? 'dark' : 'light'
  // document.body.classList.toggle('dark')
  document.body.classList.remove('dark', 'light')
  document.body.classList.add(themeStr)
})
</script>

<template>
  <aside class="sidebar-shell">
    <div class="brand-card">
      <div class="brand-title">
        <el-icon class="brand-icon">
          <Film />
        </el-icon>
        <div>
          <div class="brand-name">
            M3U8 Hunter
          </div>
          <div class="brand-subtitle">
            更清晰的下载工作台
          </div>
        </div>
      </div>
      <div class="brand-metrics">
        <div v-for="item in taskSummary" :key="item.label" class="metric-item">
          <span class="metric-label">{{ item.label }}</span>
          <strong class="metric-value">{{ item.value }}</strong>
        </div>
      </div>
    </div>

    <el-menu default-active="0" class="nav-menu" @open="handleOpen" @close="handleClose">
      <template v-for="(item, index) of myRoutes" :key="item.path">
        <router-link
          class="nav-link" :class="{ isActive: item.path === route.path }" :to="item.path"
          :title="item.name"
        >
          <el-menu-item :index="String(index)" class="nav-item">
            <el-icon class="nav-icon" :class="{ isActive: item.path === route.path }">
              <component :is="item.icon" />
            </el-icon>
            <div class="nav-text">
              <div class="nav-title-row">
                <el-text class="mx-1 decoration-wavy" :class="{ isActive: item.path === route.path }" size="large" tag="b">
                  {{ item.name }}
                </el-text>
                <el-badge
                  v-if="item.path === '/tasks' && taskStore.tasksCount"
                  :value="taskStore.tasksCount"
                  :max="99"
                  type="primary"
                />
                <el-badge
                  v-else-if="item.path === '/webview' && mediaStore.findedMediaListCount"
                  :value="mediaStore.findedMediaListCount"
                  :max="99"
                  type="danger"
                />
              </div>
              <div class="nav-description">
                {{ item.description }}
              </div>
            </div>
          </el-menu-item>
        </router-link>
      </template>
    </el-menu>

    <div class="sidebar-footer">
      <span>主题：{{ isDark ? '深色' : '浅色' }}</span>
      <span>媒体发现：{{ mediaStore.findedMediaListCount }}</span>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-shell {
  width: 260px;
  height: 100vh;
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px 12px;
  box-sizing: border-box;
  background: color-mix(in srgb, var(--el-bg-color) 94%, var(--el-color-primary) 6%);
  border-right: 1px solid var(--el-border-color-light);
}

.brand-card {
  padding: 14px;
  border-radius: 16px;
  background: linear-gradient(135deg, color-mix(in srgb, var(--el-color-primary) 12%, transparent), transparent 72%);
  border: 1px solid color-mix(in srgb, var(--el-color-primary) 18%, var(--el-border-color-light));
}

.brand-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--el-color-primary);
  color: white;
}

.brand-name {
  font-size: 16px;
  font-weight: 700;
}

.brand-subtitle {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.brand-metrics {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
  margin-top: 14px;
}

.metric-item {
  padding: 8px;
  border-radius: 12px;
  background: var(--el-fill-color-light);
  text-align: center;
}

.metric-label,
.sidebar-footer {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.metric-value {
  display: block;
  margin-top: 4px;
  font-size: 16px;
}

.nav-menu {
  flex: 1;
  border-right: none;
  background: transparent;
}

.nav-link {
  text-decoration: none;
  color: inherit;
}

.nav-item {
  height: auto;
  min-height: 64px;
  margin-bottom: 6px;
  border-radius: 14px;
}

.nav-item:hover {
  background: var(--el-fill-color-light);
}

.nav-icon {
  font-size: 18px;
}

.nav-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.nav-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.nav-description {
  padding-left: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.sidebar-footer {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  padding: 0 6px;
}

.isActive {
  color: var(--el-menu-active-color);
}
</style>
