<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

/** 倒计时秒数，归零后自动跳首页 */
const COUNTDOWN_FROM = 10
const countdown = ref(COUNTDOWN_FROM)

let timer: ReturnType<typeof setInterval> | null = null

function goHome() {
  stopTimer()
  router.push('/')
}

function startTimer() {
  timer = setInterval(() => {
    countdown.value -= 1
    if (countdown.value <= 0) {
      goHome()
    }
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onMounted(startTimer)
onUnmounted(stopTimer)
</script>

<template>
  <div class="not-found">
    <div class="not-found__code">404</div>
    <div class="not-found__title">页面不存在</div>
    <div class="not-found__desc">
      抱歉，您访问的页面走丢了。{{ countdown }} 秒后自动返回首页，或立即点击下方按钮。
    </div>
    <el-button type="primary" @click="goHome">返回首页</el-button>
  </div>
</template>

<style scoped>
.not-found {
  height: 100vh;
  width: 100vw;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #fff;
}

.not-found__code {
  font-size: 120px;
  font-weight: bold;
  line-height: 1;
  color: var(--el-color-primary);
}

.not-found__title {
  font-size: 24px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.not-found__desc {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  margin-bottom: 8px;
}
</style>
