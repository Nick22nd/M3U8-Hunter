import { createRouter, createWebHashHistory } from 'vue-router'
import HomeVue from '@render/pages/Home.vue'
import WebviewVue from '@render/pages/Webview.vue'
import About from '../pages/About.vue'

// We'll talk about nested routes later.
const routes = [
  { path: '/', component: HomeVue },
  { path: '/about', component: About },
  { path: '/webview', component: WebviewVue },
]

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
export const router = createRouter({
  // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
  history: createWebHashHistory(),
  routes, // short for `routes: routes`
})
