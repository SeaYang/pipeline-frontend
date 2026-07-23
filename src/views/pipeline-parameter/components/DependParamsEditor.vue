<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { listAllParams, type PipelineParameter } from '@/api/pipelineParameter'

const props = defineProps<{
  /** JSON 数组字符串，如 ["build-jdk-version"] */
  modelValue: string
  /** 排除的参数名（通常是当前编辑的参数自身） */
  excludeName?: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** 全部参数列表（name + label） */
const allParams = ref<PipelineParameter[]>([])

onMounted(async () => {
  try {
    allParams.value = await listAllParams()
  } catch {
    allParams.value = []
  }
})

/** 已选中的参数名列表 */
const selectedNames = computed<string[]>({
  get() {
    if (!props.modelValue) return []
    try {
      return JSON.parse(props.modelValue) as string[]
    } catch {
      return []
    }
  },
  set(val) {
    emit('update:modelValue', JSON.stringify(val))
  },
})

/** 可选的参数（排除已选和自身） */
const availableParams = computed(() => {
  return allParams.value.filter(
    (p) => !selectedNames.value.includes(p.name) && p.name !== props.excludeName,
  )
})

/** 下拉选中值（参数名） */
const selectValue = ref('')

function addTag(name: string) {
  const trimmed = name.trim()
  if (!trimmed || selectedNames.value.includes(trimmed)) return
  selectedNames.value = [...selectedNames.value, trimmed]
  selectValue.value = ''
}

function removeTag(name: string) {
  selectedNames.value = selectedNames.value.filter((n) => n !== name)
}
</script>

<template>
  <div class="depend-params-editor">
    <!-- 搜索添加 -->
    <el-select
      v-model="selectValue"
      filterable
      clearable
      placeholder="搜索并添加依赖参数"
      class="add-select"
      @change="(val: string) => addTag(val)"
    >
      <el-option
        v-for="p in availableParams"
        :key="p.name"
        :label="p.label ? `${p.label}(${p.name})` : p.name"
        :value="p.name"
      />
    </el-select>

    <!-- 已选 Tag -->
    <div v-if="selectedNames.length > 0" class="tags-area">
      <el-tag
        v-for="name in selectedNames"
        :key="name"
        closable
        type="primary"
        class="param-tag"
        @close="removeTag(name)"
      >
        {{ name }}
      </el-tag>
    </div>
  </div>
</template>

<style scoped>
.depend-params-editor {
  width: 100%;
}
.add-select {
  width: 100%;
  margin-bottom: 8px;
}
.tags-area {
  padding: 4px 0;
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.param-tag {
  margin: 0;
}
</style>
