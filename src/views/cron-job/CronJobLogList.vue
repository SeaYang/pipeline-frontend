<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, VideoPause, View, Close } from '@element-plus/icons-vue'
import {
  pageCronJobLog,
  stopCronJobLog,
  cronJobLogStatusLabel,
  type CronJobLog,
  type CronJobLogQuery,
} from '@/api/cronJob'
import { formatDateTime, formatDuration } from '@/utils/time'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const list = ref<CronJobLog[]>([])
const total = ref(0)
/** 从任务列表页跳转过来时携带的任务名称，仅用于展示筛选提示，不参与查询 */
const filterJobName = ref((route.query.jobName as string) || '')

const query = reactive<CronJobLogQuery>({
  jobId: route.query.jobId ? Number(route.query.jobId) : undefined,
  status: '',
  pageNum: 1,
  pageSize: 10,
})

const statusTagType: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
  running: 'warning',
  succeeded: 'success',
  failed: 'danger',
}

async function fetchData() {
  loading.value = true
  try {
    const res = await pageCronJobLog(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '执行日志获取失败')
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  fetchData()
}

function clearJobFilter() {
  query.jobId = undefined
  filterJobName.value = ''
  router.replace({ path: '/cron-job/log' })
  handleSearch()
}

function handlePageChange() {
  fetchData()
}

function handleSizeChange() {
  query.pageNum = 1
  fetchData()
}

onMounted(fetchData)

// ==================== 停止任务 ====================

async function handleStop(row: CronJobLog) {
  try {
    await ElMessageBox.confirm(
      '停止操作会尝试中断任务执行。如果任务正在等待外部响应（如 HTTP 请求），可能需要等待其自然完成。',
      '停止确认',
      { type: 'warning', confirmButtonText: '停止', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await stopCronJobLog(row.id)
    ElMessage.success('已发起停止请求')
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '停止失败')
  }
}

// ==================== 详情 ====================

const detailVisible = ref(false)
const detailRow = ref<CronJobLog | null>(null)

function openDetail(row: CronJobLog) {
  detailRow.value = row
  detailVisible.value = true
}
</script>

<template>
  <div class="cron-job-log-list">
    <div class="list-header">
      <h3 class="title">定时任务执行日志</h3>
    </div>

    <div v-if="filterJobName" class="filter-tip">
      当前仅展示任务「{{ filterJobName }}」的执行日志
      <el-button link type="primary" :icon="Close" @click="clearJobFilter">清除筛选</el-button>
    </div>

    <div class="search-bar">
      <el-select v-model="query.status" placeholder="执行状态" clearable class="search-select" @change="handleSearch">
        <el-option label="执行中" value="running" />
        <el-option label="成功" value="succeeded" />
        <el-option label="失败" value="failed" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe style="width: 100%" empty-text="暂无执行日志">
      <el-table-column label="ID" prop="id" width="70" />
      <el-table-column label="任务名称" prop="jobName" min-width="140" show-overflow-tooltip />
      <el-table-column label="Bean.方法" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ row.beanName }}.{{ row.methodName }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="statusTagType[row.status] || 'info'" size="small">
            {{ cronJobLogStatusLabel[row.status] || row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="执行实例IP" prop="instanceIp" width="130" />
      <el-table-column label="开始时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.startTime) }}</template>
      </el-table-column>
      <el-table-column label="结束时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.endTime) }}</template>
      </el-table-column>
      <el-table-column label="耗时" width="90">
        <template #default="{ row }">{{ formatDuration(row.startTime, row.endTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="150" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="openDetail(row)">详情</el-button>
          <el-button
            v-if="row.status === 'running'"
            link
            type="danger"
            :icon="VideoPause"
            @click="handleStop(row)"
          >
            停止
          </el-button>
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

    <!-- 执行详情弹框 -->
    <el-dialog v-model="detailVisible" title="执行详情" width="600px">
      <el-descriptions v-if="detailRow" :column="1" border>
        <el-descriptions-item label="任务名称">{{ detailRow.jobName }}</el-descriptions-item>
        <el-descriptions-item label="Bean.方法">{{ detailRow.beanName }}.{{ detailRow.methodName }}</el-descriptions-item>
        <el-descriptions-item label="方法参数">{{ detailRow.methodParams || '-' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusTagType[detailRow.status] || 'info'" size="small">
            {{ cronJobLogStatusLabel[detailRow.status] || detailRow.status }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="执行实例IP">{{ detailRow.instanceIp || '-' }}</el-descriptions-item>
        <el-descriptions-item label="开始时间">{{ formatDateTime(detailRow.startTime) }}</el-descriptions-item>
        <el-descriptions-item label="结束时间">{{ formatDateTime(detailRow.endTime) }}</el-descriptions-item>
        <el-descriptions-item label="耗时">{{ formatDuration(detailRow.startTime, detailRow.endTime) }}</el-descriptions-item>
        <el-descriptions-item label="消息">
          <div class="detail-message">{{ detailRow.message || '-' }}</div>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<style scoped>
.cron-job-log-list {
  padding: 16px 20px;
}
.list-header {
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
.filter-tip {
  margin-bottom: 12px;
  padding: 8px 12px;
  background-color: var(--el-color-primary-light-9);
  border-radius: 4px;
  font-size: 13px;
  color: var(--el-text-color-regular);
}
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.search-select {
  width: 140px;
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.detail-message {
  max-height: 300px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: monospace;
  font-size: 12px;
}
</style>
