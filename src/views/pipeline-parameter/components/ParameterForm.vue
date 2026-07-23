<script setup lang="ts">
import { ref, reactive, onMounted, watch } from 'vue'
import { type FormInstance, type FormRules } from 'element-plus'
import {
  paramTypeEnums,
  componentTypeEnums,
  type EnumOption,
  type PipelineParameterCreate,
} from '@/api/pipelineParameter'
import { listDictData, type DictData } from '@/api/dict'
import DependParamsEditor from './DependParamsEditor.vue'
import OptionConfigEditor from './OptionConfigEditor.vue'
import StrategyConfigEditor from './StrategyConfigEditor.vue'

const props = defineProps<{
  /** 初始数据 */
  modelData?: PipelineParameterCreate & { id?: number }
  /** 是否只读 */
  readonly?: boolean
  /** 预填参数名（从外部跳转携带，仅新建时生效） */
  presetName?: string
}>()

const emit = defineEmits<{
  submit: [data: PipelineParameterCreate & { id?: number }]
}>()

const formRef = ref<FormInstance>()

const paramTypes = ref<EnumOption[]>([])
const componentTypes = ref<EnumOption[]>([])
const groupOptions = ref<DictData[]>([])

onMounted(async () => {
  try {
    const [pt, ct] = await Promise.all([paramTypeEnums(), componentTypeEnums()])
    paramTypes.value = pt
    componentTypes.value = ct
  } catch {
    // 降级硬编码
    paramTypes.value = [
      { code: 'system', description: '系统参数' },
      { code: 'user', description: '用户参数' },
    ]
    componentTypes.value = [
      { code: 'input', description: '输入框' },
      { code: 'select', description: '下拉框' },
      { code: 'radio', description: '单选框组' },
      { code: 'radio-button-group', description: '按钮单选组' },
      { code: 'git-tree', description: 'Git目录树' },
      { code: 'disabled-input', description: '只读输入框' },
      { code: 'hidden', description: '隐藏' },
    ]
  }
  try {
    groupOptions.value = await listDictData('pipeline-parameter-group')
  } catch {
    groupOptions.value = []
  }
})

function emptyForm(): PipelineParameterCreate {
  return {
    name: '',
    label: '',
    description: '',
    componentType: 'input',
    paramType: 'user',
    required: false,
    defaultValue: '',
    needSystemProcess: false,
    regexPattern: '',
    dependParams: '',
    refreshOnChanged: false,
    paramGroup: '',
    paramGroupSort: 0,
    optionConfig: '',
    defaultValueStrategyConfig: '',
  }
}

const form = reactive<PipelineParameterCreate & { id?: number }>(emptyForm())

watch(
  () => props.modelData,
  (val) => {
    if (val) {
      Object.assign(form, emptyForm(), val)
    } else {
      Object.assign(form, emptyForm())
      // 预填参数名（从外部跳转携带，仅新建时生效）
      if (props.presetName) {
        form.name = props.presetName
      }
    }
  },
  { immediate: true },
)

const rules: FormRules<typeof form> = {
  name: [
    { required: true, message: '参数名不能为空', trigger: 'blur' },
    { pattern: /^[a-z][a-z0-9-]*$/, message: '需符合 ^[a-z][a-z0-9-]*$ 格式', trigger: 'blur' },
  ],
  label: [{ required: true, message: '参数中文名称不能为空', trigger: 'blur' }],
  paramType: [{ required: true, message: '请选择参数类型', trigger: 'change' }],
  paramGroup: [{ required: true, message: '参数所属组别不能为空', trigger: 'change' }],
}

async function doSubmit() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  emit('submit', { ...form })
}

defineExpose({ doSubmit, formRef })
</script>

