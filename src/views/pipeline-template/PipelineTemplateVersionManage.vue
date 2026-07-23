<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { DocumentAdd, Promotion } from '@element-plus/icons-vue'
import {
  createVersion,
  updateVersion,
  getVersionDetail,
  listVersions,
  changeVersionStatus,
  type PipelineTemplateVersion,
  type PipelineTemplateVersionStatus,
} from '@/api/pipelineTemplate'
import CodeEditor from '@/components/common/CodeEditor.vue'
import TemplateFlowPreview from '@/components/flow/TemplateFlowPreview.vue'
import { convertFormat, detectFormat, type TextFormat } from '@/utils/yaml'
import { formatDateTime } from '@/utils/time'

/** 路由参数注入：当前流水线模板编码（/pipeline-template/:pipelineTemplateCode/versions） */
const props = defineProps<{ pipelineTemplateCode: string }>()

const router = useRouter()

// 版本号三段各自的可选值（0–100）
const versionOptions = Array.from({ length: 101 }, (_, i) => i)

/** 模板详情展示方式：YAML 文本 / JSON 文本 / DAG 预览 */
type ViewMode = 'yaml' | 'json' | 'preview'

// ============ 右侧：版本列表 ============

const listLoading = ref(false)
const versions = ref<PipelineTemplateVersion[]>([])

async function fetchVersions() {
  listLoading.value = true
  try {
    versions.value = await listVersions(props.pipelineTemplateCode)
  } catch (e) {
    ElMessage.error((e as Error)?.message || '版本列表获取失败')
    versions.value = []
  } finally {
    listLoading.value = false
  }
}

// ============ 左侧：版本配置表单 ============

const mode = ref<'create' | 'edit'>('create')
/** 当前编辑的已存版本（编辑态有值，新增态为 null） */
const currentVersion = ref<PipelineTemplateVersion | null>(null)
/** 当前选中的版本号（用于右侧卡片高亮） */
const selectedVersion = ref<string | null>(null)

const versionParts = reactive<{ major: number; minor: number; patch: number }>({
  major: 0,
  minor: 0,
  patch: 1,
})
const changeNote = ref('')
const templateDetail = ref('')
/** 模板详情文本的实际格式（YAML/JSON）；用于编辑器语言与保存时转 JSON */
const format = ref<TextFormat>('yaml')
/** 当前展示方式（含预览）；进入编辑态时与 format 一致 */
const viewMode = ref<ViewMode>('yaml')

const saving = ref(false)
const publishing = ref(false)
const detailLoading = ref(false)

/** 当前版本号字符串 */
const versionStr = computed(() => `${versionParts.major}.${versionParts.minor}.${versionParts.patch}`)

/**
 * 按钮可见性：
 * - 新增版本态 / 草稿态：均展示「保存草稿」
 * - 草稿态：额外展示「发布」
 * - 生效中 / 已失效：无按钮（改内容需「新增版本」走版本变更）
 */
const isEditableDraft = computed(
  () => mode.value === 'edit' && currentVersion.value?.status === 'DRAFT',
)
const showSaveDraft = computed(() => mode.value === 'create' || isEditableDraft.value)
const showPublish = computed(() => isEditableDraft.value)

/** 编辑器是否只读：新增版本态 / 草稿态可编辑，其余（生效中、已失效）只读 */
const editorReadOnly = computed(() => mode.value === 'edit' && !isEditableDraft.value)

/** 状态展示：新增态显示「草稿」，编辑态取实际状态 */
const currentStatus = computed<PipelineTemplateVersionStatus | undefined>(
  () => currentVersion.value?.status ?? 'DRAFT',
)

function statusMeta(status?: PipelineTemplateVersionStatus): { text: string; type: 'info' | 'success' | 'warning' } {
  switch (status) {
    case 'EFFECTIVE':
      return { text: '生效中', type: 'success' }
    case 'EXPIRED':
      return { text: '已失效', type: 'warning' }
    case 'DRAFT':
    default:
      return { text: '草稿', type: 'info' }
  }
}

