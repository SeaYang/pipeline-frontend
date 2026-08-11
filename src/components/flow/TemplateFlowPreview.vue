<script setup lang="ts">
import { computed, markRaw } from 'vue'
import { load as yamlLoad } from 'js-yaml'
import { VueFlow, useVueFlow } from '@vue-flow/core'
import { argoToFlow } from '@/utils/argoFlow'
import { detectFormat } from '@/utils/yaml'
import SimpleTaskNode from './SimpleTaskNode.vue'
import ParallelStepEdge from './ParallelStepEdge.vue'

/** 自定义边类型：parallel-step 正交折线边，解决并行分支分叉时的"2"字形折线问题 */
const edgeTypes = markRaw({
  'parallel-step': ParallelStepEdge,
})

/**
 * 流水线模板 DAG 预览：把模板详情文本（JSON/YAML，对应 Argo WorkflowTemplate）
 * 解析后用 argoToFlow 转成 nodes/edges，渲染只展示任务名的最简 DAG。
 * - 数据格式与「流水线执行详情」一致（同为 Argo Workflow 的 spec 结构），仅展示更简。
 * - 仅做可视化，内容编辑请切回 YAML/JSON。
 */
const props = defineProps<{ detail?: string; interactive?: boolean }>()

const { fitView } = useVueFlow()

type View =
  | { kind: 'empty' }
  | { kind: 'noNodes' }
  | { kind: 'error'; message: string }
  | { kind: 'ok'; nodes: ReturnType<typeof argoToFlow>['nodes']; edges: ReturnType<typeof argoToFlow>['edges'] }

const view = computed<View>(() => {
  const text = (props.detail ?? '').trim()
  if (!text) return { kind: 'empty' }
  try {
    const fmt = detectFormat(text)
    const obj = fmt === 'json' ? JSON.parse(text) : yamlLoad(text)
    const flow = argoToFlow(obj)
    if (!flow.nodes.length) return { kind: 'noNodes' }
    return { kind: 'ok', nodes: flow.nodes, edges: flow.edges }
  } catch (e) {
    return { kind: 'error', message: (e as Error)?.message || '解析失败' }
  }
})

const onPaneReady = () => fitView({ padding: 0.2 })
</script>

<template>
  <div class="tpl-preview">
    <el-empty v-if="view.kind === 'empty'" description="暂无模板内容，请先填写模板详情" />
    <el-empty v-else-if="view.kind === 'noNodes'" description="未解析到 DAG 任务节点" />
    <div v-else-if="view.kind === 'error'" class="tpl-preview__error">
      <el-alert type="error" :closable="false" show-icon title="模板内容解析失败">
        {{ view.message }}
      </el-alert>
    </div>
    <VueFlow
      v-else
      :nodes="view.nodes"
      :edges="view.edges"
      :edge-types="edgeTypes"
      :default-edge-options="{ type: 'parallel-step' }"
      fit-view-on-init
      :zoom-on-scroll="interactive"
      :zoom-on-pinch="interactive"
      :zoom-on-double-click="interactive"
      :pan-on-drag="interactive"
      :nodes-draggable="false"
      :nodes-connectable="false"
      :elements-selectable="false"
      :prevent-scrolling="interactive"
      @pane-ready="onPaneReady"
    >
      <template #node-argo="nodeProps">
        <SimpleTaskNode :id="nodeProps.id" :data="nodeProps.data" />
      </template>
    </VueFlow>
  </div>
</template>

<style scoped>
.tpl-preview {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 240px;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
  background: #fff;
}

.tpl-preview__error {
  padding: 12px;
}
</style>

<!-- Vue Flow 的样式必须全局引入，不能用 scoped -->
<style>
@import '@vue-flow/core/dist/style.css';
@import '@vue-flow/core/dist/theme-default.css';
</style>
