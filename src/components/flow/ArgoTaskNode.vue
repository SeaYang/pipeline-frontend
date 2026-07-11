<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { ArgoNodeData, ArgoRefKind } from '@/utils/argoFlow'

const props = defineProps<{ id?: string; data: ArgoNodeData }>()

const emit = defineEmits<{
  (e: 'viewLog', id: string): void
}>()

const onLogClick = () => {
  // id 与 data.label(task name) 一致；兜底用 label
  emit('viewLog', props.id ?? props.data.label)
}

const refKindLabel: Record<ArgoRefKind, string> = {
  templateRef: 'templateRef',
  template: 'template',
  inline: 'inline',
  script: 'script',
  container: 'container',
  dag: 'dag',
  unknown: '无引用',
}
</script>

<template>
  <div class="argo-node">
    <!-- 左侧入边把手 -->
    <Handle type="target" :position="Position.Left" />

    <div class="argo-node__head">
      <span class="argo-node__title" :title="data.label">{{ data.label }}</span>
      <el-tag size="small" effect="plain" round>阶段 {{ data.layer + 1 }}</el-tag>
    </div>

    <div class="argo-node__ref">
      <el-icon><Link /></el-icon>
      <span class="argo-node__ref-name" :title="data.templateName">
        {{ data.templateName || '（无引用）' }}
      </span>
      <el-tag size="small" type="info">{{ refKindLabel[data.refKind] }}</el-tag>
    </div>

    <div class="argo-node__meta">
      <span><el-icon><Connection /></el-icon> 入参 {{ data.paramCount }}</span>
      <span><el-icon><Share /></el-icon> 依赖 {{ data.depCount }}</span>
    </div>

    <div v-if="data.when" class="argo-node__when" :title="data.when">
      <el-icon><WarnTriangleFilled /></el-icon>
      <code>when: {{ data.when }}</code>
    </div>

    <!-- 节点底部操作栏：查看运行日志 -->
    <div class="argo-node__footer">
      <el-button
        class="nodrag"
        size="small"
        type="primary"
        text
        bg
        @click.stop="onLogClick"
      >
        <el-icon><Document /></el-icon>&nbsp;日志
      </el-button>
    </div>

    <!-- 右侧出边把手 -->
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
.argo-node {
  width: 220px;
  padding: 10px 12px;
  background: #fff;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  font-size: 12px;
  color: var(--el-text-color-primary);
  transition: box-shadow 0.2s, border-color 0.2s;
}

.argo-node:hover {
  border-color: var(--el-color-primary);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.12);
}

.argo-node__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 6px;
}

.argo-node__title {
  font-size: 14px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.argo-node__ref {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--el-text-color-secondary);
}

.argo-node__ref-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
}

.argo-node__meta {
  display: flex;
  gap: 14px;
  margin-top: 8px;
  color: var(--el-text-color-secondary);
}

.argo-node__meta span {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.argo-node__when {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
  color: var(--el-color-warning);
}

.argo-node__when code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.argo-node__footer {
  margin-top: 8px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px dashed var(--el-border-color-lighter);
  padding-top: 8px;
}
</style>
