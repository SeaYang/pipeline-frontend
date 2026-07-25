<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { VueFlow, useVueFlow, type NodeMouseEvent } from '@vue-flow/core'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ZoomIn, ZoomOut, FullScreen } from '@element-plus/icons-vue'
import { type ArgoWorkflowDetail, type PipelineRunDetailDTO } from '@/api/argo'
import { listArtifactByRun, type Artifact } from '@/api/artifact'
import { workflowToFlow, buildTaskNodes, type ArgoTaskNode } from '@/utils/workflowFlow'
import { getAccount } from '@/utils/auth'
import { getNodeLog } from '@/data/nodeLogs'
import { formatDateTime, formatDuration } from '@/utils/time'
import {
  getPipelineRunSnapshot,
  retryPipelineRun,
  stopPipelineRun,
} from '@/api/pipeline'
import PipelineFlowNode from '@/components/flow/PipelineFlowNode.vue'
import XtermLogViewer from '@/components/flow/XtermLogViewer.vue'
import CodeEditor from '@/components/common/CodeEditor.vue'

const props = defineProps<{ name: string }>()

const router = useRouter()
const { fitView, zoomIn, zoomOut } = useVueFlow()

const loading = ref(true)
const detail = ref<ArgoWorkflowDetail | null>(null)
const taskCodeNameMap = ref<Record<string, string>>({})
/** SSE 推送的完整 DTO（含 appName / 模板 / 执行人等扩展字段） */
const runDto = ref<PipelineRunDetailDTO | null>(null)

// ===== 制品信息 =====
/** 本次执行产出的制品列表 */
const artifacts = ref<Artifact[]>([])

/** 加载制品信息（按 Argo Workflow name 查询） */
async function loadArtifacts() {
  if (!props.name) return
  try {
    artifacts.value = await listArtifactByRun(props.name)
  } catch {
    artifacts.value = []
  }
}

/** 制品大小格式化 */
function formatArtifactSize(bytes?: number): string {
  if (!bytes) return '-'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

// ===== SSE 连接管理 =====
/** SSE 连接状态：connected / reconnecting / disconnected */
const sseStatus = ref<'connected' | 'reconnecting' | 'disconnected'>('disconnected')
let sseSource: EventSource | null = null

/** 终态集合：到达后关闭 SSE */
const TERMINAL_PHASES = new Set(['Succeeded', 'Cancelled'])

function isTerminalPhase() {
  return TERMINAL_PHASES.has(detail.value?.status?.phase ?? '')
}

/** 关闭当前 SSE 连接 */
function closeSse() {
  if (sseSource) {
    sseSource.close()
    sseSource = null
  }
}

/**
 * 建立 SSE 连接，订阅执行详情推送。
 * - 收到 detail 事件：更新 detail + taskCodeNameMap + runDto；终态时自动关闭连接
 * - 收到 error 事件 / 连接异常：标记重连状态，浏览器 EventSource 会自动重连
 * - 页面离开时手动 close() 释放资源
 */
function connectSse() {
  closeSse()
  // EventSource 不支持自定义 header，通过 query param 传递 x-user-id（后端 UserIdFilter 已支持）
  const account = getAccount() ?? ''
  const url = `/api/pipeline-run/sse?pipelineRunName=${encodeURIComponent(props.name)}&x-user-id=${encodeURIComponent(account)}`
  sseSource = new EventSource(url)

  sseSource.addEventListener('open', () => {
    sseStatus.value = 'connected'
  })

  // detail 事件：服务端推送的执行详情数据
  sseSource.addEventListener('detail', (e: MessageEvent) => {
    try {
      const dto: PipelineRunDetailDTO = JSON.parse(e.data)
      runDto.value = dto
      if (dto.workflowDetail) {
        detail.value = dto.workflowDetail
      }
      if (dto.taskCodeNameMap) {
        taskCodeNameMap.value = dto.taskCodeNameMap
      }
      loading.value = false
      // 终态：关闭连接并刷新制品信息（制品在执行过程中逐步回传）
      if (TERMINAL_PHASES.has(dto.status)) {
        closeSse()
        sseStatus.value = 'disconnected'
        loadArtifacts()
      }
    } catch {
      // JSON 解析异常忽略
    }
  })

  // error 事件：服务端主动推送的错误（如记录不存在）
  sseSource.addEventListener('error', (e: MessageEvent) => {
    if (e.data) {
      ElMessage.error(e.data)
      closeSse()
      sseStatus.value = 'disconnected'
      loading.value = false
    }
  })

  // 连接异常（网络断开等）：EventSource 会自动重连，标记状态给用户提示
  sseSource.onerror = () => {
    if (sseSource?.readyState === EventSource.CLOSED) {
      // 服务端已关闭连接（终态），不需要重连
      sseStatus.value = 'disconnected'
    } else {
      // 浏览器正在自动重连
      sseStatus.value = 'reconnecting'
    }
  }
}

/** 手动重连：关闭旧连接后重新建立 */
function reconnect() {
  connectSse()
}

// ===== 重试 / 停止操作 =====
const actionLoading = ref(false)

/** 当前执行状态 phase */
const currentPhase = computed(() => detail.value?.status?.phase ?? runDto.value?.status ?? '')

/** 是否失败态（展示重试 + 停止按钮） */
const isFailure = computed(() => currentPhase.value === 'Failed' || currentPhase.value === 'Error')

/** 是否终态（不展示任何按钮） */
const isTerminal = computed(() => currentPhase.value === 'Succeeded' || currentPhase.value === 'Cancelled')

/** 重试执行 */
async function handleRetry() {
  const runId = runDto.value?.pipelineRunId
  if (!runId) {
    ElMessage.warning('缺少执行记录 id，无法重试')
    return
  }
  try {
    await ElMessageBox.confirm('确定要重试该流水线执行吗？', '重试确认', { type: 'warning' })
  } catch {
    return
  }
  actionLoading.value = true
  try {
    await retryPipelineRun(runId)
    ElMessage.success('重试已触发')
    // 重新建立 SSE 连接，获取最新状态
    connectSse()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '重试失败')
  } finally {
    actionLoading.value = false
  }
}

