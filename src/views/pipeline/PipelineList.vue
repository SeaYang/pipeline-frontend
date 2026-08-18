<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, ZoomIn } from '@element-plus/icons-vue'
import {
  pagePipeline,
  createPipeline,
  updatePipeline,
  deletePipeline,
  listPipelineTemplates,
  listOverLimitPolicies,
  type Pipeline,
  type PipelineQuery,
  type PipelineTemplateOption,
  type OverLimitPolicyOption,
} from '@/api/pipeline'
import { pageAppInfo } from '@/api/appInfo'
import { formatDateTime } from '@/utils/time'
import TemplateFlowPreview from '@/components/flow/TemplateFlowPreview.vue'
import PipelineExecuteDialog from './components/PipelineExecuteDialog.vue'

const route = useRoute()
const router = useRouter()

// ============ 列表 ============

const loading = ref(false)
const list = ref<Pipeline[]>([])
const total = ref(0)

const query = reactive<PipelineQuery>({
  appName: '',
  sortField: 'createTime',
  sortOrder: 'desc',
  pageNum: 1,
  pageSize: 10,
})

/**
 * appName 既是列表查询维度，也作为路由参数携带（便于分享/回退）。
 * - get：从路由 :appName? 读取（无则空串）；
 * - set：用户在下拉里选中/清空时写回路由，路由变化再由下方 watch 触发查询。
 */
const selectedAppName = computed<string>({
  get: () => (route.params.appName ? String(route.params.appName) : ''),
  set: (val) => {
    const path = val ? `/pipeline/list/${encodeURIComponent(val)}` : '/pipeline/list'
    if (route.path !== path) router.replace(path)
  },
})

