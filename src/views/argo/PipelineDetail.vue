<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { VueFlow, useVueFlow, type NodeMouseEvent } from '@vue-flow/core'
import { ElMessage } from 'element-plus'
import { ArrowLeft, Refresh, ZoomIn, ZoomOut, FullScreen } from '@element-plus/icons-vue'
import { getWorkflowDetail, type ArgoWorkflowDetail } from '@/api/argo'
import { workflowToFlow, buildPodName, buildTaskNodes, type ArgoTaskNode } from '@/utils/workflowFlow'
import { getPodLog } from '@/api/demo'
import { getNodeLog } from '@/data/nodeLogs'
import { formatDateTime, formatDuration, formatRelative } from '@/utils/time'
import PipelineFlowNode from '@/components/flow/PipelineFlowNode.vue'
import XtermLogViewer from '@/components/flow/XtermLogViewer.vue'

const props = defineProps<{ name: string }>()

const { fitView, zoomIn, zoomOut } = useVueFlow()

const loading = ref(false)
const detail = ref<ArgoWorkflowDetail | null>(null)

// 节点详情抽屉
const drawerVisible = ref(false)
const selectedNode = ref<ArgoTaskNode | null>(null)

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
const flow = computed(() => (detail.value ? workflowToFlow(detail.value) : { nodes: [], edges: [] }))

/** 节点全集（静态 DAG 任务定义 + 运行时状态合并），未执行的节点状态为 Waiting（未开始） */
const allTaskNodes = computed<ArgoTaskNode[]>(() => (detail.value ? buildTaskNodes(detail.value) : []))

/** taskName → 合并后的任务节点，供抽屉/日志展示完整字段 */
const nodeMap = computed<Map<string, ArgoTaskNode>>(() => {
  const map = new Map<string, ArgoTaskNode>()
  for (const t of allTaskNodes.value) {
    map.set(t.taskName, t)
  }
  return map
})

/** 任务节点列表（信息表）：已开始的按开始时间排序，未开始（Waiting）的按 DAG 声明顺序排在最后 */
const taskNodes = computed<ArgoTaskNode[]>(() =>
  [...allTaskNodes.value].sort((a, b) => {
    const ta = a.startedAt ? new Date(a.startedAt).getTime() : Number.POSITIVE_INFINITY
    const tb = b.startedAt ? new Date(b.startedAt).getTime() : Number.POSITIVE_INFINITY
    return ta - tb
  }),
)

/** 点击流程节点：打开详情抽屉（e.node.id 即 taskName） */
const onNodeClick = (e: NodeMouseEvent) => {
  const node = nodeMap.value.get(e.node.id)
  if (node) {
    selectedNode.value = node
    drawerVisible.value = true
  }
}

const onPaneReady = () => fitView({ padding: 0.2 })

// ===== 节点日志弹窗 =====
const logDialogVisible = ref(false)
const logLoading = ref(false)
// el-dialog 打开动画是否结束（决定 xterm 能否挂载，避免容器尺寸为 0 导致 fit 算错）
const dialogOpened = ref(false)
const logViewerMounted = ref(false)
const logNodeLabel = ref('')
const logContent = ref('')

const tryMountViewer = () => {
  if (dialogOpened.value && !logLoading.value && logContent.value && !logViewerMounted.value) {
    logViewerMounted.value = true
  }
}

/**
 * 查看节点日志：按 Argo pod-name-format v2 规则用 runtimeId + templateRef.template
 * 拼出 pod name，调后端 /demo/pod/log；失败时回退本地 mock 日志，保证弹窗不为空。
 * 尚未产生运行实例（Waiting）的节点没有 pod，不发起调用。
 */
