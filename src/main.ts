import { createApp } from 'vue'
import App from './App.vue'
import 'virtual:uno.css'
import 'element-plus/dist/index.css'
import 'element-plus/theme-chalk/dark/css-vars.css'
import ElementPlus from 'element-plus'
import { router } from './routes/routers'
import { createPinia } from 'pinia'
import VueQrcode from '@chenfengyuan/vue-qrcode';
// import './style.css'
import './demos/ipc'
// If you want use Node.js, the`nodeIntegration` needs to be enabled in the Main process.
// import './demos/node'
const pinia = createPinia()
const app = createApp(App)

// register component should be before mount
// from https://stackoverflow.com/questions/66024797/vue-3-failed-to-resolve-component-with-global-components
app.component(VueQrcode.name, VueQrcode);

app.use(router).use(ElementPlus).use(pinia).mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
