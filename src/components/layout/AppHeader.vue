<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ArrowDown, Fold, Expand, User } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'

defineProps<{ isCollapse: boolean }>()
const emit = defineEmits<{ (e: 'toggle-collapse'): void }>()

const router = useRouter()
const userStore = useUserStore()

/** 下拉命令处理：目前仅退出登录 */
function handleCommand(command: string) {
  if (command === 'logout') {
    userStore.logout()
    router.replace('/login')
  }
}

/** 未登录态的登录入口（守卫通常已先拦截，这里做兜底） */
function goLogin() {
  router.push('/login')
}
</script>

<template>
  <el-header height="60px" class="app-header">
    <div class="header-left">
      <el-icon class="collapse-icon" @click="emit('toggle-collapse')">
        <Fold v-if="!isCollapse" />
        <Expand v-else />
      </el-icon>
    </div>
    <div class="toolbar">
      <!-- 已登录：显示账号 + 下拉（仅退出登录） -->
      <el-dropdown v-if="userStore.account" @command="handleCommand">
        <span class="account-trigger">
          <el-icon class="account-icon"><User /></el-icon>
          <span class="account-name">{{ userStore.account }}</span>
          <el-icon class="arrow-icon"><ArrowDown /></el-icon>
        </span>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="logout">退出登录</el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
      <!-- 未登录：登录入口 -->
      <span v-else class="account-trigger" @click="goLogin">
        <el-icon class="account-icon"><User /></el-icon>
        <span class="account-name">登录</span>
      </span>
    </div>
  </el-header>
</template>

<style scoped>
.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: #fff;
  color: var(--el-text-color-primary);
  padding: 0 20px;
  /* 白底与主内容区的分界线 */
  border-bottom: 1px solid var(--el-border-color-light);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.collapse-icon {
  font-size: 20px;
  cursor: pointer;
}

.collapse-icon:hover {
  color: var(--el-color-primary);
}

.toolbar {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.account-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  outline: none;
  color: var(--el-text-color-primary);
  transition: color 0.2s;
}

.account-trigger:hover {
  color: var(--el-color-primary);
}

.account-icon {
  font-size: 18px;
}

.account-name {
  font-size: 14px;
}

.arrow-icon {
  font-size: 12px;
}
</style>