const onViewLog = async (nodeId: string) => {
  const node = nodeMap.value.get(nodeId)
  if (!node?.hasRun || !node.runtimeId) {
    ElMessage.info('该节点尚未执行，暂无日志')
    return
  }
  const wfName = detail.value?.metadata?.name ?? ''
  const podName = buildPodName(wfName, { id: node.runtimeId, templateRef: node.templateRef })
  logNodeLabel.value = node.displayName ?? nodeId
  logContent.value = ''
  logViewerMounted.value = false
  logLoading.value = true
  logDialogVisible.value = true
  try {
    const res = await getPodLog(podName)
    logContent.value = res?.data || '（暂无日志）'
  } catch {
    ElMessage.warning(`获取「${logNodeLabel.value}」实时日志失败，已展示示例日志`)
    logContent.value = getNodeLog(node.displayName ?? nodeId)
  } finally {
    logLoading.value = false
    tryMountViewer()
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
}

async function fetchData() {
  loading.value = true
  try {
    detail.value = await getWorkflowDetail(props.name)
  } catch {
    ElMessage.error('流水线详情获取失败')
    detail.value = null
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)
</script>

<template>
  <div v-loading="loading" class="pipeline-detail">
    <div class="pipeline-detail__header">
      <el-button :icon="ArrowLeft" link @click="$router.push('/argo/pipelines')">
        返回列表
      </el-button>
      <h3 class="title">{{ detail?.metadata?.name ?? name }}</h3>
      <el-tag v-if="detail?.status?.phase" :type="phaseTagType(detail.status.phase)">
        {{ detail.status.phase }}
      </el-tag>
      <el-button
        class="refresh"
        :icon="Refresh"
        :loading="loading"
        size="small"
        @click="fetchData"
      >
        刷新
      </el-button>
    </div>

    <!-- 基本信息 -->
    <el-descriptions v-if="detail" :column="3" border size="small" class="meta">
      <el-descriptions-item label="命名空间">
        {{ detail.metadata?.namespace }}
      </el-descriptions-item>
      <el-descriptions-item label="进度">
        {{ detail.status?.progress ?? '-' }}
      </el-descriptions-item>
      <el-descriptions-item label="耗时">
        {{ formatDuration(detail.status?.startedAt, detail.status?.finishedAt) }}
      </el-descriptions-item>
      <el-descriptions-item label="开始时间">
        <span v-if="detail.status?.startedAt">
          {{ formatRelative(detail.status.startedAt) }} {{ formatDateTime(detail.status.startedAt) }}
        </span>
        <span v-else>-</span>
      </el-descriptions-item>
      <el-descriptions-item label="结束时间">
        <span v-if="detail.status?.finishedAt">
          {{ formatRelative(detail.status.finishedAt) }} {{ formatDateTime(detail.status.finishedAt) }}
        </span>
        <span v-else>-</span>
      </el-descriptions-item>
      <el-descriptions-item label="入口模板">
        {{ detail.spec?.entrypoint ?? '-' }}
      </el-descriptions-item>
    </el-descriptions>

    <!-- 节点拓扑（DAG） -->
    <div class="flow-section">
      <div class="flow-section__title">
        <el-button-group v-if="flow.nodes.length">
          <el-button size="small" :icon="ZoomIn" @click="zoomIn()" />
          <el-button size="small" :icon="ZoomOut" @click="zoomOut()" />
          <el-button size="small" :icon="FullScreen" @click="fitView({ padding: 0.2 })" />
        </el-button-group>
        <h4 class="section-title">节点拓扑</h4>
      </div>
      <div v-if="flow.nodes.length" class="flow-wrap">
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

    <!-- 节点列表（信息表） -->
    <h4 class="section-title">节点列表</h4>
    <el-table :data="taskNodes" border stripe size="small" empty-text="暂无节点数据">
      <el-table-column label="节点" min-width="200">
        <template #default="{ row }">
          {{ row.displayName }}
        </template>
      </el-table-column>
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          {{ row.type ?? '-' }}
        </template>
      </el-table-column>
      <el-table-column label="状态" width="110">
        <template #default="{ row }">
          <el-tag v-if="row.phase" size="small" :type="phaseTagType(row.phase)">
            {{ row.phase }}
          </el-tag>
          <span v-else>-</span>
        </template>
      </el-table-column>
      <el-table-column label="进度" width="90">
        <template #default="{ row }">
          {{ row.progress ?? '-' }}
        </template>
      </el-table-column>
      <el-table-column label="耗时" width="100">
        <template #default="{ row }">
          {{ formatDuration(row.startedAt, row.finishedAt) }}
        </template>
      </el-table-column>
      <el-table-column label="开始时间" min-width="240">
        <template #default="{ row }">
          <span v-if="row.startedAt">
            {{ formatRelative(row.startedAt) }} {{ formatDateTime(row.startedAt) }}
          </span>
          <span v-else>-</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 节点详情抽屉 -->
    <el-drawer v-model="drawerVisible" size="420px" :title="selectedNode?.displayName ?? '节点详情'">
      <template v-if="selectedNode">
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="节点名">
            {{ selectedNode.displayName }}
          </el-descriptions-item>
          <el-descriptions-item label="类型">
            {{ selectedNode.type ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag v-if="selectedNode.phase" size="small" :type="phaseTagType(selectedNode.phase)">
              {{ selectedNode.phase }}
            </el-tag>
            <span v-else>-</span>
          </el-descriptions-item>
          <el-descriptions-item label="进度">
            {{ selectedNode.progress ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="耗时">
            {{ formatDuration(selectedNode.startedAt, selectedNode.finishedAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="开始时间">
            {{ selectedNode.startedAt ? formatDateTime(selectedNode.startedAt) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="结束时间">
            {{ selectedNode.finishedAt ? formatDateTime(selectedNode.finishedAt) : '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="运行节点">
            {{ selectedNode.hostNodeName ?? '-' }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedNode.templateRef" label="引用模板">
            {{ selectedNode.templateRef.name }} / {{ selectedNode.templateRef.template }}
          </el-descriptions-item>
          <el-descriptions-item v-if="selectedNode.message" label="信息">
            {{ selectedNode.message }}
          </el-descriptions-item>
        </el-descriptions>
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
  </div>
</template>

<style scoped>
.pipeline-detail {
  padding: 16px 20px;
}

.pipeline-detail__header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.refresh {
  margin-left: auto;
}

.meta {
  margin-bottom: 20px;
}

.flow-section {
  margin-bottom: 20px;
}

.flow-section__title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.section-title {
  margin: 0 0 12px;
  font-size: 15px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.flow-wrap {
  height: 420px;
  width: 100%;
  border: 1px solid var(--el-border-color-light);
  border-radius: 6px;
  overflow: hidden;
}

/* 日志弹窗主体：固定高度，仅让 xterm 内部滚动 */
.log-dialog-body {
  height: 70vh;
  overflow: hidden;
  border-radius: 4px;
}
</style>

<!-- Vue Flow 的样式必须全局引入，不能用 scoped -->
<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
</style>
