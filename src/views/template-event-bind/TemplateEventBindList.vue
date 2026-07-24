<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Delete, Edit } from '@element-plus/icons-vue'
import {
  pageTemplateEventBind,
  createTemplateEventBind,
  updateTemplateEventBind,
  deleteTemplateEventBind,
  type TemplateEventBind,
  type TemplateEventBindQuery,
} from '@/api/templateEventBind'
import { listDictData, type DictData } from '@/api/dict'
import { listPipelineTemplate, type PipelineTemplate } from '@/api/pipelineTemplate'
import { formatDateTime } from '@/utils/time'

// ==================== 列表数据 ====================
const loading = ref(false)
const list = ref<TemplateEventBind[]>([])
const total = ref(0)

const query = reactive<TemplateEventBindQuery>({
  eventType: '',
  sortField: 'id',
  sortOrder: 'asc',
  pageNum: 1,
  pageSize: 10,
})

/** 分页查询 */
async function fetchData() {
  loading.value = true
  try {
    const res = await pageTemplateEventBind(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '事件-模板绑定列表获取失败')
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

/** 服务端排序 */
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

// ==================== 下拉数据源 ====================

/** 事件类型下拉数据（字典 pipeline_event_type） */
const eventTypeOptions = ref<DictData[]>([])
/** 流水线模板下拉数据 */
const templateOptions = ref<PipelineTemplate[]>([])

async function loadOptions() {
  try {
    const [events, templates] = await Promise.all([
      listDictData('pipeline_event_type'),
      listPipelineTemplate({ sortOrder: 'asc' }),
    ])
    eventTypeOptions.value = events ?? []
    templateOptions.value = templates ?? []
  } catch (e) {
    ElMessage.error((e as Error)?.message || '下拉数据加载失败')
  }
}

// ==================== 新增 / 编辑 ====================

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: undefined as number | undefined,
  eventType: '',
  pipelineTemplateCode: '',
})

const rules: FormRules<typeof form> = {
  eventType: [{ required: true, message: '请选择事件类型', trigger: 'change' }],
  pipelineTemplateCode: [{ required: true, message: '请选择流水线模板', trigger: 'change' }],
}

function resetForm() {
  form.id = undefined
  form.eventType = ''
  form.pipelineTemplateCode = ''
}

function openCreate() {
  resetForm()
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: TemplateEventBind) {
  resetForm()
  form.id = row.id
  form.eventType = row.eventType
  form.pipelineTemplateCode = row.pipelineTemplateCode
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (dialogMode.value === 'create') {
      await createTemplateEventBind({ ...form })
      ElMessage.success('新增成功')
    } else {
      await updateTemplateEventBind({
        id: form.id!,
        eventType: form.eventType,
        pipelineTemplateCode: form.pipelineTemplateCode,
      })
      ElMessage.success('修改成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

// ==================== 删除 ====================

async function handleDelete(row: TemplateEventBind) {
  try {
    await ElMessageBox.confirm(
      `确定要删除绑定「${row.eventTypeDesc ?? row.eventType} → ${row.pipelineTemplateName ?? row.pipelineTemplateCode}」吗？`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await deleteTemplateEventBind(row.id!)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '删除失败')
  }
}

onMounted(() => {
  loadOptions()
  fetchData()
})
</script>

<template>
  <div class="template-event-bind-list">
    <div class="list-header">
      <span class="page-title">模板事件配置</span>
    </div>

    <div class="search-bar">
      <el-select
        v-model="query.eventType"
        placeholder="事件类型"
        clearable
        class="search-select"
        @change="handleSearch"
        @clear="handleSearch"
      >
        <el-option
          v-for="item in eventTypeOptions"
          :key="item.dictKey"
          :label="`${item.dictKey}（${item.dictValue}）`"
          :value="item.dictKey"
        />
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
      empty-text="暂无事件-模板绑定数据"
      @sort-change="handleSortChange"
    >
      <el-table-column label="ID" prop="id" width="80" sortable="custom" />
      <el-table-column label="事件类型编码" prop="eventType" min-width="140" sortable="custom" />
      <el-table-column label="事件类型" prop="eventTypeDesc" min-width="140" />
      <el-table-column label="模板编码" prop="pipelineTemplateCode" min-width="180" sortable="custom" />
      <el-table-column label="模板名称" prop="pipelineTemplateName" min-width="160" />
      <el-table-column label="创建人" prop="creator" width="120" />
      <el-table-column label="创建时间" prop="createTime" min-width="170" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" prop="updateTime" min-width="170" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
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
      :title="dialogMode === 'create' ? '新增事件-模板绑定' : '编辑事件-模板绑定'"
      width="520px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="事件类型" prop="eventType">
          <el-select
            v-model="form.eventType"
            placeholder="请选择事件类型"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="item in eventTypeOptions"
              :key="item.dictKey"
              :label="`${item.dictKey}（${item.dictValue}）`"
              :value="item.dictKey"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="流水线模板" prop="pipelineTemplateCode">
          <el-select
            v-model="form.pipelineTemplateCode"
            placeholder="请选择流水线模板"
            style="width: 100%"
            filterable
          >
            <el-option
              v-for="item in templateOptions"
              :key="item.pipelineTemplateCode"
              :label="`${item.pipelineTemplateCode}（${item.name}）`"
              :value="item.pipelineTemplateCode"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.template-event-bind-list {
  padding: 16px 20px;
}

.list-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.page-title {
  font-size: 18px;
  font-weight: bold;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.search-select {
  width: 240px;
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
