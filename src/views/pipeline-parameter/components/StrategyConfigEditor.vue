<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { Plus, Delete } from '@element-plus/icons-vue'
import { strategyTypeEnums, type EnumOption } from '@/api/pipelineParameter'

/** 策略配置项 */
export interface StrategyConfigItem {
  strategyType: string
  priority: number
}

const props = defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const strategyOptions = ref<EnumOption[]>([])

onMounted(async () => {
  try {
    strategyOptions.value = await strategyTypeEnums()
  } catch {
    strategyOptions.value = []
  }
})

/** 优先级选项 0-20 */
const priorityOptions = Array.from({ length: 21 }, (_, i) => i)

/** 解析 JSON 字符串为策略数组 */
function parseItems(json: string): StrategyConfigItem[] {
  if (!json) return []
  try {
    return JSON.parse(json) as StrategyConfigItem[]
  } catch {
    return []
  }
}

/** 可变的本地策略列表 */
const items = ref<StrategyConfigItem[]>(parseItems(props.modelValue))

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
  items.value.push({ strategyType: '', priority: 0 })
  sync()
}

function removeItem(index: number) {
  items.value.splice(index, 1)
  sync()
}
</script>

<template>
  <div class="strategy-config-editor">
    <div v-if="items.length === 0" class="empty-hint">暂无策略，点击下方按钮添加</div>

    <div v-for="(item, idx) in items" :key="idx" class="strategy-item">
      <el-row :gutter="12" align="middle">
        <el-col :span="10">
          <el-form-item label-width="60px">
            <template #label>
              <el-tooltip content="配置参数默认值从哪里获取，比如 app 配置或最近一次执行成功记录" placement="top">
                <span>策略 <el-icon class="label-icon"><InfoFilled /></el-icon></span>
              </el-tooltip>
            </template>
            <el-select v-model="item.strategyType" placeholder="请选择策略" filterable @change="sync">
              <el-option
                v-for="opt in strategyOptions"
                :key="opt.code"
                :label="`${opt.description}(${opt.code})`"
                :value="opt.code"
              />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item label="优先级" label-width="60px">
            <el-select v-model="item.priority" placeholder="选择优先级" @change="sync">
              <el-option v-for="p in priorityOptions" :key="p" :label="`${p}`" :value="p" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="4">
          <el-tooltip content="数值越大优先级越高" placement="top">
            <el-icon class="priority-hint"><InfoFilled /></el-icon>
          </el-tooltip>
        </el-col>
        <el-col :span="2">
          <el-button link type="danger" :icon="Delete" @click="removeItem(idx)" />
        </el-col>
      </el-row>
    </div>

    <el-button type="primary" plain :icon="Plus" class="add-btn" @click="addItem">添加策略</el-button>
  </div>
</template>

<style scoped>
.strategy-config-editor {
  width: 100%;
}
.empty-hint {
  color: var(--el-text-color-secondary);
  font-size: 13px;
  padding: 8px 0;
}
.strategy-item {
  border: 1px solid var(--el-border-color-light);
  border-radius: 4px;
  padding: 8px 12px;
  margin-bottom: 8px;
  background: var(--el-fill-color-blank);
}
.priority-hint {
  font-size: 16px;
  color: var(--el-text-color-secondary);
  cursor: help;
}
.label-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  cursor: help;
  vertical-align: middle;
}
.add-btn {
  width: 100%;
}
</style>
