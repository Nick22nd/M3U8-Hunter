import { createApp } from 'vue'
import 'virtual:uno.css'
import 'element-plus/dist/index.css'
import ElementPlus from 'element-plus'
import App from './App.vue'
import { router } from './routes/routers'

createApp(App).use(router).use(ElementPlus).mount('#app')
