<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { ElMessage, type FormInstance } from 'element-plus'
import {
  listRunParameters,
  refreshRunParameters,
  executePipeline,
  type RunParameter,
  type RunParameterOption,
} from '@/api/pipeline'

interface Props {
  /** v-model 控制显隐 */
  modelValue: boolean
  /** 流水线 ID */
  pipelineId: number
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: [workflowName: string]
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

// ==================== 参数数据 ====================
const loading = ref(false)
const submitting = ref(false)
const formRef = ref<FormInstance>()
const params = ref<RunParameter[]>([])
const values = reactive<Record<string, string>>({})

/** 按 paramGroup 分组后的参数列表 */
const groupedParams = computed(() => {
  const groups = new Map<string, RunParameter[]>()
  for (const p of params.value) {
    if (p.hidden) continue
    const group = p.paramGroup ?? 'default'
    if (!groups.has(group)) {
      groups.set(group, [])
    }
    groups.get(group)!.push(p)
  }
  // 组内按 paramGroupSort 排序
  for (const [, list] of groups) {
    list.sort((a, b) => (a.paramGroupSort ?? 0) - (b.paramGroupSort ?? 0))
  }
  return Array.from(groups.entries()).map(([group, list]) => ({ group, list }))
})

// ==================== 选项条件过滤 ====================

/**
 * 根据当前参数值过滤选项。
 * <p>如果选项的 parameterDepends 为 null/undefined，无条件显示；
 * 否则需所有条件匹配（依赖参数当前值 === 条件值）才显示。
 */
function visibleOptions(param: RunParameter): RunParameterOption[] {
  if (!param.options || param.options.length === 0) return []
  return param.options.filter((opt) => {
    if (!opt.parameterDepends || opt.parameterDepends.length === 0) return true
    // 所有条件都需匹配
    return opt.parameterDepends.every((dep) => {
      const currentVal = values[dep.name]
      return currentVal === dep.value
    })
  })
}

// ==================== 加载参数 ====================
async function loadParams() {
  loading.value = true
  params.value = []
  Object.keys(values).forEach((k) => delete values[k])
  try {
    const list = await listRunParameters({ pipelineId: props.pipelineId })
    params.value = list
    // 填充初始值：优先 value，其次 asDefault 选项
    for (const p of list) {
      if (p.value != null && p.value !== '') {
        values[p.name] = p.value
      } else if (p.options && p.options.length > 0) {
        const defaultOpt = p.options.find((o) => o.asDefault)
        values[p.name] = defaultOpt?.value ?? ''
      } else {
        values[p.name] = ''
      }
    }
    // 初始化参数值快照（用于联动刷新检测）
    prevValues = { ...values }
  } catch (e) {
    ElMessage.error((e as Error)?.message || '参数获取失败')
  } finally {
    loading.value = false
  }
}

// 弹框打开时加载参数
watch(visible, (val) => {
  if (val && props.pipelineId) {
    loadParams()
  }
})

// ==================== 参数联动刷新 ====================

/** 标记是否正在刷新，防止刷新回写触发二次刷新 */
const refreshing = ref(false)
/** 记录上一次参数值快照，用于检测变动 */
let prevValues: Record<string, string> = {}

/**
 * 监听参数值变化，当 refreshOnChanged=true 的参数值变动时，调用后端刷新接口。
 */
watch(
  values,
  (newValues) => {
    if (refreshing.value || params.value.length === 0) return
    // 找出值发生变动的 refreshOnChanged 参数
    const changedParams: string[] = []
    for (const p of params.value) {
      if (!p.refreshOnChanged) continue
      const newVal = newValues[p.name] ?? ''
      const oldVal = prevValues[p.name] ?? ''
      if (newVal !== oldVal) {
        changedParams.push(p.name)
      }
    }
    if (changedParams.length === 0) return
    // 只取第一个变动的参数触发刷新（后端会递归计算所有下游）
    const firstChanged = changedParams[0]
    if (firstChanged) {
      doRefresh(firstChanged)
    }
  },
  { deep: true },
)

/**
 * 调用后端刷新接口，更新受影响的参数值和选项。
 */
async function doRefresh(changedParamName: string) {
  refreshing.value = true
  try {
    const affected = await refreshRunParameters({
      pipelineId: props.pipelineId,
      changedParamName,
      currentValues: { ...values },
    })
    // 局部更新受影响的参数
    for (const updated of affected) {
      // 更新参数定义（选项等）
      const idx = params.value.findIndex((p) => p.name === updated.name)
      if (idx >= 0) {
        params.value[idx] = updated
      }
      // 更新参数值（仅当后端返回了新值时）
      if (updated.value != null && updated.value !== '') {
        values[updated.name] = updated.value
      }
    }
    // 更新快照
    prevValues = { ...values }
  } catch (e) {
    ElMessage.error((e as Error)?.message || '参数刷新失败')
  } finally {
    refreshing.value = false
  }
}

// ==================== 前端校验 ====================
/**
 * 统一校验：先走 el-form rules（required），再补充 regex 校验。
 */
async function validate(): Promise<boolean> {
  // el-form rules 校验（required 即时反馈）
  if (formRef.value) {
    const valid = await formRef.value.validate().catch(() => false)
    if (!valid) return false
  }
  // 补充 regex 校验（rules 中未覆盖）
  for (const p of params.value) {
    if (p.hidden) continue
    const val = values[p.name]
    if (val && p.regexPattern) {
      try {
        const regex = new RegExp(p.regexPattern)
        if (!regex.test(val)) {
          ElMessage.error(`参数[${p.label}]格式不正确`)
          return false
        }
      } catch {
        // 正则本身不合法时跳过校验
      }
    }
  }
  return true
}

// ==================== 提交执行 ====================
async function submit() {
  if (!(await validate())) return
  submitting.value = true
  try {
    const res = await executePipeline({
      pipelineId: props.pipelineId,
      parameters: { ...values },
    })
    ElMessage.success(`执行成功，工作流：${res.workflowName}`)
    visible.value = false
    emit('success', res.workflowName)
  } catch (e) {
    ElMessage.error((e as Error)?.message || '执行失败')
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <el-dialog
    v-model="visible"
    title="执行流水线"
    width="780px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-form
      v-loading="loading"
      ref="formRef"
      :model="values"
      label-width="160px"
      class="exec-dialog-form"
    >
      <el-empty
        v-if="!loading && params.length === 0"
        description="该流水线无运行参数"
        :image-size="60"
      />

      <!-- 按 paramGroup 分组展示 -->
      <template v-for="({ group, list }) in groupedParams" :key="group">
        <div class="param-group-title">{{ group }}</div>
        <el-form-item
          v-for="p in list"
          :key="p.name"
          :prop="p.name"
          :rules="p.required ? [{ required: true, message: `${p.label}不能为空`, trigger: 'change' }] : []"
        >
          <template #label>
            <el-tooltip
              v-if="p.description"
              :content="p.description"
              placement="top"
            >
              <span class="param-label">
                {{ p.label }}
                <el-icon class="param-label__icon"><InfoFilled /></el-icon>
              </span>
            </el-tooltip>
            <span v-else>{{ p.label }}</span>
          </template>

          <!-- input -->
          <el-input
            v-if="!p.componentType || p.componentType === 'input'"
            v-model="values[p.name]"
            :placeholder="`请输入${p.label}`"
          />

          <!-- disabled-input -->
          <el-input
            v-else-if="p.componentType === 'disabled-input' || p.componentType === 'disabledInput'"
            v-model="values[p.name]"
            disabled
          />

          <!-- select -->
          <el-select
            v-else-if="p.componentType === 'select'"
            v-model="values[p.name]"
            :placeholder="`请选择${p.label}`"
            clearable
            style="width: 100%"
          >
            <el-option
              v-for="opt in visibleOptions(p)"
              :key="opt.value"
              :label="opt.label ?? opt.value"
              :value="opt.value"
            />
          </el-select>

          <!-- radio -->
          <el-radio-group
            v-else-if="p.componentType === 'radio' || p.componentType === 'radio-button-group'"
            v-model="values[p.name]"
          >
            <el-radio
              v-for="opt in visibleOptions(p)"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label ?? opt.value }}
            </el-radio>
          </el-radio-group>

          <!-- git-tree（首期简化为 input） -->
          <el-input
            v-else-if="p.componentType === 'git-tree' || p.componentType === 'gitlab-tree'"
            v-model="values[p.name]"
            :placeholder="`请输入${p.label}路径`"
          />

          <!-- hidden 不渲染 -->
          <template v-else-if="p.componentType === 'hidden'" />

          <!-- 默认：input -->
          <el-input
            v-else
            v-model="values[p.name]"
            :placeholder="`请输入${p.label}`"
          />
        </el-form-item>
      </template>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="submit">执行</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.exec-dialog-form {
  min-height: 80px;
}

.param-group-title {
  margin: 12px 0 8px;
  padding-left: 8px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  border-left: 3px solid var(--el-color-primary);
}

.param-group-title:first-child {
  margin-top: 0;
}

.param-label {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  cursor: help;
}

.param-label__icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
}
</style>
