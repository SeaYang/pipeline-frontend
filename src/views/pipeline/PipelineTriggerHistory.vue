<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { ArrowLeft } from '@element-plus/icons-vue'
import {
  pageTriggerHistory,
  triggerHistoryStatusTagType,
  type PipelineTriggerHistory,
  type PipelineTriggerHistoryQuery,
} from '@/api/triggerHistory'
import { formatDateTime } from '@/utils/time'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const list = ref<PipelineTriggerHistory[]>([])
const total = ref(0)

/** 从路由参数推断查询维度：有 pipelineId 参数则按 pipeline 维度，否则按 appName 维度 */
const queryPipelineId = computed<number | undefined>(() => {
  const raw = route.query.pipelineId ?? route.params.pipelineId
  return raw ? Number(raw) : undefined
})

const queryAppName = computed<string>(() => {
  return route.query.appName ? String(route.query.appName) : ''
})

const title = computed(() => {
  if (queryPipelineId.value) return `流水线 #${queryPipelineId.value} 触发历史`
  if (queryAppName.value) return `应用 ${queryAppName.value} 触发历史`
  return '触发历史'
})

const query = reactive<PipelineTriggerHistoryQuery>({
  pipelineId: queryPipelineId.value,
  appName: queryAppName.value || undefined,
  status: '',
  type: '',
  pageNum: 1,
  pageSize: 10,
})

async function loadList() {
  loading.value = true
  try {
    const res = await pageTriggerHistory(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '触发历史获取失败')
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  loadList()
}

function handlePageChange() {
  loadList()
}

function handleSizeChange() {
  query.pageNum = 1
  loadList()
}

// ============ 详情弹窗 ============
const detailVisible = ref(false)
const detailLoading = ref(false)
const detailData = ref<PipelineTriggerHistory | null>(null)

async function openDetail(row: PipelineTriggerHistory) {
  detailVisible.value = true
  detailLoading.value = true
  detailData.value = row
  try {
    detailData.value = await getTriggerHistoryDetail(row.id)
  } catch {
    // 使用列表数据兜底
  } finally {
    detailLoading.value = false
  }
}

/** 封装一下避免循环引用 */
async function getTriggerHistoryDetail(id: number): Promise<PipelineTriggerHistory> {
  const { getTriggerHistory } = await import('@/api/triggerHistory')
  return getTriggerHistory(id)
}

/** 格式化 JSON 字符串 */
function formatJson(str?: string): string {
  if (!str) return '-'
  try {
    return JSON.stringify(JSON.parse(str), null, 2)
  } catch {
    return str
  }
}

watch(
  () => [queryPipelineId.value, queryAppName.value],
  () => {
    query.pipelineId = queryPipelineId.value
    query.appName = queryAppName.value || undefined
    query.pageNum = 1
    loadList()
  },
)

onMounted(loadList)
</script>

<template>
  <div class="trigger-history">
    <div class="list-header">
      <el-button :icon="ArrowLeft" link @click="router.back()">返回</el-button>
      <h3 class="title">{{ title }}</h3>
    </div>

    <div class="toolbar">
      <el-select v-model="query.status" placeholder="状态" clearable style="width: 140px">
        <el-option label="成功" value="SUCCESS" />
        <el-option label="失败" value="FAILED" />
      </el-select>
      <el-input
        v-model="query.type as string"
        placeholder="触发类型"
        clearable
        style="width: 180px"
      />
      <el-button type="primary" @click="handleSearch">筛选</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      style="width: 100%"
      empty-text="暂无触发历史"
    >
      <el-table-column label="ID" prop="id" width="80" />
      <el-table-column label="应用" prop="appName" min-width="140" show-overflow-tooltip />
      <el-table-column label="流水线ID" prop="pipelineId" width="100" />
      <el-table-column label="执行记录ID" width="110">
        <template #default="{ row }">
          <span v-if="row.pipelineRunId">{{ row.pipelineRunId }}</span>
          <span v-else class="muted">-</span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="triggerHistoryStatusTagType(row.status)">
            {{ row.status === 'SUCCESS' ? '成功' : '失败' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="类型" prop="type" width="130" show-overflow-tooltip />
      <el-table-column label="触发人" prop="creator" min-width="120" show-overflow-tooltip />
      <el-table-column label="模板编码" prop="pipelineTemplateCode" min-width="200" show-overflow-tooltip />
      <el-table-column label="模板版本" prop="pipelineTemplateVersion" width="110" />
      <el-table-column label="触发时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openDetail(row)">详情</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 详情弹窗 -->
    <el-dialog v-model="detailVisible" title="触发历史详情" width="700px" destroy-on-close>
      <div v-loading="detailLoading">
        <el-descriptions v-if="detailData" :column="2" border>
          <el-descriptions-item label="ID">{{ detailData.id }}</el-descriptions-item>
          <el-descriptions-item label="应用">{{ detailData.appName }}</el-descriptions-item>
          <el-descriptions-item label="流水线ID">{{ detailData.pipelineId }}</el-descriptions-item>
          <el-descriptions-item label="执行记录ID">
            {{ detailData.pipelineRunId ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="事件绑定ID">
            {{ detailData.pipelineEventBindId || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag size="small" :type="triggerHistoryStatusTagType(detailData.status)">
              {{ detailData.status === 'SUCCESS' ? '成功' : '失败' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="类型">{{ detailData.type }}</el-descriptions-item>
          <el-descriptions-item label="触发人">{{ detailData.creator }}</el-descriptions-item>
          <el-descriptions-item label="模板编码">{{ detailData.pipelineTemplateCode }}</el-descriptions-item>
          <el-descriptions-item label="模板版本">
            {{ detailData.pipelineTemplateVersion ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="触发时间">
            {{ formatDateTime(detailData.createTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="错误信息" :span="2">
            <span v-if="detailData.errorMessage" class="error-text">{{ detailData.errorMessage }}</span>
            <span v-else class="muted">-</span>
          </el-descriptions-item>
          <el-descriptions-item label="请求体" :span="2">
            <pre v-if="detailData.requestBody" class="json-block">{{ formatJson(detailData.requestBody) }}</pre>
            <span v-else class="muted">-</span>
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.trigger-history {
  padding: 16px 20px;
}

.list-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
}

.title {
  margin: 0;
  font-size: 16px;
}

.toolbar {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.muted {
  color: var(--el-text-color-placeholder);
}

.error-text {
  color: var(--el-color-danger);
  word-break: break-all;
}

.json-block {
  margin: 0;
  padding: 12px;
  max-height: 300px;
  overflow: auto;
  background: var(--el-fill-color-light);
  border-radius: 4px;
  font-size: 13px;
  line-height: 1.5;
  white-space: pre-wrap;
  word-break: break-all;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
