<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

defineProps<{ isCollapse: boolean }>()

const router = useRouter()
const route = useRoute()

/**
 * 根据当前路由路径计算高亮的菜单 index。
 * <p>菜单顺序：1=应用信息、2=流水线、3=后台配置、4=Argo后台管理。
 * 支持子路由高亮父菜单：如 /pipeline/:id/run/latest 属于「流水线列表」，
 * /pipeline/execute-detail/:name 属于「流水线列表」（从流水线列表执行/历史跳入），
 * /dict/data/:dictType 属于「字典配置」。
 */
const activeMenu = computed(() => {
  const path = route.path
  // 应用列表
  if (path === '/app-list') return '1-1'
  // 流水线列表及其子页面（最近运行 / 运行历史 / 执行详情）
  if (path.startsWith('/pipeline/list') || path.startsWith('/pipeline/') || path.startsWith('/pipeline/execute-detail')) {
    return '2-1'
  }
  // 制品管理
  if (path.startsWith('/artifact-list')) return '2-2'
  // 后台配置
  if (path.startsWith('/dict')) return '3-2'
  if (path.startsWith('/task-template')) return '3-3'
  if (path.startsWith('/pipeline-template')) return '3-4'
  if (path.startsWith('/pipeline-parameter')) return '3-5'
  if (path.startsWith('/trigger-event-enum')) return '3-6'
  if (path.startsWith('/template-event-bind')) return '3-7'
  if (path.startsWith('/generic-config')) return '3-8'
  // Argo 后台管理
  if (path.startsWith('/argo/pipelines')) return '4-1'
  return ''
})

const handleMenuClick = (index: string) => {
  switch (index) {
    case '1-1':
      router.push('/app-list')
      break
    case '2-1':
      router.push('/pipeline/list')
      break
    case '2-2':
      router.push('/artifact-list')
      break
    case '3-2':
      router.push('/dict/type')
      break
    case '3-3':
      router.push('/task-template')
      break
    case '3-4':
      router.push('/pipeline-template')
      break
    case '3-5':
      router.push('/pipeline-parameter')
      break
    case '3-6':
      router.push('/trigger-event-enum')
      break
    case '3-7':
      router.push('/template-event-bind')
      break
    case '3-8':
      router.push('/generic-config')
      break
    case '4-1':
      router.push('/argo/pipelines')
      break
  }
}
</script>

<template>
  <el-aside class="side-aside" :width="isCollapse ? '64px' : '200px'">
    <div
      class="aside-title"
      :class="{ 'is-collapse': isCollapse }"
      title="返回首页"
      @click="router.push('/')"
    >
      <span v-if="!isCollapse">流水线平台</span>
      <span v-else>流水线</span>
    </div>
    <el-menu
      :collapse="isCollapse"
      :collapse-transition="false"
      :default-openeds="['1', '2', '3', '4']"
      :default-active="activeMenu"
      @select="handleMenuClick"
    >
      <el-sub-menu index="1">
        <template #title>
          <el-icon><InfoFilled /></el-icon>
          <span>应用信息</span>
        </template>
        <el-menu-item index="1-1">应用列表</el-menu-item>
      </el-sub-menu>
      <el-sub-menu index="2">
        <template #title>
          <el-icon><Connection /></el-icon>
          <span>流水线</span>
        </template>
        <el-menu-item index="2-1">流水线列表</el-menu-item>
        <el-menu-item index="2-2">制品管理</el-menu-item>
      </el-sub-menu>
      <el-sub-menu index="3">
        <template #title>
          <el-icon><Setting /></el-icon>
          <span>后台配置</span>
        </template>
        <el-menu-item index="3-2">字典配置</el-menu-item>
        <el-menu-item index="3-3">任务模板</el-menu-item>
        <el-menu-item index="3-4">流水线模板</el-menu-item>
        <el-menu-item index="3-5">流水线参数</el-menu-item>
        <el-menu-item index="3-6">触发事件枚举</el-menu-item>
        <el-menu-item index="3-7">模板事件配置</el-menu-item>
        <el-menu-item index="3-8">通用配置</el-menu-item>
      </el-sub-menu>
      <el-sub-menu index="4">
        <template #title>
          <el-icon><DataBoard /></el-icon>
          <span>Argo后台管理</span>
        </template>
        <el-menu-item index="4-1">流水线页面</el-menu-item>
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
  cursor: pointer;
  user-select: none;
  transition: color 0.2s;
}

.aside-title:hover {
  color: var(--el-color-primary);
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
