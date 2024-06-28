import { createRouter, createWebHashHistory } from 'vue-router'
import HomeVue from '../pages/Home.vue'
import WebviewVue from '../pages/Webview.vue'
import About from '../pages/About.vue'
import TasksVue from '../pages/Tasks.vue'

// We'll talk about nested routes later.
const routes = [
  { path: '/', component: HomeVue, name: 'Player' },
  { path: '/webview', component: WebviewVue, name: 'Explore' },
  { path: '/about', component: About, name: 'About' },
  { path: '/tasks', component: TasksVue, name: 'Tasks' },
  { path: '/setting', component: () => import('../pages/Setting.vue'), name: 'Setting' },
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

// 3. Create the router instance and pass the `routes` option
// You can pass in additional options here, but let's
// keep it simple for now.
export const router = createRouter({
  // 4. Provide the history implementation to use. We are using the hash history for simplicity here.
  history: createWebHashHistory(),
  routes, // short for `routes: routes`
  // scrollBehavior(to, from, savedPosition) {
  // if (savedPosition)
  //   return savedPosition
  // else
  //   return { top: 0 }
  // },
})
