<script setup lang="ts">
import { Handle, Position } from '@vue-flow/core'
import type { ArgoNodeData } from '@/utils/argoFlow'

defineProps<{ id?: string; data: ArgoNodeData }>()
</script>

<template>
  <div class="simple-node">
    <!-- 左侧入边把手 -->
    <Handle type="target" :position="Position.Left" />
    <span class="simple-node__title" :title="data.label">{{ data.label }}</span>
    <!-- 右侧出边把手 -->
    <Handle type="source" :position="Position.Right" />
  </div>
</template>

<style scoped>
/* 模板预览用的最简 DAG 节点：只展示任务名 */
.simple-node {
  min-width: 120px;
  max-width: 200px;
  box-sizing: border-box;
  padding: 8px 14px;
  background: #fff;
  border: 1px solid var(--el-color-primary-light-5);
  border-radius: 6px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
  font-size: 13px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  text-align: center;
}

.simple-node__title {
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
</style>
