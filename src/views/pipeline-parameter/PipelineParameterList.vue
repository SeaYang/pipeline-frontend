<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Search, Delete } from '@element-plus/icons-vue'
import {
  pagePipelineParameter,
  deletePipelineParameter,
  paramTypeEnums,
  componentTypeEnums,
  type PipelineParameter,
  type PipelineParameterQuery,
  type EnumOption,
} from '@/api/pipelineParameter'
import { listDictData, type DictData } from '@/api/dict'
import { formatDateTime } from '@/utils/time'

const router = useRouter()

// ==================== 列表数据 ====================
const loading = ref(false)
const list = ref<PipelineParameter[]>([])
const total = ref(0)

const query = reactive<PipelineParameterQuery>({
  name: '',
  label: '',
  paramType: '',
  paramGroup: '',
  sortField: 'id',
  sortOrder: 'asc',
  pageNum: 1,
  pageSize: 10,
})

async function fetchData() {
  loading.value = true
  try {
    const res = await pagePipelineParameter(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '列表获取失败')
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

function handleSortChange({ prop, order }: { prop?: string | null; order?: 'ascending' | 'descending' | null }) {
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

// ==================== 枚举/字典 ====================
const paramTypes = ref<EnumOption[]>([])
const componentTypes = ref<EnumOption[]>([])
const groupOptions = ref<DictData[]>([])

onMounted(async () => {
  try {
    const [pt, ct] = await Promise.all([paramTypeEnums(), componentTypeEnums()])
    paramTypes.value = pt
    componentTypes.value = ct
  } catch {
    paramTypes.value = [
      { code: 'system', description: '系统参数' },
      { code: 'user', description: '用户参数' },
    ]
    componentTypes.value = [
      { code: 'input', description: '输入框' },
      { code: 'select', description: '下拉框' },
      { code: 'radio', description: '单选框组' },
      { code: 'radio-button-group', description: '按钮单选组' },
      { code: 'git-tree', description: 'Git目录树' },
      { code: 'disabled-input', description: '只读输入框' },
      { code: 'hidden', description: '隐藏' },
    ]
  }
  try {
    groupOptions.value = await listDictData('pipeline-parameter-group')
  } catch {
    groupOptions.value = []
  }
  fetchData()
})

function paramTypeText(code: string): string {
  return paramTypes.value.find((o) => o.code === code)?.description ?? code
}

function componentTypeText(code?: string): string {
  if (!code) return '-'
  return componentTypes.value.find((o) => o.code === code)?.description ?? code
}

function groupText(code?: string): string {
  if (!code) return '-'
  return groupOptions.value.find((g) => g.dictValue === code)?.dictKey ?? code
}

/** 解析依赖参数 JSON 字符串为参数名数组 */
function parseDependParams(json?: string): string[] {
  if (!json) return []
  try {
    return JSON.parse(json) as string[]
  } catch {
    return []
  }
}

// ==================== 跳转 ====================
function goCreate() {
  router.push('/pipeline-parameter/create')
}

function goDetail(row: PipelineParameter) {
  router.push(`/pipeline-parameter/${encodeURIComponent(row.name)}`)
}

// ==================== 删除 ====================
async function handleDelete(row: PipelineParameter) {
  try {
    await ElMessageBox.confirm(`确定要删除参数「${row.label}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deletePipelineParameter(row.id!)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '删除失败')
  }
}
</script>

<template>
  <div class="param-list">
    <!-- 标题 -->
    <div class="list-header">
      <h3 class="title">流水线参数管理</h3>
    </div>

    <!-- 搜索栏 -->
    <div class="search-bar">
      <el-input
        v-model="query.name"
        placeholder="参数名"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-input
        v-model="query.label"
        placeholder="中文名称"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select
        v-model="query.paramType"
        placeholder="参数类型"
        clearable
        class="search-select"
        @change="handleSearch"
      >
        <el-option v-for="opt in paramTypes" :key="opt.code" :label="opt.description" :value="opt.code" />
      </el-select>
      <el-select
        v-model="query.paramGroup"
        placeholder="参数组别"
        clearable
        filterable
        class="search-select"
        @change="handleSearch"
      >
        <el-option v-for="g in groupOptions" :key="g.dictValue" :label="g.dictKey" :value="g.dictValue" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button type="primary" :icon="Plus" class="create-btn" @click="goCreate">新增</el-button>
    </div>

    <!-- 表格 -->
    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      :default-sort="{ prop: 'id', order: 'ascending' }"
      style="width: 100%"
      empty-text="暂无数据"
      @sort-change="handleSortChange"
    >
      <el-table-column label="ID" prop="id" width="70" sortable="custom" />
      <el-table-column label="参数名" prop="name" min-width="140" sortable="custom">
        <template #default="{ row }">
          <span class="param-name-link" @click="goDetail(row)">{{ row.name }}</span>
        </template>
      </el-table-column>
      <el-table-column label="中文名称" prop="label" min-width="120" />
      <el-table-column label="描述" prop="description" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.description ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="参数类型" prop="paramType" width="110" sortable="custom">
        <template #default="{ row }">
          <el-tag :type="row.paramType === 'system' ? 'info' : 'success'" size="small">
            {{ paramTypeText(row.paramType) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="组件类型" prop="componentType" width="120" sortable="custom">
        <template #default="{ row }">{{ componentTypeText(row.componentType) }}</template>
      </el-table-column>
      <el-table-column label="必填" prop="required" width="80" align="center" sortable="custom">
        <template #default="{ row }">
          <el-tag :type="row.required ? 'danger' : 'info'" size="small">
            {{ row.required ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="系统处理" prop="needSystemProcess" width="120" align="center" sortable="custom">
        <template #default="{ row }">
          <el-tag :type="row.needSystemProcess ? 'warning' : 'info'" size="small">
            {{ row.needSystemProcess ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="参数组别" prop="paramGroup" width="120" sortable="custom">
        <template #default="{ row }">{{ groupText(row.paramGroup) }}</template>
      </el-table-column>
      <el-table-column label="组内排序" prop="paramGroupSort" width="90" align="center" />
      <el-table-column label="依赖参数" prop="dependParams" min-width="180">
        <template #default="{ row }">
          <div v-if="parseDependParams(row.dependParams).length > 0" class="depend-tags">
            <el-tag
              v-for="name in parseDependParams(row.dependParams)"
              :key="name"
              type="primary"
              size="small"
              class="depend-tag"
            >
              {{ name }}
            </el-tag>
          </div>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="默认值" prop="defaultValue" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.defaultValue ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="正则校验" prop="regexPattern" min-width="120" show-overflow-tooltip>
        <template #default="{ row }">{{ row.regexPattern ?? '-' }}</template>
      </el-table-column>
      <el-table-column label="创建人" prop="creator" width="100" sortable="custom" />
      <el-table-column label="创建时间" prop="createTime" min-width="170" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" prop="updateTime" min-width="170" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="100" fixed="right">
        <template #default="{ row }">
          <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
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
.param-list {
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
  width: 160px;
}
.create-btn {
  margin-left: auto;
}
.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
.param-name-link {
  color: var(--el-color-primary);
  cursor: pointer;
}
.depend-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.depend-tag {
  margin: 0;
}
</style>