<template>
  <el-form
    ref="formRef"
    :model="form"
    :rules="readonly ? {} : rules"
    label-width="140px"
    :disabled="readonly"
    class="param-form"
  >
    <!-- 参数名 -->
    <el-form-item label="参数名" prop="name">
      <el-input v-model="form.name" maxlength="100" placeholder="如 app-name" />
    </el-form-item>

    <!-- 中文名称 -->
    <el-form-item label="中文名称" prop="label">
      <el-input v-model="form.label" maxlength="100" placeholder="如 应用名称" />
    </el-form-item>

    <!-- 描述 -->
    <el-form-item label="描述" prop="description">
      <el-input
        v-model="form.description"
        type="textarea"
        :rows="2"
        maxlength="500"
        show-word-limit
        placeholder="参数详细描述，用于前端表单 tooltip 展示"
      />
    </el-form-item>

    <!-- 参数类型 -->
    <el-form-item prop="paramType">
      <template #label>
        <el-tooltip content="系统参数：用户不可见，系统自动填充（如 app-name）；用户参数：用户可见，需填写或选择" placement="top">
          <span>参数类型 <el-icon class="label-icon"><InfoFilled /></el-icon></span>
        </el-tooltip>
      </template>
      <el-select v-model="form.paramType" placeholder="请选择" style="width: 100%">
        <el-option
          v-for="opt in paramTypes"
          :key="opt.code"
          :label="`${opt.description}(${opt.code})`"
          :value="opt.code"
        />
      </el-select>
    </el-form-item>

    <!-- 组件类型 -->
    <el-form-item label="组件类型" prop="componentType">
      <el-select v-model="form.componentType" placeholder="请选择" clearable style="width: 100%">
        <el-option
          v-for="opt in componentTypes"
          :key="opt.code"
          :label="`${opt.description}(${opt.code})`"
          :value="opt.code"
        />
      </el-select>
    </el-form-item>

    <!-- 参数组别 -->
    <el-form-item label="参数组别" prop="paramGroup">
      <el-select v-model="form.paramGroup" placeholder="请选择组别" filterable style="width: 100%">
        <el-option
          v-for="g in groupOptions"
          :key="g.dictValue"
          :label="`${g.dictKey}(${g.dictValue})`"
          :value="g.dictValue"
        />
      </el-select>
    </el-form-item>

    <!-- 组内排序 -->
    <el-form-item label="组内排序" prop="paramGroupSort">
      <el-input-number v-model="form.paramGroupSort" :min="0" :max="9999" controls-position="right" />
    </el-form-item>

    <!-- 默认值 -->
    <el-form-item label="默认值" prop="defaultValue">
      <el-input v-model="form.defaultValue" maxlength="200" placeholder="所有策略未命中时的兜底值" />
    </el-form-item>

    <!-- 正则校验 -->
    <el-form-item label="正则校验" prop="regexPattern">
      <el-input v-model="form.regexPattern" maxlength="100" placeholder="如 ^[a-z]+$" />
    </el-form-item>

    <!-- 是否必填 -->
    <el-form-item label="是否必填" prop="required">
      <el-switch v-model="form.required" />
    </el-form-item>

    <!-- 系统处理 -->
    <el-form-item prop="needSystemProcess">
      <template #label>
        <el-tooltip content="用户/外部传入的参数值需要经过系统额外处理（如值映射转换 value→realValue）" placement="top">
          <span>系统处理 <el-icon class="label-icon"><InfoFilled /></el-icon></span>
        </el-tooltip>
      </template>
      <el-switch v-model="form.needSystemProcess" />
    </el-form-item>

    <!-- 变动刷新 -->
    <el-form-item prop="refreshOnChanged">
      <template #label>
        <el-tooltip content="本参数变更之后，依赖本参数的其它参数需要重新计算" placement="top">
          <span>变动刷新 <el-icon class="label-icon"><InfoFilled /></el-icon></span>
        </el-tooltip>
      </template>
      <el-switch v-model="form.refreshOnChanged" />
    </el-form-item>

    <!-- 依赖参数 -->
    <el-form-item label="依赖参数" prop="dependParams">
      <DependParamsEditor :model-value="form.dependParams ?? ''" :exclude-name="form.name" @update:model-value="form.dependParams = $event" />
    </el-form-item>

    <!-- 选项配置 -->
    <el-form-item label="选项配置" prop="optionConfig">
      <OptionConfigEditor :model-value="form.optionConfig ?? ''" @update:model-value="form.optionConfig = $event" />
    </el-form-item>

    <!-- 默认值策略 -->
    <el-form-item label="默认值策略" prop="defaultValueStrategyConfig">
      <StrategyConfigEditor :model-value="form.defaultValueStrategyConfig ?? ''" @update:model-value="form.defaultValueStrategyConfig = $event" />
    </el-form-item>
  </el-form>
</template>

<style scoped>
.param-form {
  max-width: 800px;
}
.label-icon {
  font-size: 14px;
  color: var(--el-text-color-secondary);
  cursor: help;
  vertical-align: middle;
}
</style>
