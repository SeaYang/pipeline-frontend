<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules, type TabPaneName } from 'element-plus'
import { Plus, Delete, Edit, Connection } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import {
  listPipelineTemplate,
  createPipelineTemplate,
  updatePipelineTemplate,
  deletePipelineTemplate,
  listPipelineTemplateGroups,
  type PipelineTemplate,
  type PipelineTemplateQuery,
} from '@/api/pipelineTemplate'
import { listClusterOptions, listSchedulePolicies, type ClusterOption, type SchedulePolicyOption } from '@/api/cluster'
import type { DictData } from '@/api/dict'
import { formatDateTime } from '@/utils/time'

const router = useRouter()

const loading = ref(false)
const list = ref<PipelineTemplate[]>([])

// 所属分组下拉（GET /pipeline-template/groups；dictKey 作存储值，dictValue 作展示名），每个分组一个 tab
const groups = ref<DictData[]>([])
const activeTab = ref<string>('')
const groupLabel = computed(() => {
  const map = new Map<string, string>()
  groups.value.forEach((g) => map.set(g.dictKey, g.dictValue))
  return (code?: string) => (code ? (map.get(code) ?? code) : '-')
})

/** 调度策略编码 → 中文名（与后端 ClusterSchedulePolicyEnum 对应） */
function schedulePolicyLabel(policy?: string) {
  const map: Record<string, string> = {
    Any: '任意集群',
    PreferSelected: '优先选中集群',
  }
  return policy ? (map[policy] ?? policy) : '任意集群'
}

const query = reactive<PipelineTemplateQuery>({
  pipelineTemplateGroup: '',
  sortField: 'id',
  sortOrder: 'asc',
})

/** 列表查询流水线模板（不分页） */
async function fetchData() {
  loading.value = true
  try {
    list.value = await listPipelineTemplate(query)
  } catch (e) {
    ElMessage.error((e as Error)?.message || '流水线模板列表获取失败')
    list.value = []
  } finally {
    loading.value = false
  }
}

async function fetchGroups() {
  try {
    groups.value = await listPipelineTemplateGroups()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '流水线模板分组获取失败')
    groups.value = []
  }
  // 默认选中第一个分组并按其查询
  activeTab.value = groups.value[0]?.dictKey ?? ''
  query.pipelineTemplateGroup = activeTab.value
  await fetchData()
}

/** 切换 tab：按对应分组重新查询 */
function handleTabChange(name: TabPaneName) {
  query.pipelineTemplateGroup = String(name ?? '')
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
  fetchData()
}

// ============ 新增 / 编辑 ============

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<PipelineTemplate>({
  id: undefined,
  pipelineTemplateCode: '',
  name: '',
  pipelineTemplateGroup: '',
  description: '',
  clusterNames: [],
  clusterSchedulePolicy: 'Any',
})

// 执行集群下拉（GET /cluster/options）与调度策略下拉（GET /cluster/schedule-policies）
const clusterOptions = ref<ClusterOption[]>([])
const schedulePolicies = ref<SchedulePolicyOption[]>([])

async function fetchClusterOptions() {
  try {
    clusterOptions.value = await listClusterOptions()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '集群选项获取失败')
    clusterOptions.value = []
  }
}

async function fetchSchedulePolicies() {
  try {
    schedulePolicies.value = await listSchedulePolicies()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '调度策略选项获取失败')
    schedulePolicies.value = []
  }
}

const rules: FormRules<PipelineTemplate> = {
  pipelineTemplateCode: [{ required: true, message: '请输入流水线模板编码', trigger: 'blur' }],
  name: [{ required: true, message: '请输入流水线模板名称', trigger: 'blur' }],
  pipelineTemplateGroup: [{ required: true, message: '请选择所属分组', trigger: 'change' }],
}

function resetForm() {
  form.id = undefined
  form.pipelineTemplateCode = ''
  form.name = ''
  form.pipelineTemplateGroup = ''
  form.description = ''
  form.clusterNames = []
  form.clusterSchedulePolicy = 'Any'
}

