<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  pagePipelineRun,
  pipelineRunStatusLabel,
  pipelineRunStatusTagType,
  type PipelineRun,
  type PipelineRunQuery,
} from '@/api/pipeline'
import { formatDateTime, formatDurationSeconds } from '@/utils/time'

const props = defineProps<{ pipelineId: string }>()
const router = useRouter()

const loading = ref(false)
const list = ref<PipelineRun[]>([])
const total = ref(0)

// 默认按 id 倒序，表格暂不支持字段排序
const query = reactive<PipelineRunQuery>({
  pipelineId: Number(props.pipelineId),
  sortField: 'id',
  sortOrder: 'desc',
  pageNum: 1,
  pageSize: 10,
})

async function loadList() {
  loading.value = true
  try {
    const res = await pagePipelineRun(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '运行历史获取失败')
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handlePageChange() {
  loadList()
}

function handleSizeChange() {
  query.pageNum = 1
  loadList()
}

/** 点击 id / name 进入流水线执行详情（vue-flow），按 name（即 workflowName）展示 */
function goDetail(name?: string) {
  if (!name) return
  router.push(`/pipeline/execute-detail/${encodeURIComponent(name)}`)
}

onMounted(loadList)
</script>

<template>
  <div class="run-history">
    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      style="width: 100%"
      empty-text="暂无执行记录"
    >
      <el-table-column label="ID" width="90">
        <template #default="{ row }">
          <a class="link" @click="goDetail(row.name)">{{ row.id }}</a>
        </template>
      </el-table-column>
      <el-table-column label="名称" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">
          <a class="link" @click="goDetail(row.name)">{{ row.name }}</a>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag size="small" :type="pipelineRunStatusTagType(row.status)">
            {{ row.status }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="状态中文名" width="110">
        <template #default="{ row }">{{ pipelineRunStatusLabel(row.status) }}</template>
      </el-table-column>
      <el-table-column label="运行时长" width="140">
        <template #default="{ row }">{{ formatDurationSeconds(row.duration) }}</template>
      </el-table-column>
      <el-table-column label="开始时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.startTime) }}</template>
      </el-table-column>
      <el-table-column label="结束时间" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.endTime) }}</template>
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
  </div>
</template>

<style scoped>
.run-history {
  padding-top: 8px;
}

.link {
  color: var(--el-color-primary);
  cursor: pointer;
}

.link:hover {
  text-decoration: underline;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
