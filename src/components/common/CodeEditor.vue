<script setup lang="ts">
import { computed } from 'vue'
import { VueMonacoEditor } from '@guolao/vue-monaco-editor'
import type * as monaco from 'monaco-editor'
// 注册 Monaco 的 web worker（副作用 import，仅需一次）
import '@/utils/monacoWorkers'

interface Props {
  /** 编辑器文本（v-model） */
  modelValue: string
  /** 语言：json / yaml */
  language: 'json' | 'yaml'
  /** 高度，默认 420px */
  height?: string
  /** 是否只读 */
  readOnly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  height: '420px',
  readOnly: false,
})

const emit = defineEmits<{ 'update:modelValue': [value: string] }>()

const options = computed<monaco.editor.IStandaloneEditorConstructionOptions>(() => ({
  minimap: { enabled: false },
  automaticLayout: true,
  fontSize: 13,
  tabSize: 2,
  scrollBeyondLastLine: false,
  wordWrap: 'on',
  readOnly: props.readOnly,
  smoothScrolling: true,
}))

function handleUpdate(value: string | undefined) {
  emit('update:modelValue', value ?? '')
}
</script>

<template>
  <div class="code-editor">
    <VueMonacoEditor
      :value="modelValue"
      :language="language"
      theme="vs"
      :height="height"
      :options="options"
      className="code-editor__host"
      @update:value="handleUpdate"
    />
  </div>
</template>

<style scoped>
.code-editor {
  position: relative;
  width: 100%;
  border: 1px solid var(--el-border-color);
  border-radius: 4px;
  overflow: hidden;
}

/*
 * monaco 宿主绝对填充：让编辑器严格跟随 .code-editor 的尺寸，且脱离文档流、
 * 不参与父级的内容尺寸计算。这样把 CodeEditor 放进 flex 布局时，编辑器内容
 * 再长也不会撑大外层盒子（automaticLayout 仍会随容器变化自动重排）。
 */
.code-editor :deep(.code-editor__host) {
  position: absolute;
  inset: 0;
}
</style>