function openCreate() {
  resetForm()
  // 新增时默认带入当前 tab 的分组
  form.pipelineTemplateGroup = activeTab.value
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: PipelineTemplate) {
  resetForm()
  Object.assign(form, row)
  // clusterNames 可能是 null（不限制集群）
  form.clusterNames = row.clusterNames ?? []
  form.clusterSchedulePolicy = row.clusterSchedulePolicy || 'Any'
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
      await createPipelineTemplate({ ...form })
      ElMessage.success('新增成功')
    } else {
      await updatePipelineTemplate({ ...form })
      ElMessage.success('修改成功')
    }
    if (keepOpen && dialogMode.value === 'create') {
      // 保存并继续：清空表单留在弹框内，继续录入下一条
      resetForm()
      form.pipelineTemplateGroup = activeTab.value
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

async function handleDelete(row: PipelineTemplate) {
  try {
    await ElMessageBox.confirm(`确定要删除流水线模板「${row.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return // 用户取消
  }
  try {
    await deletePipelineTemplate(row.id!)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '删除失败')
  }
}

// ============ 进入版本管理 ============

function goVersions(row: PipelineTemplate) {
  router.push(`/pipeline-template/${encodeURIComponent(row.pipelineTemplateCode)}/versions`)
}

onMounted(() => {
  fetchGroups()
  fetchClusterOptions()
  fetchSchedulePolicies()
})
</script>

<template>
  <div class="pipeline-template-list">
    <div class="list-header">
      <h3 class="title">流水线模板</h3>
    </div>

    <!-- 分组 tab + 右侧新增按钮（同一行） -->
    <div class="tabs-bar">
      <el-tabs v-model="activeTab" class="tabs" @tab-change="handleTabChange">
        <el-tab-pane v-for="g in groups" :key="g.dictKey" :label="g.dictValue" :name="g.dictKey" />
      </el-tabs>
      <el-button type="primary" :icon="Plus" class="create-btn" @click="openCreate">新增</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      :default-sort="{ prop: 'id', order: 'ascending' }"
      style="width: 100%"
      empty-text="暂无流水线模板"
      @sort-change="handleSortChange"
    >
      <el-table-column label="ID" prop="id" width="80" sortable="custom" />
      <el-table-column
        label="流水线模板编码"
        prop="pipelineTemplateCode"
        min-width="260"
        show-overflow-tooltip
        sortable="custom"
      />
      <el-table-column label="流水线模板名称" prop="name" min-width="160" sortable="custom" />
      <el-table-column label="所属分组" prop="pipelineTemplateGroup" min-width="105" sortable="custom">
        <template #default="{ row }">{{ groupLabel(row.pipelineTemplateGroup) }}</template>
      </el-table-column>
      <el-table-column label="候选集群" prop="clusterNames" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">{{ row.clusterNames?.length ? row.clusterNames.join(', ') : '不限制' }}</template>
      </el-table-column>
      <el-table-column label="调度策略" prop="clusterSchedulePolicy" min-width="110">
        <template #default="{ row }">{{ schedulePolicyLabel(row.clusterSchedulePolicy) }}</template>
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

    <!-- 新增 / 编辑弹框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增流水线模板' : '编辑流水线模板'"
      width="560px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="110px">
        <el-form-item label="模板编码" prop="pipelineTemplateCode">
          <el-input
            v-model="form.pipelineTemplateCode"
            maxlength="64"
            show-word-limit
            :disabled="dialogMode === 'edit'"
            placeholder="如 go-cicd-pipeline"
          />
        </el-form-item>
        <el-form-item label="模板名称" prop="name">
          <el-input
            v-model="form.name"
            maxlength="64"
            show-word-limit
            placeholder="如 Go CI/CD 流水线"
          />
        </el-form-item>
        <el-form-item label="所属分组" prop="pipelineTemplateGroup">
          <el-select
            v-model="form.pipelineTemplateGroup"
            placeholder="请选择分组"
            style="width: 100%"
          >
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
        <el-form-item label="执行集群" prop="clusterNames">
          <el-select
            v-model="form.clusterNames"
            multiple
            clearable
            placeholder="不选则不限制集群"
            style="width: 100%"
          >
            <el-option
              v-for="c in clusterOptions"
              :key="c.clusterName"
              :label="c.description ? `${c.clusterName}（${c.description}）` : c.clusterName"
              :value="c.clusterName"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="调度策略" prop="clusterSchedulePolicy">
          <el-select v-model="form.clusterSchedulePolicy" style="width: 100%">
            <el-option
              v-for="p in schedulePolicies"
              :key="p.code"
              :label="p.description"
              :value="p.code"
            />
          </el-select>
          <div v-if="form.clusterSchedulePolicy === 'PreferSelected' && !(form.clusterNames && form.clusterNames.length)" class="cluster-policy-tip">
            优先选中集群建议至少选择一个执行集群（未选择时等同任意集群）
          </div>
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
.pipeline-template-list {
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

/* tab 行：tabs 撑满，新增按钮贴右，二者同一水平 */
.tabs-bar {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 4px;
}

.tabs {
  flex: 1;
  min-width: 0;
}

/* el-tabs 底部多余外边距收一下，让按钮与 tab 文字大致对齐 */
.tabs :deep(.el-tabs__header) {
  margin-bottom: 8px;
}

.create-btn {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.cluster-policy-tip {
  width: 100%;
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-color-warning);
}
</style>
