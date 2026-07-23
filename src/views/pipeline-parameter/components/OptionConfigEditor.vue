<script lang="ts">
import { ref, watch, onMounted } from 'vue'
export default { name: 'OptionConfigEditor' }
</script>

<script setup lang="ts">
import { Plus, Delete } from '@element-plus/icons-vue'
import { listAllParams } from '@/api/pipelineParameter'

/** 选项配置项（对应 optionConfig JSON 数组的每个元素） */
export interface OptionConfigItem {
  value: string
  label: string | null
  realValue: string
  asDefault: boolean
  parameterDepends: OptionDependItem[] | null
}

/** 选项依赖条件项 */
export interface OptionDependItem {
  name: string
  value: string
}

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** 已有参数名列表（用于依赖参数选择） */
const paramNames = ref<string[]>([])

onMounted(async () => {
  try {
    const allParams = await listAllParams()
    paramNames.value = allParams.map((p) => p.name)
  } catch {
    paramNames.value = []
  }
})

/** 解析 JSON 字符串为选项数组 */
function parseItems(json: string): OptionConfigItem[] {
  if (!json) return []
  try {
    return JSON.parse(json) as OptionConfigItem[]
  } catch {
    return []
  }
}

/** 可变的本地选项列表，避免 computed getter 每次返回新对象导致 input 无法输入 */
const items = ref<OptionConfigItem[]>(parseItems(props.modelValue))

let syncing = false

watch(
  () => props.modelValue,
  (val) => {
    if (syncing) return
    items.value = parseItems(val)
  },
)

/** 将本地数据同步到父组件 */
function sync() {
  syncing = true
  emit('update:modelValue', JSON.stringify(items.value))
  syncing = false
}

function addItem() {
  items.value.push({
    value: '',
    label: null,
    realValue: '',
    asDefault: false,
    parameterDepends: null,
  })
  sync()
}

function removeItem(index: number) {
  items.value.splice(index, 1)
  sync()
}

function addDepend(itemIndex: number) {
  const item = items.value[itemIndex]
  if (!item) return
  if (!item.parameterDepends) item.parameterDepends = []
  item.parameterDepends.push({ name: '', value: '' })
  sync()
}

function removeDepend(itemIndex: number, depIndex: number) {
  const item = items.value[itemIndex]
  if (!item || !item.parameterDepends) return
  item.parameterDepends.splice(depIndex, 1)
  if (item.parameterDepends.length === 0) item.parameterDepends = null
  sync()
}
</script>

<template>
  <div class="option-config-editor">
    <div v-if="items.length === 0" class="empty-hint">暂无选项，点击下方按钮添加</div>

    <div v-for="(item, idx) in items" :key="idx" class="option-item">
      <div class="option-item__header">
        <span class="option-item__title">选项 {{ idx + 1 }}</span>
        <el-button link type="danger" :icon="Delete" @click="removeItem(idx)">移除</el-button>
      </div>

      <el-form-item label="value" label-width="80px" class="option-field">
        <el-input v-model="item.value" placeholder="选项值" @input="sync" />
      </el-form-item>

      <el-form-item label="label" label-width="80px" class="option-field">
        <el-input v-model="item.label" placeholder="展示文案(可空)" @input="sync" />
      </el-form-item>

      <el-form-item label="realValue" label-width="80px" class="option-field">
        <el-input v-model="item.realValue" placeholder="实际传给Argo的值" @input="sync" />
      </el-form-item>

      <el-form-item label="默认选中" label-width="80px" class="option-field">
        <el-switch v-model="item.asDefault" @change="sync" />
      </el-form-item>

      <!-- 依赖条件 -->
      <div class="depend-section">
        <div class="depend-section__header">
          <span class="depend-section__title">显示条件 (parameterDepends)</span>
          <el-button link type="primary" :icon="Plus" size="small" @click="addDepend(idx)">添加条件</el-button>
        </div>
        <div v-if="item.parameterDepends && item.parameterDepends.length > 0">
          <div v-for="(dep, depIdx) in item.parameterDepends" :key="depIdx" class="depend-row">
            <el-select
              v-model="dep.name"
              placeholder="选择参数"
              filterable
              clearable
              class="depend-select"
              @change="sync"
            >
              <el-option v-for="pn in paramNames" :key="pn" :label="pn" :value="pn" />
            </el-select>
            <span class="depend-eq">=</span>
            <el-input v-model="dep.value" placeholder="条件值" class="depend-input" @input="sync" />
            <el-button link type="danger" :icon="Delete" @click="removeDepend(idx, depIdx)" />
          </div>
        </div>
        <div v-else class="depend-empty">无条件显示</div>
      </div>
    </div>

    <el-button type="primary" plain :icon="Plus" class="add-btn" @click="addItem">添加选项</el-button>
  </div>
</template>

<style scoped>
.option-config-editor {
  width: 100%;
}
.empty-hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  padding: 8px 0;
}
.option-item {
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  padding: 12px;
  margin-bottom: 12px;
  background: var(--el-fill-color-blank);
}
.option-item__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}
.option-item__title {
  font-weight: 600;
  font-size: 13px;
  color: var(--el-text-color-primary);
}
.option-field {
  margin-bottom: 18px;
}
.depend-section {
  margin-top: 4px;
  padding-left: 8px;
  border-left: 2px solid var(--el-border-color-lighter);
}
.depend-section__header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}
.depend-section__title {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.depend-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 6px;
}
.depend-select {
  width: 200px;
}
.depend-eq {
  color: var(--el-text-color-secondary);
}
.depend-input {
  flex: 1;
}
.depend-empty {
  font-size: 12px;
  color: var(--el-text-color-placeholder);
}
.add-btn {
  width: 100%;
}
</style>
