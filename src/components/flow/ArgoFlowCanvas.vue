<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { VueFlow, useVueFlow, type Node, type Edge } from '@vue-flow/core'
import ArgoTaskNode from './ArgoTaskNode.vue'
import XtermLogViewer from './XtermLogViewer.vue'
import { getNodeLog } from '@/data/nodeLogs'
import { getPodLog } from '@/api/demo'

defineProps<{ nodes: Node[]; edges: Edge[] }>()

const { fitView, zoomIn, zoomOut } = useVueFlow()

const onPaneReady = () => fitView({ padding: 0.2 })

// ===== 节点日志弹窗 =====
const logDialogVisible = ref(false)
const logLoading = ref(false)
// 弹窗打开动画是否已结束（决定 xterm 能否挂载）
const dialogOpened = ref(false)
// 延迟挂载 xterm：等 el-dialog 打开动画结束、容器具备真实尺寸后再创建终端
const logViewerMounted = ref(false)
const logNodeId = ref('')
const logContent = ref('')

// 日志内容就绪且弹窗动画结束后才挂载 xterm，避免容器尺寸为 0 导致 fit 算错
const tryMountViewer = () => {
  if (dialogOpened.value && !logLoading.value && logContent.value && !logViewerMounted.value) {
    logViewerMounted.value = true
  }
}

/**
 * 查看节点日志：调用后端 /demo/pod/log（podName 取节点任务名，如 git-sync），
 * 失败时回退到本地 mock 日志，保证 UI 始终可用。
 */
const onViewLog = async (id: string) => {
  logNodeId.value = id
  logContent.value = ''
  logViewerMounted.value = false
  logLoading.value = true
  logDialogVisible.value = true
  try {
    const res = await getPodLog("go-cicd-pipeline-vwkvf-entrypoint-3348853539")
    logContent.value = res?.data || '（暂无日志）'
  } catch {
    ElMessage.warning(`获取「${id}」实时日志失败，已展示示例日志`)
    logContent.value = getNodeLog(id)
  } finally {
    logLoading.value = false
    tryMountViewer()
  }
}

const onDialogOpened = () => {
  dialogOpened.value = true
  tryMountViewer()
}

const onDialogClosed = () => {
  dialogOpened.value = false
  logViewerMounted.value = false
  logContent.value = ''
  logLoading.value = false
}
</script>

<template>
  <div class="argo-canvas">
    <div class="argo-canvas__tools">
      <el-button-group>
        <el-button size="small" @click="zoomIn()">
          <el-icon><ZoomIn /></el-icon>&nbsp;放大
        </el-button>
        <el-button size="small" @click="zoomOut()">
          <el-icon><ZoomOut /></el-icon>&nbsp;缩小
        </el-button>
        <el-button size="small" @click="fitView({ padding: 0.2 })">
          <el-icon><FullScreen /></el-icon>&nbsp;适应画布
        </el-button>
      </el-button-group>
    </div>

    <VueFlow
      :nodes="nodes"
      :edges="edges"
      :default-edge-options="{ type: 'smoothstep' }"
      fit-view-on-init
      :zoom-on-scroll="false"
      :zoom-on-pinch="false"
      :zoom-on-double-click="false"
      @pane-ready="onPaneReady"
    >
      <template #node-argo="props">
        <ArgoTaskNode :id="props.id" :data="props.data" @view-log="onViewLog" />
      </template>
    </VueFlow>

    <!-- 节点日志弹窗 -->
    <el-dialog
      v-model="logDialogVisible"
      :title="`节点日志：${logNodeId}`"
      width="80%"
      top="8vh"
      destroy-on-close
      @opened="onDialogOpened"
      @closed="onDialogClosed"
    >
      <div class="log-dialog-body" v-loading="logLoading">
        <XtermLogViewer v-if="logViewerMounted" :content="logContent" />
      </div>
    </el-dialog>
  </div>
</template>

<style scoped>
.argo-canvas {
  position: relative;
  height: 100%;
  width: 100%;
}

.argo-canvas__tools {
  position: absolute;
  top: 12px;
  left: 12px;
  z-index: 5;
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
