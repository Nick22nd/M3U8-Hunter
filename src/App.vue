<template>
  <el-container class="h-screen">
    <el-tabs v-model:model-value="taskStore.activeTab" @tab-change="changeTabs" type="border-card" tab-position="left"
      class="w-full">
      <el-tab-pane label="Home" name="Home">
        <Home></Home>
      </el-tab-pane>
      <el-tab-pane label="About" name="About">
        <About></About>
      </el-tab-pane>
      <el-tab-pane label="Tasks" name="Tasks">
        <Tasks :tasks="tasks"></Tasks>
      </el-tab-pane>
      <el-tab-pane label="WebviewVue" name="Webview">
        <WebviewVue :mediaTasks="store.findedMediaList"></WebviewVue>
      </el-tab-pane>
    </el-tabs>
  </el-container>
</template>
<script setup lang="ts">
import SideBar from './components/SideBar.vue'
import { onMounted, ref } from 'vue'
import About from './pages/About.vue';
import Home from './pages/Home.vue';
import Tasks from './pages/Tasks.vue';
import WebviewVue from './pages/Webview.vue';
import { TaskItem, MediaMessage, Message4Renderer, MessageName } from './common.types';
import { TabPaneName } from 'element-plus';
import { useFindedMediaStore, useTaskStore } from './stores/';
const tabs = [
  {
    label: 'Home',
    component: Home
  },
  {
    label: 'About',
    component: About
  },
  {
    label: 'Tasks',
    component: Tasks
  },
  {
    label: 'WebviewVue',
    component: WebviewVue
  }
]
const taskStore = useTaskStore()
const tabPosition = ref('left')

const tasks = ref<TaskItem[]>([])
const store = useFindedMediaStore()
const { sendMsg: sendMsgToMainProcess, onReplyMsg } = window.electron
onMounted(() => {
  console.log('mounted')
  sendMsgToMainProcess({ name: MessageName.getTasks })
  sendMsgToMainProcess({ name: MessageName.getServerConfig })
  onReplyMsg((msg: Message4Renderer) => {
    const { name, data, type } = msg
    console.log('onReplyMsg', msg)
    if (msg.name === MessageName.getTasks) {
      tasks.value = msg.data.tasks || []
    } else if (msg.name === MessageName.findM3u8) {
      console.log('findM3u8', data)
      const singleData = data as unknown as MediaMessage
      store.addFindResource(singleData.browserVideoItem)
    } else if (msg.name === MessageName.getServerConfig) {
      taskStore.serverConfig = msg.data
    }
  })
})
const changeTabs = (name: TabPaneName) => {
  console.log('changeTabs', name)
  if (name === 'Tasks') {
    sendMsgToMainProcess({ name: MessageName.getTasks })
  }
}
</script>



<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
}

body {
  margin: 0;
  padding: 0;
  --background-dark-color: #0d1117;
  --background-light: #fff;
  background-color: var(--background-light);
}

body.dark {
  --background-dark-color: #0d1117;
  --background-light: #fff;
  background-color: var(--background-dark-color);
}

.logo {
  width: 400px;
  border-radius: 1rem;
  box-shadow: 0 0 #0000, 0 25px 50px -12px rgba(0, 0, 0, 0.25);
}

.container {
  display: flex;
  /* flex-direction: column; */
  align-items: center;
  justify-content: center;
}

/* .demo-tabs>.el-tabs__content {
  padding: 32px;
color: #6b778c;
font-size: 32px;
font-weight: 600;
}

.el-tabs--right .el-tabs__content,
.el-tabs--left .el-tabs__content {
  height: 100%;
}

*/
</style>
