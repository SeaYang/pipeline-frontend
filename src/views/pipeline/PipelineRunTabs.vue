<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getPipeline } from '@/api/pipeline'

const props = defineProps<{ pipelineId: string }>()
const route = useRoute()
const router = useRouter()

const pipelineName = ref('')

async function fetchPipelineName() {
  try {
    const pipeline = await getPipeline(Number(props.pipelineId))
    pipelineName.value = pipeline.name
  } catch {
    pipelineName.value = ''
  }
}

const activeTab = computed<string>(() => (route.name === 'pipeline-run-history' ? 'history' : 'latest'))

function handleTabChange(name: string | number) {
  router.push(`/pipeline/${props.pipelineId}/run/${name}`)
}

onMounted(fetchPipelineName)
</script>

<template>
  <div class="pipeline-run-tabs">
    <div class="header">
      <!-- <el-button link @click="router.push('/pipeline/list')">返回</el-button> -->
      <h3 class="title">{{ pipelineName || `流水线 #${pipelineId}` }}</h3>
    </div>

    <el-tabs :model-value="activeTab" class="tabs" @tab-change="handleTabChange">
      <el-tab-pane label="最近运行" name="latest" />
      <el-tab-pane label="运行历史" name="history" />
    </el-tabs>

    <router-view class="tab-content" />
  </div>
</template>

<style scoped>
.pipeline-run-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 20px;
  box-sizing: border-box;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 4px;
  flex: 0 0 auto;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.tabs {
  margin-bottom: 8px;
  flex: 0 0 auto;
}

.tab-content {
  flex: 1;
  min-height: 0;
}
</style>