/** 停止执行 */
async function handleStop() {
  const runId = runDto.value?.pipelineRunId
  if (!runId) {
    ElMessage.warning('缺少执行记录 id，无法停止')
    return
  }
  try {
    await ElMessageBox.confirm('确定要停止该流水线执行吗？', '停止确认', { type: 'warning' })
  } catch {
    return
  }
  actionLoading.value = true
  try {
    await stopPipelineRun(runId)
    ElMessage.success('停止已触发')
    connectSse()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '停止失败')
  } finally {
    actionLoading.value = false
  }
}

/** 点击 appName 跳转到对应流水线列表 */
function goAppPipeline(appName?: string) {
  if (!appName) return
  router.push(`/pipeline/list/${encodeURIComponent(appName)}`)
}

// ===== 运行参数弹窗（直接从 SSE 推送的 arguments 解析，无需请求接口） =====
const argsDialogVisible = ref(false)
/** 运行参数表格数据：{ name, value }[] */
const argsRows = ref<{ name: string; value: string }[]>([])

/** 查看运行参数：直接从 runDto.arguments 解析 JSON，表格展示 */
function openArguments() {
  const raw = runDto.value?.arguments
  if (!raw) {
    argsRows.value = []
  } else {
    try {
      const obj = JSON.parse(raw) as Record<string, string>
      argsRows.value = Object.entries(obj).map(([name, value]) => ({ name, value }))
    } catch {
      argsRows.value = []
    }
  }
  argsDialogVisible.value = true
}

// ===== 执行快照弹窗（请求快照接口，编辑器展示完整 JSON） =====
const snapshotDialogVisible = ref(false)
const snapshotLoading = ref(false)
/** 执行快照 JSON 字符串（格式化后） */
const snapshotContent = ref('')

