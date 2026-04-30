import { createApp } from 'vue'
import 'virtual:uno.css'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import ElementPlus from 'element-plus'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './routes/routers'
import HlsPlugin from './plugins/hls'
// import './style.css'
import './demos/ipc'
// If you want use Node.js, the`nodeIntegration` needs to be enabled in the Main process.
// import './demos/node'
const pinia = createPinia()
const app = createApp(App)

app.use(router).use(ElementPlus).use(pinia).use(HlsPlugin).mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
