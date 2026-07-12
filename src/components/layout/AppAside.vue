<script setup lang="ts">
import { useRouter } from 'vue-router'

defineProps<{ isCollapse: boolean }>()

const router = useRouter()

const handleMenuClick = (index: string) => {
  switch (index) {
    case '1-1':
      router.push('/argo-flow')
      break
    case '1-2':
      router.push('/dict/type')
      break
    case '2-1':
      router.push('/argo/pipelines')
      break
  }
}
</script>

<template>
  <el-aside class="side-aside" :width="isCollapse ? '64px' : '200px'">
    <div class="aside-title" :class="{ 'is-collapse': isCollapse }">
      <span v-if="!isCollapse">流水线平台</span>
      <span v-else>流水线</span>
    </div>
    <el-menu
      :collapse="isCollapse"
      :collapse-transition="false"
      :default-openeds="['1', '2']"
      @select="handleMenuClick"
    >
      <el-sub-menu index="1">
        <template #title>
          <el-icon><Setting /></el-icon>
          <span>基础配置</span>
        </template>
        <el-menu-item index="1-1">流水线详情</el-menu-item>
        <el-menu-item index="1-2">字典配置</el-menu-item>
      </el-sub-menu>
      <el-sub-menu index="2">
        <template #title>
          <el-icon><DataBoard /></el-icon>
          <span>Argo后台管理</span>
        </template>
        <el-menu-item index="2-1">流水线页面</el-menu-item>
      </el-sub-menu>
    </el-menu>
  </el-aside>
</template>

<style scoped>
.side-aside {
  height: 100%;
  overflow: hidden;
  background: #fff;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--el-border-color-light);
}

.aside-title {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  border-bottom: 1px solid var(--el-border-color-light);
  white-space: nowrap;
  overflow: hidden;
}

/* 折叠态：侧栏只有 64px 宽，三个字「流水线」需缩小字号 + 去字间距避免溢出 */
.aside-title.is-collapse {
  font-size: 15px;
  letter-spacing: 0;
}

.side-aside :deep(.el-menu) {
  background: #fff;
  border-right: none;
  flex: 1;
  overflow-y: auto;
}
</style>
