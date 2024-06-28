<script setup lang="ts">
import { defineCustomElement } from 'vue'
// import type { TabGroup } from 'electron-tabs'
import { Tab, TabGroup } from '../components/Tab'

// const MyVueElement = defineCustomElement({
//   // 这里是同平常一样的 Vue 组件选项
//   props: {},
//   emits: {},

//   template: `<tab-group new-tab-button="true" sortable="true" />`,

//   // defineCustomElement 特有的：注入进 shadow root 的 CSS
//   styles: [`/* inlined css */`]
// })

// // 注册自定义元素
// // 注册之后，所有此页面中的 `<my-vue-element>` 标签
// // 都会被升级
// customElements.define('tab-group', MyVueElement)
// customElements.define('tab-group', TabGroup)
onMounted(() => {
  // Select tab-group
  const tabGroup = document.querySelector('tab-group') as TabGroup
  // tabGroup.set
  // Setup the default tab which is created when the "New Tab" button is clicked
  tabGroup?.setDefaultTab({
    title: 'New Page',
    src: 'https://github.com/Nick22nd',
    active: true,
  })

  // Do stuff
  const tab = tabGroup?.addTab({
    title: 'electron-tabs on NPM',
    src: 'https://www.npmjs.com/package/electron-tabs',
  })
  const pos = tab.getPosition()
  console.log(tabGroup.options)
  console.log(`Tab position is ${pos}`)
})
</script>

<template>
  <div>
    Tabs
    <div v-pre>
      <!-- eslint-disable-next-line vue/component-name-in-template-casing -->
      <tab-group new-tab-button="true" sortable="true" />
    </div>
  </div>
</template>

<style scoped>

</style>
