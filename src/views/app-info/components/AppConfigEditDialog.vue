<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  updateAppParameterConfig,
  listConfigurableParameters,
  type AppParameterConfig,
  type AppParameterOption,
} from '@/api/appParameterConfig'
import GitTreeSelect from '@/components/common/GitTreeSelect.vue'

interface Props {
  modelValue: boolean
  row: AppParameterConfig | null
  appName?: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val),
})

const value = ref('')
const submitting = ref(false)
const options = ref<AppParameterOption[]>([])

/** 查找当前参数定义 */
function findOption(): AppParameterOption | undefined {
  if (!props.row) return undefined
  return options.value.find((o) => o.name === props.row!.parameterName)
}

/** 解析 optionConfig JSON */
function parseOptions(optionConfig?: string): { value: string; label?: string }[] {
  if (!optionConfig) return []
  try {
    const arr = JSON.parse(optionConfig)
    if (!Array.isArray(arr)) return []
    return arr.map((item: any) => ({
      value: item.value,
      label: item.label ?? item.value,
    }))
  } catch {
    return []
  }
}

/** 加载参数定义列表 */
async function loadOptions() {
  if (options.value.length > 0) return
  try {
    options.value = await listConfigurableParameters()
  } catch {
    // 忽略
  }
}

async function handleSubmit() {
  if (!props.row) return
  if (!value.value) {
    ElMessage.warning('参数值不能为空')
    return
  }
  submitting.value = true
  try {
    await updateAppParameterConfig({ id: props.row.id!, value: value.value })
    ElMessage.success('修改成功')
    visible.value = false
    emit('success')
  } catch (e) {
    ElMessage.error((e as Error)?.message || '修改失败')
  } finally {
    submitting.value = false
  }
}

watch(visible, (val) => {
  if (val) {
    value.value = props.row?.value ?? ''
    loadOptions()
  }
})
</script>

<template>
  <el-dialog
    v-model="visible"
    title="编辑参数配置"
    width="600px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <el-form label-width="120px">
      <el-form-item label="参数名">
        <span>{{ row?.label || row?.parameterName }}</span>
      </el-form-item>
      <el-form-item label="参数值">
        <!-- input -->
        <el-input
          v-if="!findOption() || findOption()?.componentType === 'input'"
          v-model="value"
          placeholder="请输入参数值"
        />

        <!-- select / radio 都用下拉 -->
        <el-select
          v-else-if="
            findOption()?.componentType === 'select' ||
            findOption()?.componentType === 'radio'
          "
          v-model="value"
          clearable
          filterable
          placeholder="请选择参数值"
          style="width: 100%"
        >
          <el-option
            v-for="opt in parseOptions(findOption()?.optionConfig)"
            :key="opt.value"
            :label="opt.label ?? opt.value"
            :value="opt.value"
          />
        </el-select>

        <!-- git-tree -->
        <GitTreeSelect
          v-else-if="
            findOption()?.componentType === 'git-tree' ||
            findOption()?.componentType === 'gitlab-tree'
          "
          v-model="value"
          :app-name="appName || row?.appName || ''"
          placeholder="请选择目录"
        />

        <!-- 默认 input -->
        <el-input v-else v-model="value" placeholder="请输入参数值" />
      </el-form-item>
    </el-form>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>
