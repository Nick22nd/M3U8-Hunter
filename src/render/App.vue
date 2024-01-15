<script setup lang="ts">
import SideBar from './components/SideBar.vue'
</script>

<template>
  <!-- <div class="container">
     <SideBar />
  <div style="flex:1">
    <router-view />
  </div>
    </div> -->
  <div class="common-layout">
    <el-container>
      <el-aside width="200px">
        <SideBar />
      </el-aside>
      <el-main>
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

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
</style>
