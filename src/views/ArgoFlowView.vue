<script setup lang="ts">
import { computed } from 'vue'
// 直接导入模板 JSON；替换 data/go-cicd-template.json 后开发服务器会热更新
import templateData from '../../data/go-cicd-template.json'
import { argoToFlow } from '@/utils/argoFlow'
import ArgoFlowCanvas from '@/components/flow/ArgoFlowCanvas.vue'

const result = computed(() => argoToFlow(templateData))
</script>

<template>
  <div class="argo-view">
    <!-- 顶部信息栏 -->
    <div class="toolbar">
      <div class="toolbar__left">
        <h3 class="title">Argo Workflow DAG 可视化</h3>
        <el-tag size="small">{{ result.meta.name }}</el-tag>
        <el-tag size="small" type="info">entrypoint: {{ result.meta.entrypoint }}</el-tag>
        <el-tag size="small" type="success">{{ result.meta.taskCount }} 个任务节点</el-tag>
        <el-tag size="small" type="warning">{{ result.meta.edgeCount }} 条依赖</el-tag>
      </div>
      <div class="toolbar__right">
        <el-text type="info" size="small">节点从左到右按依赖分层排布</el-text>
      </div>
    </div>

    <!-- 模板描述 -->
    <el-alert
      v-if="result.meta.description"
      type="info"
      :closable="false"
      show-icon
      class="desc"
    >
      {{ result.meta.description }}
    </el-alert>

    <!-- 数据兜底提示 -->
    <el-alert
      v-if="result.meta.fallback"
      type="warning"
      :closable="false"
      show-icon
      class="desc"
    >
      {{ result.meta.fallback }}
    </el-alert>

    <!-- DAG 画布 -->
    <div class="flow-wrapper">
      <ArgoFlowCanvas :nodes="result.nodes" :edges="result.edges" />
    </div>
  </div>
</template>

<style scoped>
.argo-view {
  padding: 20px;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 12px;
  flex-shrink: 0;
}

.toolbar__left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.toolbar .title {
  margin: 0;
  font-size: 18px;
  color: var(--el-text-color-primary);
}

.desc {
  margin-bottom: 12px;
  flex-shrink: 0;
}

.flow-wrapper {
  flex: 1;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
  min-height: 0; /* 让 flex 子项可缩小，VueFlow 才能正确撑满 */
}
</style>
