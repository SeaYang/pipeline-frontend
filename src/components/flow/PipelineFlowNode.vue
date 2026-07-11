<script setup lang="ts">
import { computed } from 'vue'
import { Handle, Position } from '@vue-flow/core'
import type { PipelineNodeData } from '@/utils/workflowFlow'

const props = defineProps<{ id: string; data: PipelineNodeData }>()

const emit = defineEmits<{
  (e: 'viewLog', id: string): void
}>()

/** 查看节点日志：把节点 id 透传给父级，由父级按 Argo v2 规则拼 pod name 后拉日志 */
const onViewLog = () => emit('viewLog', props.id)

/** phase → 强调色 + el-tag 类型 */
const phaseStyle = computed(() => {
  switch (props.data.phase) {
    case 'Succeeded':
      return { accent: '#67c23a', tag: 'success' as const }
    case 'Failed':
    case 'Error':
      return { accent: '#f56c6c', tag: 'danger' as const }
    case 'Running':
      return { accent: '#409eff', tag: 'primary' as const }
    case 'Pending':
      return { accent: '#e6a23c', tag: 'warning' as const }
    case 'Skipped':
    case 'Omitted':
      return { accent: '#909399', tag: 'info' as const }
    case 'Waiting':
      return { accent: '#c0c4cc', tag: 'info' as const }
    default:
      return { accent: '#909399', tag: 'info' as const }
  }
})
</script>

<template>
  <div class="pnode" :style="{ '--accent': phaseStyle.accent }">
    <Handle type="target" :position="Position.Left" />

    <div class="pnode__head">
      <span class="pnode__dot" :style="{ background: phaseStyle.accent }"></span>
      <span class="pnode__title" :title="data.label">{{ data.label }}</span>
    </div>

    <div class="pnode__meta">
      <el-tag size="small" :type="phaseStyle.tag">{{ data.phase || 'Unknown' }}</el-tag>
      <span v-if="data.duration" class="pnode__dur">{{ data.duration }}</span>
    </div>

    <!-- 节点底部：始终占位以保持所有节点高度一致；仅已产生运行实例的节点展示“查看日志”（@click.stop 阻止冒泡，避免同时触发节点抽屉） -->
    <div class="pnode__footer">
      <el-button v-if="data.hasRun" size="small" type="primary" text bg @click.stop="onViewLog">
        <el-icon><Document /></el-icon>&nbsp;日志
      </el-button>
    </div>

    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.pnode {
  width: 200px;
  height: 96px;
  box-sizing: border-box;
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  background: #fff;
  border: 1px solid var(--el-border-color);
  /* 左侧用状态色做强调条 */
  border-left: 3px solid var(--accent);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  font-size: 12px;
  color: var(--el-text-color-primary);
  cursor: pointer;
  transition: box-shadow 0.2s, border-color 0.2s;
}

.pnode:hover {
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.14);
}

.pnode__head {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pnode__dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 50%;
}

.pnode__title {
  font-size: 13px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pnode__meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.pnode__dur {
  color: var(--el-text-color-secondary);
}

.pnode__footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  height: 28px;
  border-top: 1px dashed var(--el-border-color-lighter);
}
</style>
