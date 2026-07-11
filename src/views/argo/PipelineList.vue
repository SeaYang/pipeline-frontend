<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import { listWorkflows, type ArgoWorkflowItem } from '@/api/argo'
import { formatDateTime, formatDuration, formatRelative } from '@/utils/time'

const loading = ref(false)
const workflows = ref<ArgoWorkflowItem[]>([])

/** phase → el-tag 类型 */
function phaseTagType(phase?: string) {
  switch (phase) {
    case 'Succeeded':
      return 'success'
    case 'Failed':
    case 'Error':
      return 'danger'
    case 'Running':
      return 'primary'
    case 'Pending':
      return 'warning'
    default:
      return 'info'
  }
}

/** 拉取流水线列表 */
async function fetchData() {
  loading.value = true
  try {
    const res = await listWorkflows()
    workflows.value = res?.items ?? []
  } catch {
    ElMessage.error('流水线列表获取失败')
    workflows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="pipeline-list">
    <div class="pipeline-list__header">
      <h3 class="title">流水线列表</h3>
      <el-button :icon="Refresh" :loading="loading" @click="fetchData">刷新</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="workflows"
      border
      stripe
      style="width: 100%"
      empty-text="暂无流水线数据"
    >
      <el-table-column label="名称" min-width="240" fixed>
        <template #default="{ row }">
          <router-link
            v-if="row.metadata?.name"
            class="name-link"
            :to="`/argo/pipelines/${encodeURIComponent(row.metadata.name)}`"
          >
            {{ row.metadata.name }}
          </router-link>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column label="命名空间" width="120">
        <template #default="{ row }">
          {{ row.metadata?.namespace }}
        </template>
      </el-table-column>

      <el-table-column label="开始时间" min-width="130">
        <template #default="{ row }">
          <span v-if="row.status?.startedAt" class="time-cell">
            <span class="time-ago">{{ formatRelative(row.status.startedAt) }}</span>
            <span>{{ formatDateTime(row.status.startedAt) }}</span>
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column label="结束时间" min-width="130">
        <template #default="{ row }">
          <span v-if="row.status?.finishedAt" class="time-cell">
            <span class="time-ago">{{ formatRelative(row.status.finishedAt) }}</span>
            <span>{{ formatDateTime(row.status.finishedAt) }}</span>
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column label="耗时" width="120">
        <template #default="{ row }">
          {{ formatDuration(row.status?.startedAt, row.status?.finishedAt) }}
        </template>
      </el-table-column>

      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag v-if="row.status?.phase" size="small" :type="phaseTagType(row.status.phase)">
            {{ row.status.phase }}
          </el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>

      <el-table-column label="进度" width="120">
        <template #default="{ row }">
          {{ row.status?.progress ?? '-' }}
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.pipeline-list {
  padding: 16px 20px;
}

.pipeline-list__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.name-link {
  color: var(--el-color-primary);
  text-decoration: none;
}

.name-link:hover {
  opacity: 0.8;
}

/* 时间单元格：相对时间 + 绝对时间 在同一行展示，不换行 */
.time-cell {
  display: inline-flex;
  align-items: baseline;
  gap: 8px;
  white-space: nowrap;
}

.time-ago {
  flex: 0 0 auto;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
