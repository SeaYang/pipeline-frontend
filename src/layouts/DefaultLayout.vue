<script setup lang="ts">
import { ref } from 'vue'
import AppHeader from '@/components/layout/AppHeader.vue'
import AppAside from '@/components/layout/AppAside.vue'
import AppMain from '@/components/layout/AppMain.vue'

const isCollapse = ref(false)

const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}
</script>

<template>
  <el-container class="layout-container-demo">
    <AppAside :is-collapse="isCollapse" />
    <el-container class="right-container">
      <AppHeader :is-collapse="isCollapse" @toggle-collapse="toggleCollapse" />
      <AppMain />
    </el-container>
  </el-container>
</template>

<style scoped>
.layout-container-demo {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

.right-container {
  flex-direction: column;
  overflow: hidden;
}
</style>