/** 查看执行快照：调快照接口取完整 Workflow CRD JSON，编辑器展示 */
async function openSnapshot() {
  const runId = runDto.value?.pipelineRunId
  if (!runId) {
    ElMessage.warning('缺少执行记录 id，无法获取执行快照')
    return
  }
  snapshotDialogVisible.value = true
  snapshotLoading.value = true
  snapshotContent.value = ''
  try {
    const res = await getPipelineRunSnapshot(runId)
    try {
      snapshotContent.value = JSON.stringify(JSON.parse(res.detail), null, 2)
    } catch {
      snapshotContent.value = res.detail
    }
  } catch (e) {
    ElMessage.error((e as Error)?.message || '执行快照获取失败')
    snapshotContent.value = ''
  } finally {
    snapshotLoading.value = false
  }
}

// 节点详情抽屉
const drawerVisible = ref(false)
const selectedNode = ref<ArgoTaskNode | null>(null)

/** 抽屉基础信息表格数据 */
const baseInfoRows = computed(() => {
  const n = selectedNode.value
  if (!n) return []
  const rows = [
    { name: '节点名', value: n.displayName ?? '-' },
    { name: '状态', value: n.phase ?? '-' },
    { name: '耗时', value: formatDuration(n.startedAt, n.finishedAt) },
    { name: '开始时间', value: n.startedAt ? formatDateTime(n.startedAt) : '-' },
    { name: '结束时间', value: n.finishedAt ? formatDateTime(n.finishedAt) : '-' },
    { name: '运行节点', value: n.hostNodeName ?? '-' },
  ]
  if (n.message) {
    rows.push({ name: '信息', value: n.message })
  }
  return rows
})

const phaseTagType = (phase?: string) => {
  switch (phase) {
    case 'Succeeded':
      return 'success'
    case 'Failed':
    case 'Error':
      return 'danger'
    case 'Running':
      return 'primary'
    case 'Pending':
      return 'warning'
    case 'Waiting':
      return 'info'
    default:
      return 'info'
  }
}

/** VueFlow 节点/边（节点全集来自静态 DAG 任务定义 + dagre 布局，节点数固定不随运行进度变化） */
const flow = computed(() =>
  detail.value
    ? workflowToFlow(detail.value, taskCodeNameMap.value)
    : { nodes: [], edges: [] },
)

/** 节点全集（静态 DAG 任务定义 + 运行时状态合并），未执行的节点状态为 Waiting（未开始）；displayName 优先使用中文名 */
const allTaskNodes = computed<ArgoTaskNode[]>(() => {
  if (!detail.value) return []
  return buildTaskNodes(detail.value).map((t) => ({
    ...t,
    displayName: taskCodeNameMap.value[t.taskName] || t.displayName,
  }))
})

/** taskName → 合并后的任务节点，供抽屉/日志展示完整字段 */
const nodeMap = computed<Map<string, ArgoTaskNode>>(() => {
  const map = new Map<string, ArgoTaskNode>()
  for (const t of allTaskNodes.value) {
    map.set(t.taskName, t)
  }
  return map
})

/** 点击流程节点：打开详情抽屉（e.node.id 即 taskName） */
const onNodeClick = (e: NodeMouseEvent) => {
  const node = nodeMap.value.get(e.node.id)
  if (node) {
    selectedNode.value = node
    drawerVisible.value = true
  }
}

const onPaneReady = () => fitView({ padding: 0.2 })

// ===== 节点日志弹窗（SSE 流式推送） =====
const logDialogVisible = ref(false)
const logLoading = ref(false)
const dialogOpened = ref(false)
const logViewerMounted = ref(false)
const logNodeLabel = ref('')
const logContent = ref('')
/** 日志 SSE 连接 */
let logSseSource: EventSource | null = null

const tryMountViewer = () => {
  if (dialogOpened.value && !logLoading.value && logContent.value && !logViewerMounted.value) {
    logViewerMounted.value = true
  }
}

/** 关闭日志 SSE 连接 */
function closeLogSse() {
  if (logSseSource) {
    logSseSource.close()
    logSseSource = null
  }
}

/**
 * 查看节点日志：通过 SSE 流式获取，服务端持续推送增量日志。
 * 终态：一次性推送全部日志后关闭；非终态：follow k8s 日志流，批量推送。
 */
