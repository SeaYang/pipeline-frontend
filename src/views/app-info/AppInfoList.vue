<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import { pageAppInfo, type AppInfo, type AppInfoQuery } from '@/api/appInfo'
import { formatDateTime } from '@/utils/time'

const router = useRouter()

/** 点击应用名称 → 进入该 appName 维度的流水线列表 */
function goPipeline(appName: string) {
  router.push(`/pipeline/list/${encodeURIComponent(appName)}`)
}

/** 点击配置 → 进入应用配置页 */
function goConfig(appName: string) {
  router.push(`/app-config/${encodeURIComponent(appName)}`)
}

const loading = ref(false)
const list = ref<AppInfo[]>([])
const total = ref(0)

const query = reactive<AppInfoQuery>({
  appName: '',
  sortField: 'updateTime',
  sortOrder: 'desc',
  pageNum: 1,
  pageSize: 10,
})

/** 分页查询应用信息 */
async function fetchData() {
  loading.value = true
  try {
    const res = await pageAppInfo(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '应用信息列表获取失败')
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

function handlePageChange() {
  fetchData()
}

function handleSizeChange() {
  query.pageNum = 1
  fetchData()
}

/** 服务端排序：el-table 的 ascending/descending 转为后端 asc/desc */
function handleSortChange({
  prop,
  order,
}: {
  prop?: string | null
  order?: 'ascending' | 'descending' | null
}) {
  if (prop && order) {
    query.sortField = prop
    query.sortOrder = order === 'ascending' ? 'asc' : 'desc'
  } else {
    query.sortField = undefined
    query.sortOrder = undefined
  }
  query.pageNum = 1
  fetchData()
}

onMounted(fetchData)
</script>

<template>
  <div class="app-info-list">
    <div class="list-header">
      <h3 class="title">应用信息</h3>
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
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      :default-sort="{ prop: 'updateTime', order: 'descending' }"
      style="width: 100%"
      empty-text="暂无应用信息"
      @sort-change="handleSortChange"
    >
      <el-table-column label="ID" prop="id" width="80" />
      <el-table-column label="应用名称" prop="appName" min-width="160" sortable="custom">
        <template #default="{ row }">
          <el-link type="primary" :underline="false" @click="goPipeline(row.appName)">
            {{ row.appName }}
          </el-link>
        </template>
      </el-table-column>
      <el-table-column
        label="编程语言"
        prop="programmingLanguage"
        min-width="120"
        sortable="custom"
      />
      <el-table-column
        label="应用描述"
        prop="description"
        min-width="200"
        show-overflow-tooltip
      />
      <el-table-column
        label="Git地址"
        prop="gitSshUrl"
        min-width="280"
        show-overflow-tooltip
        sortable="custom"
      />
      <el-table-column label="创建时间" prop="createTime" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" prop="updateTime" min-width="170" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="goPipeline(row.appName)">流水线</el-button>
          <el-button type="success" link size="small" @click="goConfig(row.appName)">配置</el-button>
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
.app-info-list {
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
}

.search-input {
  width: 240px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
