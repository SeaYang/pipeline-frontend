<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { pageArtifact, type Artifact, type ArtifactQuery, type ArtifactType } from '@/api/artifact'
import { formatDateTime } from '@/utils/time'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const list = ref<Artifact[]>([])
const total = ref(0)

const query = reactive<ArtifactQuery>({
  appName: (route.query.appName ? String(route.query.appName) : '') as string,
  name: '',
  gitBranch: '',
  env: '',
  type: undefined,
  sortField: 'id',
  sortOrder: 'desc',
  pageNum: 1,
  pageSize: 10,
})

async function fetchData() {
  loading.value = true
  try {
    const res = await pageArtifact(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '制品列表获取失败')
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  syncAppNameToQuery()
  fetchData()
}

function handlePageChange() {
  fetchData()
}

function handleSizeChange() {
  query.pageNum = 1
  fetchData()
}

/** 服务端排序：el-table 的 ascending/descending 转为后端 asc/desc */
function handleSortChange({ prop, order }: { prop?: string | null; order?: 'ascending' | 'descending' | null }) {
  if (prop && order) {
    query.sortField = prop
    query.sortOrder = order === 'ascending' ? 'asc' : 'desc'
  } else {
    query.sortField = 'id'
    query.sortOrder = 'desc'
  }
  query.pageNum = 1
  fetchData()
}

/** 类型 Tag 颜色 */
function typeTagType(type?: ArtifactType) {
  return type === 'IMAGE' ? 'success' : 'info'
}

/** 类型中文标签 */
function typeLabel(type?: ArtifactType) {
  return type === 'IMAGE' ? '镜像' : '原始'
}

/** 制品大小格式化 */
function formatSize(bytes?: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/** sha256 截断显示 */
function shortSha(sha?: string): string {
  if (!sha) return '-'
  return sha.length > 12 ? sha.substring(0, 12) + '...' : sha
}

/** 跳转流水线详情（新标签页） */
function goPipelineDetail(pipelineRunName?: string) {
  if (!pipelineRunName) return
  const url = router.resolve(`/pipeline/execute-detail/${encodeURIComponent(pipelineRunName)}`).href
  window.open(url, '_blank')
}

onMounted(fetchData)

/** 将 appName 同步到 URL query，便于跨页面传递 */
function syncAppNameToQuery() {
  const appName = query.appName || ''
  const current = route.query.appName ? String(route.query.appName) : ''
  if (appName !== current) {
    router.replace({ query: { ...route.query, appName: appName || undefined } })
  }
}

/** 监听外部修改 URL query.appName（如从其他页面跳转带过来） */
watch(
  () => route.query.appName,
  (val) => {
    const name = val ? String(val) : ''
    if (name !== query.appName) {
      query.appName = name
      query.pageNum = 1
      fetchData()
    }
  },
)
</script>

<template>
  <div class="artifact-list">
    <div class="list-header">
      <h3 class="title">制品管理</h3>
    </div>
    <div class="search-bar">
      <el-input
        v-model="query.appName"
        placeholder="应用名称"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-input
        v-model="query.name"
        placeholder="制品名称"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-input
        v-model="query.gitBranch"
        placeholder="分支"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select v-model="query.env" placeholder="环境" clearable class="search-select" @change="handleSearch">
        <el-option label="dev" value="dev" />
        <el-option label="test" value="test" />
        <el-option label="prod" value="prod" />
      </el-select>
      <el-select v-model="query.type" placeholder="类型" clearable class="search-select" @change="handleSearch">
        <el-option label="原始制品" value="RAW" />
        <el-option label="镜像制品" value="IMAGE" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
    </div>
    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      :default-sort="{ prop: 'id', order: 'descending' }"
      style="width: 100%"
      empty-text="暂无制品信息"
      @sort-change="handleSortChange"
    >
      <el-table-column label="ID" prop="id" width="80" sortable="custom" />
      <el-table-column label="应用名称" prop="appName" min-width="140" sortable="custom" show-overflow-tooltip />
      <el-table-column label="制品名称" prop="name" min-width="180" show-overflow-tooltip />
      <el-table-column label="类型" prop="type" width="90" sortable="custom">
        <template #default="{ row }">
          <el-tag :type="typeTagType(row.type)" size="small">
            {{ typeLabel(row.type) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="分支" prop="gitBranch" min-width="120" show-overflow-tooltip />
      <el-table-column label="环境" prop="env" width="80" />
      <el-table-column label="构建人" prop="buildUser" min-width="100" show-overflow-tooltip />
      <el-table-column label="大小" prop="size" width="100" sortable="custom">
        <template #default="{ row }">{{ formatSize(row.size) }}</template>
      </el-table-column>
      <el-table-column label="SHA256" prop="sha256" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ shortSha(row.sha256) }}</template>
      </el-table-column>
      <el-table-column label="构建时间" prop="buildTime" min-width="170" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.buildTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="110" fixed="right">
        <template #default="{ row }">
          <el-button
            v-if="row.pipelineRunName"
            link
            type="primary"
            size="small"
            @click="goPipelineDetail(row.pipelineRunName)"
          >
            流水线详情
          </el-button>
          <span v-else>-</span>
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
  </div>
</template>

<style scoped>
.artifact-list {
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

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.search-input {
  width: 180px;
}

.search-select {
  width: 130px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
