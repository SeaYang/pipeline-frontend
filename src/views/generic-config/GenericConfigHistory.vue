<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import {
  historyPage,
  type GenericConfigHistory,
  type GenericConfigHistoryQuery,
} from '@/api/genericConfig'
import { formatDateTime } from '@/utils/time'

const loading = ref(false)
const list = ref<GenericConfigHistory[]>([])
const total = ref(0)

const query = reactive<GenericConfigHistoryQuery>({
  configKey: '',
  action: '',
  operator: '',
  pageNum: 1,
  pageSize: 10,
})

const actionTagType: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
  CREATE: 'success',
  UPDATE: '',
  DELETE: 'danger',
}

const actionLabel: Record<string, string> = {
  CREATE: '新建',
  UPDATE: '修改',
  DELETE: '删除',
}

async function fetchData() {
  loading.value = true
  try {
    const res = await historyPage(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '变更历史获取失败')
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

/** 格式化值用于展示（截断长文本） */
function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

onMounted(fetchData)
</script>

<template>
  <div class="history-tab">
    <div class="search-bar">
      <el-input
        v-model="query.configKey"
        placeholder="配置键"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select v-model="query.action" placeholder="操作类型" clearable class="search-select" @change="handleSearch">
        <el-option label="新建" value="CREATE" />
        <el-option label="修改" value="UPDATE" />
        <el-option label="删除" value="DELETE" />
      </el-select>
      <el-input
        v-model="query.operator"
        placeholder="操作人"
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
      style="width: 100%"
      empty-text="暂无变更历史"
    >
      <el-table-column label="ID" prop="id" width="70" />
      <el-table-column label="配置键" prop="configKey" min-width="160" show-overflow-tooltip />
      <el-table-column label="操作类型" prop="action" width="90">
        <template #default="{ row }">
          <el-tag :type="actionTagType[row.action] || 'info'" size="small">
            {{ actionLabel[row.action] || row.action }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="变更前值" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ formatValue(row.oldValue) }}</template>
      </el-table-column>
      <el-table-column label="变更后值" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ formatValue(row.newValue) }}</template>
      </el-table-column>
      <el-table-column label="变更摘要" prop="changeSummary" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作人" prop="operator" width="110" />
      <el-table-column label="操作时间" prop="operateTime" width="170">
        <template #default="{ row }">{{ formatDateTime(row.operateTime) }}</template>
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
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input {
  width: 200px;
}

.search-select {
  width: 140px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
