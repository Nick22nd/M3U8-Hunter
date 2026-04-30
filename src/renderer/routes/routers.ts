import { createRouter, createWebHashHistory } from 'vue-router'
import PlayerVue from '../pages/Player.vue'
import WebviewVue from '../pages/Webview.vue'
import TasksVue from '../pages/Tasks.vue'

const routes = [
  { path: '/', component: WebviewVue, name: 'Discover' },
  { path: '/player', component: PlayerVue, name: 'Player' },
  { path: '/tasks', component: TasksVue, name: 'Tasks' },
  { path: '/webview', redirect: '/' },
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