// ============ 版本号建议（相对列表中的最大版本） ============

function parseTuple(ver: string): [number, number, number] | null {
  const parts = ver.split('.')
  if (parts.length !== 3) return null
  const a = Number(parts[0])
  const b = Number(parts[1])
  const c = Number(parts[2])
  if (![a, b, c].every((n) => Number.isFinite(n))) return null
  return [a, b, c]
}

function compareTuple(x: [number, number, number], y: [number, number, number]): number {
  if (x[0] !== y[0]) return x[0] - y[0]
  if (x[1] !== y[1]) return x[1] - y[1]
  if (x[2] !== y[2]) return x[2] - y[2]
  return 0
}

/** 建议下一版本号：列表为空 → 0.0.1；否则最大版本 patch+1（超 100 进位） */
function suggestNext(): [number, number, number] {
  const tuples = versions.value
    .map((v) => parseTuple(v.version))
    .filter((x): x is [number, number, number] => x !== null)
  if (!tuples.length) return [0, 0, 1]
  const max = tuples.reduce((m, t) => (compareTuple(t, m) > 0 ? t : m))
  const next: [number, number, number] = [max[0], max[1], max[2] + 1]
  if (next[2] > 100) {
    next[2] = 0
    next[1] += 1
  }
  if (next[1] > 100) {
    next[1] = 0
    next[0] += 1
  }
  if (next[0] > 100) next[0] = 100
  return next
}

// ============ 表单状态切换 ============

/** 重置为新增版本态（空白草稿），模板详情默认置空 */
function handleNewVersion() {
  mode.value = 'create'
  currentVersion.value = null
  selectedVersion.value = null
  const [a, b, c] = suggestNext()
  versionParts.major = a
  versionParts.minor = b
  versionParts.patch = c
  changeNote.value = ''
  templateDetail.value = ''
  format.value = 'yaml'
  viewMode.value = 'yaml'
}

/** 把一个版本详情装入左侧表单（进入编辑态、只读、版本号禁用） */
function applyVersion(v: PipelineTemplateVersion) {
  mode.value = 'edit'
  currentVersion.value = v
  selectedVersion.value = v.version
  const tuple = parseTuple(v.version)
  if (tuple) {
    versionParts.major = tuple[0]
    versionParts.minor = tuple[1]
    versionParts.patch = tuple[2]
  }
  changeNote.value = v.changeNote ?? ''
  // 后端存的模板详情是 JSON 字符串，加载到编辑器时统一转成 YAML 展示
  const rawDetail = v.templateDetail ?? ''
  if (rawDetail.trim()) {
    try {
      templateDetail.value = convertFormat(rawDetail, detectFormat(rawDetail), 'yaml')
    } catch {
      // 转换失败时原样展示，不阻塞用户查看
      templateDetail.value = rawDetail
    }
  } else {
    templateDetail.value = ''
  }
  format.value = 'yaml'
  viewMode.value = 'yaml'
}

/** 点击右侧版本卡片：拉取详情并装入表单 */
async function handleSelectVersion(v: PipelineTemplateVersion) {
  detailLoading.value = true
  try {
    const detail = await getVersionDetail(props.pipelineTemplateCode, v.version)
    applyVersion(detail)
  } catch (e) {
    ElMessage.error((e as Error)?.message || '版本详情获取失败')
  } finally {
    detailLoading.value = false
  }
}

// ============ 展示方式切换（YAML ↔ JSON ↔ 预览） ============

/**
 * 切换模板详情的展示方式：
 * - 切到「预览」：仅切换显示，不动内容（预览只读，编辑须切回 YAML/JSON）。
 * - 切到 YAML/JSON：若与当前文本格式不同，先做内容互转；解析失败则回滚 radio。
 * 不用 v-model 绑定 radio，便于解析失败时让 radio 自动回滚到原方式。
 */
function handleViewModeChange(next: string | number | boolean) {
  const target = next as ViewMode
  if (target === viewMode.value) return
  if (target === 'preview') {
    viewMode.value = 'preview'
    return
  }
  // target 为 yaml/json 编辑态
  if (format.value === target) {
    viewMode.value = target
    return
  }
  if (!templateDetail.value.trim()) {
    format.value = target
    viewMode.value = target
    return
  }
  try {
    templateDetail.value = convertFormat(templateDetail.value, format.value, target)
    format.value = target
    viewMode.value = target
  } catch (e) {
    ElMessage.error('当前内容无法按 ' + format.value.toUpperCase() + ' 解析，已保持原格式：' + ((e as Error)?.message || '格式错误'))
    // viewMode / format 未变 → radio 因 model-value 未变而回滚
  }
}

// ============ 保存草稿 / 发布 ============

/** 未定义参数弹框 */
const undefinedParamsVisible = ref(false)
/** 未定义参数列表 */
const undefinedParamsList = ref<string[]>([])

/** 点击未定义参数名，新开标签页跳转新建参数页 */
function goCreateParam(name: string) {
  const url = router.resolve(`/pipeline-parameter/create?name=${encodeURIComponent(name)}`).href
  window.open(url, '_blank')
}

/**
 * 检查保存响应中是否有未定义参数，有则弹框展示列表。
 * @returns true 表示存在未定义参数，false 表示正常保存成功
 */
function checkUndefinedParams(saved: { undefinedParams?: string[] }): boolean {
  const params = saved.undefinedParams ?? []
  if (params.length === 0) {
    return false
  }
  undefinedParamsList.value = params
  undefinedParamsVisible.value = true
  return true
}

async function handleSave() {
  if (!templateDetail.value.trim()) {
    ElMessage.warning('请填写模板详情（JSON / YAML）')
    return
  }
  let templateDetailJson: string
  try {
    templateDetailJson = convertFormat(templateDetail.value, format.value, 'json')
  } catch (e) {
    ElMessage.error('模板详情不是合法的 ' + format.value.toUpperCase() + '：' + ((e as Error)?.message || '格式错误'))
    return
  }
  saving.value = true
  try {
    const saved = isEditableDraft.value && currentVersion.value
      ? await updateVersion({
          id: currentVersion.value.id,
          pipelineTemplateCode: props.pipelineTemplateCode,
          version: currentVersion.value.version,
          templateDetail: templateDetailJson,
          changeNote: changeNote.value,
        })
      : await createVersion({
          pipelineTemplateCode: props.pipelineTemplateCode,
          version: versionStr.value,
          templateDetail: templateDetailJson,
          changeNote: changeNote.value,
        })
    // 存在未定义参数时弹框提示，不继续保存流程
    if (checkUndefinedParams(saved)) {
      return
    }
    ElMessage.success('保存成功（草稿）')
    await fetchVersions()
    if (saved.version) {
      applyVersion(saved.version)
    }
  } catch (e) {
    ElMessage.error((e as Error)?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function handlePublish() {
  const v = currentVersion.value
  if (!v || v.status !== 'DRAFT') return
  publishing.value = true
  try {
    // 发布为生效中：后端自动把其它生效中/草稿版本置为已失效
    const updated = await changeVersionStatus({
      pipelineTemplateCode: props.pipelineTemplateCode,
      version: v.version,
      status: 'EFFECTIVE',
    })
    ElMessage.success('发布成功')
    await fetchVersions()
    applyVersion(updated)
  } catch (e) {
    ElMessage.error((e as Error)?.message || '发布失败')
  } finally {
    publishing.value = false
  }
}

onMounted(async () => {
  await fetchVersions()
  const first = versions.value[0]
  if (first) {
    await handleSelectVersion(first)
  } else {
    handleNewVersion()
  }
})
</script>

<template>
  <div class="version-manage" v-loading="detailLoading">
    <div class="page-header">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/pipeline-template' }">流水线模板</el-breadcrumb-item>
        <el-breadcrumb-item>版本管理</el-breadcrumb-item>
      </el-breadcrumb>
      <el-tag size="small" type="info" class="code-tag">{{ props.pipelineTemplateCode }}</el-tag>
    </div>

    <div class="body">
      <!-- 左：版本配置 -->
      <div class="config-panel">
        <div class="panel-head">
          <span class="panel-title">版本配置</span>
        </div>

        <el-scrollbar class="config-scroll">
        <div class="config-form">
          <!-- 版本号 -->
          <div class="form-row">
            <label class="form-label">版本号</label>
            <div class="version-picker">
              <el-select
                v-model="versionParts.major"
                :disabled="mode === 'edit'"
                size="default"
                class="version-select"
              >
                <el-option v-for="n in versionOptions" :key="n" :label="String(n)" :value="n" />
              </el-select>
              <span class="version-dot">.</span>
              <el-select
                v-model="versionParts.minor"
                :disabled="mode === 'edit'"
                size="default"
                class="version-select"
              >
                <el-option v-for="n in versionOptions" :key="n" :label="String(n)" :value="n" />
              </el-select>
              <span class="version-dot">.</span>
              <el-select
                v-model="versionParts.patch"
                :disabled="mode === 'edit'"
                size="default"
                class="version-select"
              >
                <el-option v-for="n in versionOptions" :key="n" :label="String(n)" :value="n" />
              </el-select>
              <el-tag
                size="small"
                :type="statusMeta(currentStatus).type"
                class="status-tag"
              >
                {{ statusMeta(currentStatus).text }}
              </el-tag>
            </div>
          </div>

          <!-- 变更说明 -->
          <div class="form-row">
            <label class="form-label">变更说明</label>
            <el-input
              v-model="changeNote"
              type="textarea"
              :rows="2"
              maxlength="500"
              show-word-limit
              :disabled="editorReadOnly"
              placeholder="本次版本变更的说明"
            />
          </div>

          <!-- 模板详情：YAML / JSON 文本编辑 + DAG 预览（三种展示方式切换） -->
          <div class="form-row form-row-editor">
            <div class="editor-head">
              <label class="form-label editor-head__label">模板详情</label>
              <el-radio-group :model-value="viewMode" @change="handleViewModeChange">
                <el-radio-button value="yaml">YAML</el-radio-button>
                <el-radio-button value="json">JSON</el-radio-button>
                <el-radio-button value="preview">预览</el-radio-button>
              </el-radio-group>
            </div>
            <CodeEditor
              v-if="viewMode !== 'preview'"
              v-model="templateDetail"
              :language="format"
              :read-only="editorReadOnly"
              height="100%"
              class="editor-wrap"
            />
            <TemplateFlowPreview v-else :detail="templateDetail" class="editor-wrap" />
          </div>
        </div>
        </el-scrollbar>

        <!-- 操作：仅「新增版本」态显示保存草稿；仅「草稿」态显示发布；其余不显示按钮 -->
        <div class="panel-foot">
          <el-button v-if="showSaveDraft" type="primary" :loading="saving" @click="handleSave">
            保存草稿
          </el-button>
          <el-button v-if="showPublish" type="success" :icon="Promotion" :loading="publishing" @click="handlePublish">
            发布
          </el-button>
        </div>
      </div>

      <!-- 右：版本列表 -->
      <div class="version-panel">
        <div class="panel-head">
          <span class="panel-title">版本列表 ({{ versions.length }})</span>
          <el-button type="primary" :icon="DocumentAdd" @click="handleNewVersion">新增版本</el-button>
        </div>
        <el-scrollbar class="version-scroll" v-loading="listLoading">
          <div v-if="!versions.length && !listLoading" class="empty-tip">暂无版本</div>
          <div
            v-for="v in versions"
            :key="v.version"
            class="version-card"
            :class="{ active: selectedVersion === v.version }"
            @click="handleSelectVersion(v)"
          >
            <div class="card-top">
              <span class="card-version">v{{ v.version }}</span>
              <el-tag size="small" :type="statusMeta(v.status).type">
                {{ statusMeta(v.status).text }}
              </el-tag>
            </div>
            <div class="card-time">{{ formatDateTime(v.createTime) }}</div>
            <div class="card-note" :title="v.changeNote">{{ v.changeNote }}</div>
          </div>
        </el-scrollbar>
      </div>
    </div>

    <!-- 未定义参数弹框 -->
    <el-dialog
      v-model="undefinedParamsVisible"
      title="存在未定义参数"
      width="480px"
      :close-on-click-modal="true"
    >
      <p class="undefined-tip">以下模板参数未在参数定义表中配置，点击参数名前往新建：</p>
      <div class="undefined-list">
        <el-link
          v-for="name in undefinedParamsList"
          :key="name"
          type="primary"
          class="undefined-item"
          @click="goCreateParam(name)"
        >
          {{ name }}
        </el-link>
      </div>
      <template #footer>
        <el-button @click="undefinedParamsVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.version-manage {
  height: 100%;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
}

.undefined-tip {
  margin: 0 0 12px;
  font-size: 14px;
  color: var(--el-text-color-primary);
}
.undefined-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px 16px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}
.undefined-item {
  font-size: 14px;
  font-weight: 500;
  width: fit-content;
}

.page-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.code-tag {
  font-weight: normal;
}

/* 左右两栏：拉伸等高、铺满主内容区高度（底部对齐 + 贴近屏幕底部） */
.body {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 16px;
  align-items: stretch;
}

.config-panel {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  background: #fff;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  padding: 16px;
}

.version-panel {
  width: 340px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #fff;
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  padding: 16px;
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.panel-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

/* 配置区滚动容器：el-scrollbar 浮动滑块不占宽度；右侧留 gutter，避免滑块遮挡 textarea/编辑器右侧 */
.config-scroll {
  flex: 1;
  min-height: 0;
}

.config-scroll :deep(.el-scrollbar__view) {
  height: 100%;
  box-sizing: border-box;
  padding-right: 8px;
  display: flex;
  flex-direction: column;
}

/* 表单：纵向排列、铺满滚动视图；正常/大屏下编辑器自适应填充不滚动，过矮屏幕才滚动 */
.config-form {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.form-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

/* 模板详情行：纵向排列、横向铺满，占满表单剩余高度；min-height:0 让其可在 flex 链中正确收缩 */
.form-row-editor {
  flex: 1;
  min-height: 0;
  flex-direction: column;
  align-items: stretch;
}

.form-label {
  width: 70px;
  flex-shrink: 0;
  font-size: 13px;
  color: var(--el-text-color-regular);
  line-height: 32px;
}

/* 模板详情行头部：左侧标题 + 右侧展示方式 radio */
.editor-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.editor-head__label {
  line-height: 1.5;
}

.version-picker {
  display: flex;
  align-items: center;
  gap: 6px;
}

.version-select {
  width: 84px;
}

.version-dot {
  font-weight: 600;
  color: var(--el-text-color-regular);
}

.status-tag {
  margin-left: 12px;
}

/* 编辑器/预览：填满模板详情行剩余高度（贴近配置区下边缘） */
.editor-wrap {
  width: 100%;
  flex: 1;
  min-height: 200px;
}

/* 底部操作 */
.panel-foot {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

/* 版本列表：填充面板剩余高度，超出则内部滚动 */
.version-scroll {
  flex: 1;
  min-height: 0;
}

/* 留出右侧 gutter，让 el-scrollbar 的浮动滑块落在空隙里，不遮挡卡片右侧的状态标签 */
.version-scroll :deep(.el-scrollbar__view) {
  padding-right: 8px;
}

.version-card {
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  padding: 10px 12px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: all 0.15s;
}

.version-card:hover {
  border-color: var(--el-color-primary-light-5);
  background: var(--el-color-primary-light-9);
}

.version-card.active {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.card-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.card-version {
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.card-time {
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: 4px;
}

.card-note {
  font-size: 12px;
  line-height: 18px;
  min-height: 18px;
  color: var(--el-text-color-regular);
  margin-top: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty-tip {
  text-align: center;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  padding: 24px 0;
}
</style>
