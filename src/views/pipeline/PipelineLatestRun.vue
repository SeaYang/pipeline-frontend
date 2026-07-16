<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getLatestPipelineRun } from '@/api/pipeline'
// 复用 argo 流水线详情页的 vue-flow 展示组件（同一份逻辑，多个入口共用），本页内直接展示，不跳转路由
import ArgoPipelineDetail from '@/views/argo/PipelineDetail.vue'

const props = defineProps<{ pipelineId: string }>()

const loading = ref(true)
const runName = ref('')
const notFound = ref(false)

/** 查询最近一次执行记录，拿到 workflow 名称后在本页内嵌展示 vue-flow */
async function fetchLatest() {
  loading.value = true
  notFound.value = false
  runName.value = ''
  try {
    const run = await getLatestPipelineRun(Number(props.pipelineId))
    if (run?.name) {
      runName.value = run.name
    } else {
      notFound.value = true
    }
  } catch (e) {
    ElMessage.error((e as Error)?.message || '最近执行记录获取失败')
    notFound.value = true
  } finally {
    loading.value = false
  }
}

onMounted(fetchLatest)
</script>

<template>
  <div v-loading="loading" class="latest-run">
    <el-empty v-if="!loading && notFound" description="该流水线暂无执行记录" />
    <ArgoPipelineDetail v-else-if="runName" :name="runName" />
  </div>
</template>

<style scoped>
.latest-run {
  height: 100%;
}
</style>