const onViewLog = (nodeId: string) => {
  const node = nodeMap.value.get(nodeId)
  if (!node?.hasRun) {
    ElMessage.info('该节点尚未执行，暂无日志')
    return
  }
  logNodeLabel.value = node.displayName ?? nodeId
  logContent.value = ''
  logViewerMounted.value = false
  logLoading.value = true
  logDialogVisible.value = true

  // 关闭旧的 SSE 连接，建立新的
  closeLogSse()
  const account = getAccount() ?? ''
  const url = `/api/pipeline-run/log/sse?pipelineRunName=${encodeURIComponent(props.name)}&taskCode=${encodeURIComponent(node.taskName)}&x-user-id=${encodeURIComponent(account)}`
  logSseSource = new EventSource(url)

  // log 事件：增量日志推送
  logSseSource.addEventListener('log', (e: MessageEvent) => {
    try {
      const dto = JSON.parse(e.data)
      if (dto.content) {
        logContent.value += dto.content
      }
      logLoading.value = false
      tryMountViewer()
      // completed=true 表示推送完毕（Pod 结束或终态），关闭连接
      if (dto.completed) {
        closeLogSse()
      }
    } catch {
      // JSON 解析异常忽略
    }
  })

  // 连接异常：回退 mock 日志
  logSseSource.onerror = () => {
    if (logSseSource?.readyState === EventSource.CLOSED) {
      // 服务端已关闭（正常结束），不需要处理
      if (!logContent.value) {
        // 没收到任何数据，可能是节点还没开始执行
        logContent.value = '（暂无日志）'
        logLoading.value = false
        tryMountViewer()
      }
    } else if (!logContent.value) {
      // 连接异常且没有任何数据，回退 mock
      ElMessage.warning(`获取「${logNodeLabel.value}」日志失败，已展示示例日志`)
      logContent.value = getNodeLog(node.displayName ?? nodeId)
      logLoading.value = false
      tryMountViewer()
      closeLogSse()
    }
  }
}

const onLogDialogOpened = () => {
  dialogOpened.value = true
  tryMountViewer()
}

const onLogDialogClosed = () => {
  dialogOpened.value = false
  logViewerMounted.value = false
  logContent.value = ''
  logLoading.value = false
  closeLogSse()
}

onMounted(() => {
  connectSse()
  loadArtifacts()
})
onUnmounted(() => {
  closeSse()
  closeLogSse()
})
</script>

