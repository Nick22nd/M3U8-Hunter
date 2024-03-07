import { createApp } from 'vue'
import App from './App.vue'
import 'virtual:uno.css'
import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus'
import { router } from './routes/routers'
import { createPinia } from 'pinia'
// import './style.css'
import './demos/ipc'
// If you want use Node.js, the`nodeIntegration` needs to be enabled in the Main process.
// import './demos/node'
const pinia = createPinia()
createApp(App)
  .use(router).use(ElementPlus).use(pinia).mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })

