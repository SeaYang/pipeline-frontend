<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Delete, Edit, Connection } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import {
  pageTaskTemplate,
  createTaskTemplate,
  updateTaskTemplate,
  deleteTaskTemplate,
  listTaskTemplateGroups,
  type TaskTemplate,
  type TaskTemplateQuery,
} from '@/api/taskTemplate'
import type { DictData } from '@/api/dict'
import { formatDateTime } from '@/utils/time'

const router = useRouter()

const loading = ref(false)
const list = ref<TaskTemplate[]>([])
const total = ref(0)

// 所属分组下拉（GET /task-template/groups；dictKey 作存储值，dictValue 作展示名）
const groups = ref<DictData[]>([])
const groupLabel = computed(() => {
  const map = new Map<string, string>()
  groups.value.forEach((g) => map.set(g.dictKey, g.dictValue))
  return (code?: string) => (code ? (map.get(code) ?? code) : '-')
})

const query = reactive<TaskTemplateQuery>({
  taskTemplateCode: '',
  name: '',
  taskTemplateGroup: '',
  sortField: 'id',
  sortOrder: 'asc',
  pageNum: 1,
  pageSize: 10,
})

/** 分页查询任务模板 */
async function fetchData() {
  loading.value = true
  try {
    const res = await pageTaskTemplate(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '任务模板列表获取失败')
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

async function fetchGroups() {
  try {
    groups.value = await listTaskTemplateGroups()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '任务模板分组获取失败')
    groups.value = []
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

// ============ 新增 / 编辑 ============

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<TaskTemplate>({
  id: undefined,
  taskTemplateCode: '',
  name: '',
  taskTemplateGroup: '',
  description: '',
})

const rules: FormRules<TaskTemplate> = {
  taskTemplateCode: [{ required: true, message: '请输入任务模板编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入任务模板名称', trigger: 'blur' }],
  taskTemplateGroup: [{ required: true, message: '请选择所属分组', trigger: 'change' }],
}

function resetForm() {
  form.id = undefined
  form.taskTemplateCode = ''
  form.name = ''
  form.taskTemplateGroup = ''
  form.description = ''
}

function openCreate() {
  resetForm()
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: TaskTemplate) {
  resetForm()
  Object.assign(form, row)
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

async function submitForm(keepOpen = false) {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (dialogMode.value === 'create') {
      await createTaskTemplate({ ...form })
      ElMessage.success('新增成功')
    } else {
      await updateTaskTemplate({ ...form })
      ElMessage.success('修改成功')
    }
    if (keepOpen && dialogMode.value === 'create') {
      // 保存并继续：清空表单留在弹框内，继续录入下一条
      resetForm()
      formRef.value?.clearValidate()
    } else {
      dialogVisible.value = false
      fetchData()
    }
  } catch (e) {
    ElMessage.error((e as Error)?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

// ============ 删除 ============

async function handleDelete(row: TaskTemplate) {
  try {
    await ElMessageBox.confirm(`确定要删除任务模板「${row.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return // 用户取消
  }
  try {
    await deleteTaskTemplate(row.id!)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '删除失败')
  }
}

// ============ 进入版本管理 ============

function goVersions(row: TaskTemplate) {
  router.push(`/task-template/${encodeURIComponent(row.taskTemplateCode)}/versions`)
}

onMounted(() => {
  fetchGroups()
  fetchData()
})
</script>

<template>
  <div class="task-template-list">
    <div class="list-header">
      <h3 class="title">任务模板</h3>
    </div>

    <div class="search-bar">
      <el-input
        v-model="query.taskTemplateCode"
        placeholder="模板编码"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-input
        v-model="query.name"
        placeholder="模板名称"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select
        v-model="query.taskTemplateGroup"
        placeholder="所属分组"
        clearable
        class="search-input"
        @change="handleSearch"
        @clear="handleSearch"
      >
        <el-option v-for="g in groups" :key="g.dictKey" :label="g.dictValue" :value="g.dictKey" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button type="primary" :icon="Plus" class="create-btn" @click="openCreate">新增</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      :default-sort="{ prop: 'id', order: 'ascending' }"
      style="width: 100%"
      empty-text="暂无任务模板"
      @sort-change="handleSortChange"
    >
      <el-table-column label="ID" prop="id" width="80" sortable="custom" />
      <el-table-column
        label="任务模板编码"
        prop="taskTemplateCode"
        min-width="220"
        show-overflow-tooltip
        sortable="custom"
      />
      <el-table-column label="任务模板名称" prop="name" min-width="160" sortable="custom" />
      <el-table-column label="所属分组" prop="taskTemplateGroup" min-width="140" sortable="custom">
        <template #default="{ row }">{{ groupLabel(row.taskTemplateGroup) }}</template>
      </el-table-column>
      <el-table-column
        label="描述"
        prop="description"
        min-width="180"
        show-overflow-tooltip
        sortable="custom"
      />
      <el-table-column label="创建人" prop="creator" min-width="120" sortable="custom" />
      <el-table-column label="创建时间" prop="createTime" min-width="170" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" prop="updateTime" min-width="170" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="260" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Connection" @click="goVersions(row)">
            版本管理
          </el-button>
          <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
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

    <!-- 新增 / 编辑弹框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增任务模板' : '编辑任务模板'"
      width="500px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px">
        <el-form-item label="模板编码" prop="taskTemplateCode">
          <el-input
            v-model="form.taskTemplateCode"
            maxlength="64"
            show-word-limit
            :disabled="dialogMode === 'edit'"
            placeholder="如 build-go"
          />
        </el-form-item>
        <el-form-item label="模板名称" prop="name">
          <el-input v-model="form.name" maxlength="64" show-word-limit placeholder="如 构建 Go 服务" />
        </el-form-item>
        <el-form-item label="所属分组" prop="taskTemplateGroup">
          <el-select v-model="form.taskTemplateGroup" placeholder="请选择分组" style="width: 100%">
            <el-option v-for="g in groups" :key="g.dictKey" :label="g.dictValue" :value="g.dictKey" />
          </el-select>
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="3"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm(false)">保存</el-button>
        <el-button
          v-if="dialogMode === 'create'"
          type="success"
          :loading="submitting"
          @click="submitForm(true)"
        >
          保存并继续
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.task-template-list {
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
  width: 200px;
}

.create-btn {
  margin-left: auto;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