<template>
  <div v-loading="loading" class="pipeline-detail">
    <!-- 顶部信息栏：执行名称 + 状态 + 扩展字段 + 操作按钮 -->
    <div class="pipeline-detail__header">
      <div class="header-left">
        <h3 class="title">{{ detail?.metadata?.name ?? name }}</h3>
        <el-tag v-if="detail?.status?.phase" :type="phaseTagType(detail.status.phase)">
          {{ detail.status.phase }}
        </el-tag>
        <!-- SSE 连接状态提示 -->
        <el-tag v-if="sseStatus === 'reconnecting'" type="warning" size="small">
          连接断开，正在重连...
        </el-tag>
      </div>
      <!-- 操作按钮：终态不展示；失败态展示重试+停止；其它态展示停止 -->
      <div v-if="!isTerminal" class="header-actions">
        <el-button
          v-if="isFailure"
          type="primary"
          size="small"
          :loading="actionLoading"
          @click="handleRetry"
        >
          重试
        </el-button>
        <el-button
          type="danger"
          size="small"
          plain
          :loading="actionLoading"
          @click="handleStop"
        >
          终止
        </el-button>
      </div>
    </div>

    <!-- 基本信息：扩展字段 + 耗时/时间 -->
    <el-descriptions v-if="detail" :column="3" border size="small" class="meta">
      <el-descriptions-item label="应用">
        <a v-if="runDto?.appName" class="link" @click="goAppPipeline(runDto.appName)">
          {{ runDto.appName }}
        </a>
        <span v-else>-</span>
      </el-descriptions-item>
      <el-descriptions-item label="流水线">
        {{ runDto?.pipelineName ?? '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="模板">
        {{ runDto?.pipelineTemplateName ?? runDto?.pipelineTemplateCode ?? '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="执行人">
        {{ runDto?.creator ?? '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="耗时">
        {{ formatDuration(detail.status?.startedAt, detail.status?.finishedAt) }}
      </el-descriptions-item>
      <el-descriptions-item label="开始时间">
        <span v-if="detail.status?.startedAt">
          {{ formatDateTime(detail.status.startedAt) }}
        </span>
        <span v-else>-</span>
      </el-descriptions-item>
      <el-descriptions-item label="结束时间">
        <span v-if="detail.status?.finishedAt">
          {{ formatDateTime(detail.status.finishedAt) }}
        </span>
        <span v-else>-</span>
      </el-descriptions-item>
      <el-descriptions-item label="运行参数">
        <el-button link type="primary" size="small" @click="openArguments">查看</el-button>
      </el-descriptions-item>
      <el-descriptions-item label="执行快照">
        <el-button link type="primary" size="small" @click="openSnapshot">查看</el-button>
      </el-descriptions-item>
      <el-descriptions-item label="制品信息">
        <el-popover
          v-if="artifacts.length"
          placement="bottom"
          :width="480"
          trigger="hover"
        >
          <template #reference>
            <el-link type="primary" :underline="false">
              {{ artifacts.length }} 个制品
            </el-link>
          </template>
          <div class="artifact-popover">
            <div
              v-for="art in artifacts"
              :key="art.id"
              class="artifact-item"
            >
              <div class="artifact-item-header">
                <el-tag :type="art.type === 'IMAGE' ? 'success' : 'info'" size="small">
                  {{ art.type === 'IMAGE' ? '镜像' : '原始' }}
                </el-tag>
                <span class="artifact-item-name">{{ art.name }}</span>
              </div>
              <div class="artifact-item-body">
                <div><span class="label">仓库：</span>{{ art.artifactRepository || '-' }}</div>
                <div><span class="label">路径：</span>{{ art.artifactRepositoryPath || '-' }}</div>
                <div><span class="label">大小：</span>{{ formatArtifactSize(art.size) }}</div>
                <div><span class="label">SHA256：</span>{{ art.sha256 || '-' }}</div>
                <div><span class="label">地址：</span>{{ art.artifactUrl || '-' }}</div>
                <div><span class="label">构建时间：</span>{{ formatDateTime(art.buildTime) }}</div>
              </div>
            </div>
          </div>
        </el-popover>
        <span v-else>-</span>
      </el-descriptions-item>
    </el-descriptions>

    <!-- 节点拓扑（DAG） -->
    <div class="flow-section">
      <div v-if="flow.nodes.length" class="flow-wrap">
        <!-- 缩放控制按钮：绝对定位固定在画布左上角，不随拖拽/缩放移动 -->
        <div class="flow-controls">
          <el-button-group>
            <el-button size="small" :icon="ZoomIn" @click="zoomIn()" />
            <el-button size="small" :icon="ZoomOut" @click="zoomOut()" />
            <el-button size="small" :icon="FullScreen" @click="fitView({ padding: 0.2 })" />
          </el-button-group>
        </div>
        <VueFlow
          :nodes="flow.nodes"
          :edges="flow.edges"
          :default-edge-options="{ type: 'smoothstep' }"
          fit-view-on-init
          :zoom-on-scroll="false"
          :zoom-on-pinch="false"
          :nodes-draggable="false"
          @pane-ready="onPaneReady"
          @node-click="onNodeClick"
        >
          <template #node-pipeline="nodeProps">
            <PipelineFlowNode :id="nodeProps.id" :data="nodeProps.data" @view-log="onViewLog" />
          </template>
        </VueFlow>
      </div>
      <el-empty v-else description="暂无节点数据" />
    </div>

    <!-- 节点详情抽屉 -->
    <el-drawer v-model="drawerVisible" size="840px" :title="selectedNode?.displayName ?? '节点详情'">
      <template v-if="selectedNode">
        <div class="drawer-body">
          <!-- 基础信息 -->
          <div class="param-section">
            <h5 class="param-title">基础信息</h5>
            <el-table :data="baseInfoRows" border size="small">
              <el-table-column prop="name" label="Name" min-width="80" />
              <el-table-column prop="value" label="Value" min-width="260" show-overflow-tooltip />
            </el-table>
          </div>

          <!-- 入参 -->
          <div v-if="selectedNode.inputs?.parameters?.length" class="param-section">
            <h5 class="param-title">入参</h5>
            <el-table :data="selectedNode.inputs.parameters" border size="small">
              <el-table-column prop="name" label="Name" min-width="80" />
              <el-table-column prop="value" label="Value" min-width="260" show-overflow-tooltip>
                <template #default="{ row }">
                  {{ row.value ?? row.default ?? '-' }}
                </template>
              </el-table-column>
            </el-table>
          </div>

          <!-- 出参 -->
          <div v-if="selectedNode.outputs?.parameters?.length" class="param-section">
            <h5 class="param-title">出参</h5>
            <el-table :data="selectedNode.outputs.parameters" border size="small">
              <el-table-column prop="name" label="Name" min-width="80" />
              <el-table-column prop="value" label="Value" min-width="260" show-overflow-tooltip />
            </el-table>
          </div>
        </div>
      </template>
    </el-drawer>

    <!-- 节点日志弹窗（xterm 延迟到动画结束、容器有尺寸后再挂载） -->
    <el-dialog
      v-model="logDialogVisible"
      :title="`节点日志：${logNodeLabel}`"
      width="80%"
      top="8vh"
      destroy-on-close
      @opened="onLogDialogOpened"
      @closed="onLogDialogClosed"
    >
      <div class="log-dialog-body" v-loading="logLoading">
        <XtermLogViewer v-if="logViewerMounted" :content="logContent" />
      </div>
    </el-dialog>

    <!-- 运行参数弹窗（表格展示 key-value） -->
    <el-dialog
      v-model="argsDialogVisible"
      title="运行参数"
      width="50%"
      top="12vh"
      destroy-on-close
    >
      <el-table :data="argsRows" border stripe size="small" empty-text="暂无运行参数">
        <el-table-column prop="name" label="参数名" min-width="160" />
        <el-table-column prop="value" label="参数值" min-width="240" show-overflow-tooltip />
      </el-table>
    </el-dialog>

    <!-- 执行快照弹窗（Monaco JSON 只读编辑器） -->
    <el-dialog
      v-model="snapshotDialogVisible"
      title="执行快照"
      width="60%"
      top="10vh"
      destroy-on-close
    >
      <div class="log-dialog-body" v-loading="snapshotLoading">
        <CodeEditor
          v-if="!snapshotLoading"
          v-model="snapshotContent"
          language="json"
          height="60vh"
          read-only
        />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.pipeline-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding: 16px 20px;
  box-sizing: border-box;
}

.pipeline-detail__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.link {
  color: var(--el-color-primary);
  cursor: pointer;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.refresh {
  margin-left: auto;
}

.meta {
  margin-bottom: 20px;
}

.artifact-popover {
  max-height: 400px;
  overflow-y: auto;
}

.artifact-item {
  padding: 8px 0;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.artifact-item:last-child {
  border-bottom: none;
}

.artifact-item-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.artifact-item-name {
  font-weight: 600;
  word-break: break-all;
}

.artifact-item-body {
  font-size: 13px;
  line-height: 1.8;
  color: var(--el-text-color-regular);
  word-break: break-all;
}

.artifact-item-body .label {
  color: var(--el-text-color-secondary);
}

.flow-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  margin-bottom: 20px;
}

.flow-wrap {
  flex: 1;
  min-height: 0;
  width: 100%;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  overflow: hidden;
  position: relative;
}

/* 缩放控制按钮：固定在画布左上角，悬浮于节点之上，不随画布拖拽/缩放移动 */
.flow-controls {
  position: absolute;
  top: 10px;
  left: 10px;
  z-index: 10;
}

/* 日志弹窗主体：固定高度，仅让 xterm 内部滚动 */
.log-dialog-body {
  height: 70vh;
  overflow: hidden;
  border-radius: 4px;
}

/* 抽屉内容支持滚动 */
.drawer-body {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: 100%;
  overflow-y: auto;
  padding-right: 4px;
  margin-top: -24px;
}

.param-section {
  margin-top: 4px;
}

.param-title {
  margin: 0 0 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
</style>

<!-- Vue Flow 的样式必须全局引入，不能用 scoped -->
<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
</style>