/** 分页查询流水线（按 appName 维度，创建时间倒序） */
async function loadList() {
  const appName = selectedAppName.value
  if (!appName) {
    list.value = []
    total.value = 0
    return
  }
  loading.value = true
  query.appName = appName
  try {
    const res = await pagePipeline(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '流水线列表获取失败')
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 路由参数变化（含首次进入 / 浏览器前进后退）→ 重置页码并查询
watch(
  () => route.params.appName,
  () => {
    query.pageNum = 1
    loadList()
  },
  { immediate: true },
)

function handlePageChange() {
  loadList()
}

function handleSizeChange() {
  query.pageNum = 1
  loadList()
}

// ============ 顶部 appName 远程模糊搜索 ============

const appOptions = ref<string[]>([])
const remoteSearching = ref(false)
/** 上一次发起请求的关键词，用于避免相同关键词重复请求 */
let lastKeyword = ''

/** 远程模糊搜索 appName：复用 /app-info/page，pageSize 固定 20。
 *  关键词为空、或与上次相同时均不发起请求。 */
async function remoteSearch(keyword: string) {
  const kw = (keyword ?? '').trim()
  if (!kw) return
  if (kw === lastKeyword) return
  lastKeyword = kw
  remoteSearching.value = true
  try {
    const res = await pageAppInfo({ appName: kw, pageNum: 1, pageSize: 20 })
    appOptions.value = (res.records ?? []).map((r) => r.appName)
    // 当前已选中的 appName 不在结果集时补一条，保证下拉里能显示
    const cur = selectedAppName.value
    if (cur && !appOptions.value.includes(cur)) appOptions.value.unshift(cur)
  } catch (e) {
    ElMessage.error((e as Error)?.message || '应用列表获取失败')
    appOptions.value = []
  } finally {
    remoteSearching.value = false
  }
}

// ============ 删除 ============

async function handleDelete(row: Pipeline) {
  try {
    await ElMessageBox.confirm(`确定要删除流水线「${row.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return // 用户取消
  }
  try {
    await deletePipeline(row.id!)
    ElMessage.success('删除成功')
    loadList()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '删除失败')
  }
}

// ============ 编辑（name / 并发控制字段） ============

const editVisible = ref(false)
const editSubmitting = ref(false)
const editFormRef = ref<FormInstance>()
const editForm = reactive<{
  id: number
  name: string
  maxRunningLimit?: number
  overLimitPolicy?: string
}>({ id: 0, name: '', maxRunningLimit: undefined, overLimitPolicy: undefined })
const editRules: FormRules = {
  name: [{ required: true, message: '请输入流水线名称', trigger: 'blur' }],
  maxRunningLimit: [
    {
      validator: (_rule: unknown, value: number | undefined, callback: (err?: Error) => void) => {
        if (value === undefined || value === null) {
          callback() // 可空：未配置时 fallback 到模板
        } else if (!Number.isInteger(value) || value < 1) {
          callback(new Error('并发上限必须为大于等于 1 的整数'))
        } else {
          callback()
        }
      },
      trigger: 'blur',
    },
  ],
}

// 超限策略下拉（GET /pipeline/over-limit-policies）
const overLimitPolicies = ref<OverLimitPolicyOption[]>([])

async function fetchOverLimitPolicies() {
  try {
    overLimitPolicies.value = await listOverLimitPolicies()
  } catch {
    overLimitPolicies.value = []
  }
}

function openEdit(row: Pipeline) {
  editForm.id = row.id!
  editForm.name = row.name
  editForm.maxRunningLimit = row.maxRunningLimit ?? undefined
  editForm.overLimitPolicy = row.overLimitPolicy || undefined
  editVisible.value = true
}

async function submitEdit() {
  if (!editFormRef.value) return
  const valid = await editFormRef.value.validate().catch(() => false)
  if (!valid) return
  editSubmitting.value = true
  try {
    await updatePipeline({
      id: editForm.id,
      name: editForm.name,
      maxRunningLimit: editForm.maxRunningLimit,
      overLimitPolicy: editForm.overLimitPolicy,
    })
    ElMessage.success('修改成功')
    editVisible.value = false
    loadList()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '修改失败')
  } finally {
    editSubmitting.value = false
  }
}

// ============ 新建流水线（选模板 → 填名称 → create） ============

const createVisible = ref(false)
const createSubmitting = ref(false)
const templates = ref<PipelineTemplateOption[]>([])
const templatesLoading = ref(false)
const selectedTemplateCode = ref('')
const createFormRef = ref<FormInstance>()
const createForm = reactive<{ name: string }>({ name: '' })
const createRules: FormRules = {
  name: [{ required: true, message: '请输入流水线名称', trigger: 'blur' }],
}

async function openCreate() {
  const appName = selectedAppName.value
  if (!appName) {
    ElMessage.warning('请先选择应用')
    return
  }
  createVisible.value = true
  selectedTemplateCode.value = ''
  createForm.name = ''
  templates.value = []
  templatesLoading.value = true
  try {
    templates.value = await listPipelineTemplates(appName)
  } catch (e) {
    ElMessage.error((e as Error)?.message || '流水线模板获取失败')
    templates.value = []
  } finally {
    templatesLoading.value = false
  }
}

async function submitCreate() {
  if (!selectedTemplateCode.value) {
    ElMessage.warning('请选择流水线模板')
    return
  }
  if (!createFormRef.value) return
  const valid = await createFormRef.value.validate().catch(() => false)
  if (!valid) return
  createSubmitting.value = true
  try {
    await createPipeline({
      name: createForm.name,
      appName: selectedAppName.value,
      pipelineTemplateCode: selectedTemplateCode.value,
    })
    ElMessage.success('新建成功')
    createVisible.value = false
    loadList()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '新建失败')
  } finally {
    createSubmitting.value = false
  }
}

// ============ 模板放大预览（点击卡片右上角 icon） ============

const previewVisible = ref(false)
const previewTemplate = ref<PipelineTemplateOption | null>(null)

function openPreview(t: PipelineTemplateOption, e: Event) {
  e.stopPropagation() // 避免冒泡触发卡片选中
  previewTemplate.value = t
  previewVisible.value = true
}

// ============ 执行流水线（PipelineExecuteDialog 组件） ============

const execVisible = ref(false)
const execPipelineId = ref<number>(0)
const execAppName = ref('')

function openExecute(row: Pipeline) {
  execPipelineId.value = row.id!
  execAppName.value = row.appName
  execVisible.value = true
}

function onExecuteSuccess(workflowName: string) {
  // 执行成功后跳转进入流水线执行详情页
  router.push(`/pipeline/execute-detail/${encodeURIComponent(workflowName)}`)
}

onMounted(() => {
  // 不发请求（空关键词不查询）；仅把当前选中的 appName 兜底进选项，保证下拉里能显示
  const cur = selectedAppName.value
  if (cur && !appOptions.value.includes(cur)) appOptions.value = [cur]
  fetchOverLimitPolicies()
})
</script>

<template>
  <div class="pipeline-list">
    <div class="list-header">
      <h3 class="title">流水线列表</h3>
    </div>

    <div class="toolbar">
      <el-select
        v-model="selectedAppName"
        filterable
        remote
        clearable
        :remote-method="remoteSearch"
        :loading="remoteSearching"
        placeholder="请输入应用名称搜索"
        class="app-select"
      >
        <el-option v-for="a in appOptions" :key="a" :label="a" :value="a" />
      </el-select>
      <div class="toolbar-actions">
        <el-button
          type="primary"
          :icon="Plus"
          :disabled="!selectedAppName"
          @click="openCreate"
        >
          新建流水线
        </el-button>
        <el-button
          :disabled="!selectedAppName"
          @click="router.push({ name: 'pipeline-trigger-history', query: { appName: selectedAppName } })"
        >
          触发历史
        </el-button>
      </div>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      :default-sort="{ prop: 'createTime', order: 'descending' }"
      style="width: 100%"
      :empty-text="selectedAppName ? '暂无流水线' : '请先选择应用'"
    >
      <el-table-column label="ID" width="80">
        <template #default="{ row }">
          <router-link class="link" :to="`/pipeline/${row.id}/run/latest`">{{ row.id }}</router-link>
        </template>
      </el-table-column>
      <el-table-column label="流水线名称" min-width="160" show-overflow-tooltip>
        <template #default="{ row }">
          <router-link class="link" :to="`/pipeline/${row.id}/run/latest`">{{ row.name }}</router-link>
        </template>
      </el-table-column>
      <el-table-column
        label="模板编码"
        prop="pipelineTemplateCode"
        min-width="220"
        show-overflow-tooltip
      />
      <el-table-column label="创建人" prop="creator" min-width="120" />
      <el-table-column label="创建时间" prop="createTime" min-width="170">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="330" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="openExecute(row)">执行</el-button>
          <el-button link type="primary" @click="router.push(`/pipeline/${row.id}/run/history`)">
            运行历史
          </el-button>
          <el-button
            link
            type="primary"
            @click="router.push({ name: 'pipeline-trigger-history', query: { pipelineId: row.id } })"
          >
            触发历史
          </el-button>
          <el-button link type="primary" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
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

    <!-- 编辑弹框（name / 并发控制字段） -->
    <el-dialog v-model="editVisible" title="编辑流水线" width="460px" destroy-on-close>
      <el-form ref="editFormRef" :model="editForm" :rules="editRules" label-width="100px">
        <el-form-item label="流水线名称" prop="name">
          <el-input v-model="editForm.name" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="并发上限" prop="maxRunningLimit">
          <el-input-number
            v-model="editForm.maxRunningLimit"
            :min="1"
            :step="1"
            step-strictly
            placeholder="未配置则用模板值"
            style="width: 100%"
          />
          <div class="field-tip">留空表示未配置，使用模板的应用并发上限；配置值超过模板值时按模板值生效</div>
        </el-form-item>
        <el-form-item label="超限策略" prop="overLimitPolicy">
          <el-select
            v-model="editForm.overLimitPolicy"
            clearable
            placeholder="未配置则用模板策略"
            style="width: 100%"
          >
            <el-option
              v-for="p in overLimitPolicies"
              :key="p.code"
              :label="p.description"
              :value="p.code"
            />
          </el-select>
          <div class="field-tip">达到并发上限后的处理方式；留空表示未配置，使用模板的超限策略</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" :loading="editSubmitting" @click="submitEdit">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新建流水线弹框：模板缩略预览（滚动） + 名称 -->
    <el-dialog
      v-model="createVisible"
      title="新建流水线"
      width="960px"
      top="5vh"
      destroy-on-close
    >
      <div class="tpl-section-label">选择流水线模板</div>
      <div v-loading="templatesLoading" class="tpl-gallery">
        <el-empty
          v-if="!templatesLoading && !templates.length"
          description="暂无可选模板"
          :image-size="60"
        />
        <div
          v-for="t in templates"
          :key="t.pipelineTemplateCode"
          class="tpl-card"
          :class="{ 'is-selected': selectedTemplateCode === t.pipelineTemplateCode }"
          @click="selectedTemplateCode = t.pipelineTemplateCode"
        >
          <div class="tpl-card__header">
            <span class="tpl-card__name" :title="t.name">{{ t.name }}</span>
            <el-tooltip content="放大预览" placement="top">
              <el-icon class="tpl-card__zoom" @click="openPreview(t, $event)"><ZoomIn /></el-icon>
            </el-tooltip>
          </div>
          <div class="tpl-card__flow">
            <TemplateFlowPreview :detail="t.templateDetail" />
          </div>
        </div>
      </div>
      <el-form
        ref="createFormRef"
        :model="createForm"
        :rules="createRules"
        label-width="100px"
        class="create-form"
      >
        <el-form-item label="流水线名称" prop="name">
          <el-input v-model="createForm.name" maxlength="64" show-word-limit placeholder="请输入流水线名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="createVisible = false">取消</el-button>
        <el-button type="primary" :loading="createSubmitting" @click="submitCreate">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 模板放大预览 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewTemplate?.name ? `模板预览：${previewTemplate.name}` : '模板预览'"
      width="80%"
      top="5vh"
      append-to-body
      destroy-on-close
    >
      <div class="preview-big">
        <TemplateFlowPreview :detail="previewTemplate?.templateDetail" interactive />
      </div>
    </el-dialog>

    <!-- 执行流水线弹框（差异化渲染组件） -->
    <PipelineExecuteDialog
      v-model="execVisible"
      :pipeline-id="execPipelineId"
      :app-name="execAppName"
      @success="onExecuteSuccess"
    />
  </div>
</template>

<style scoped>
.pipeline-list {
  padding: 16px 20px;
}

/* 表单字段下方的小号灰色提示文案 */
.field-tip {
  width: 100%;
  font-size: 12px;
  line-height: 1.4;
  color: var(--el-text-color-secondary);
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

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.app-select {
  width: 320px;
}

.toolbar-actions {
  display: flex;
  gap: 12px;
}

.link {
  color: var(--el-color-primary);
  text-decoration: none;
}

.link:hover {
  opacity: 0.8;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* ===== 新建流水线：模板缩略预览区 ===== */

.tpl-section-label {
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.tpl-gallery {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
  max-height: 52vh;
  overflow-y: auto;
  padding: 2px;
}

.tpl-card {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--el-border-color);
  border-radius: 6px;
  overflow: hidden;
  cursor: pointer;
  background: #fff;
  transition:
    border-color 0.2s,
    box-shadow 0.2s;
}

.tpl-card:hover {
  border-color: var(--el-color-primary-light-5);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tpl-card.is-selected {
  border-color: var(--el-color-primary);
  box-shadow: 0 0 0 1px var(--el-color-primary) inset;
}

/* 卡片头部：模板名称（左）+ 放大预览 icon（右） */
.tpl-card__header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
}

.tpl-card__name {
  flex: 1;
  min-width: 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tpl-card__zoom {
  flex-shrink: 0;
  font-size: 16px;
  color: var(--el-text-color-secondary);
  cursor: pointer;
  transition: color 0.2s;
}

.tpl-card__zoom:hover {
  color: var(--el-color-primary);
}

/* vue-flow 缩略预览：受控高度（不大不小），覆盖 TemplateFlowPreview 自带的 min-height */
.tpl-card__flow {
  height: 100px;
  background: #fafafa;
}

.tpl-card__flow :deep(.tpl-preview) {
  min-height: 0;
  height: 100%;
  border: none;
  border-radius: 0;
}

.create-form {
  margin-top: 16px;
}

/* 放大预览弹框：大画布，同样覆盖 min-height */
.preview-big {
  height: 72vh;
}

.preview-big :deep(.tpl-preview) {
  min-height: 0;
  height: 100%;
}

/* ===== 执行流水线：参数表单（已抽离到 PipelineExecuteDialog 组件） ===== */
</style>
