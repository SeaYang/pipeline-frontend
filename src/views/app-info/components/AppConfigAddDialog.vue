<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Delete } from '@element-plus/icons-vue'
import {
  batchCreateAppParameterConfig,
  listConfigurableParameters,
  type AppParameterOption,
} from '@/api/appParameterConfig'
import GitTreeSelect from '@/components/common/GitTreeSelect.vue'

interface Props {
  modelValue: boolean
  appName: string
  env: string
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

// ==================== 参数选项 ====================
const options = ref<AppParameterOption[]>([])
const loading = ref(false)

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

/** 加载可配置参数列表 */
async function loadOptions() {
  if (options.value.length > 0) return
  loading.value = true
  try {
    options.value = await listConfigurableParameters()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '参数列表获取失败')
  } finally {
    loading.value = false
  }
}

// ==================== 批量新增行 ====================
interface ConfigRow {
  parameterName: string
  value: string
}

const rows = ref<ConfigRow[]>([{ parameterName: '', value: '' }])
const submitting = ref(false)

/** 添加一行 */
function addRow() {
  rows.value.push({ parameterName: '', value: '' })
}

/** 删除一行 */
function removeRow(index: number) {
  if (rows.value.length <= 1) {
    ElMessage.warning('至少保留一行')
    return
  }
  rows.value.splice(index, 1)
}

/** 根据参数名查找参数定义 */
function findOption(name: string): AppParameterOption | undefined {
  return options.value.find((o) => o.name === name)
}

/** 参数名变更时清空值 */
function handleParamChange(row: ConfigRow) {
  row.value = ''
}

// ==================== 提交 ====================
async function handleSubmit() {
  // 校验
  for (let i = 0; i < rows.value.length; i++) {
    const row = rows.value[i]
    if (!row.parameterName) {
      ElMessage.warning(`第 ${i + 1} 行参数名不能为空`)
      return
    }
    if (!row.value) {
      ElMessage.warning(`第 ${i + 1} 行参数值不能为空`)
      return
    }
  }

  // 校验批次内无重复
  const names = rows.value.map((r) => r.parameterName)
  const dup = names.find((n, i) => names.indexOf(n) !== i)
  if (dup) {
    ElMessage.warning(`参数名「${dup}」重复`)
    return
  }

  submitting.value = true
  try {
    await batchCreateAppParameterConfig({
      appName: props.appName,
      env: props.env,
      items: rows.value.map((r) => ({ parameterName: r.parameterName, value: r.value })),
    })
    ElMessage.success('新增成功')
    visible.value = false
    emit('success')
  } catch (e) {
    ElMessage.error((e as Error)?.message || '新增失败')
  } finally {
    submitting.value = false
  }
}

// ==================== 弹框打开/关闭 ====================
watch(visible, (val) => {
  if (val) {
    rows.value = [{ parameterName: '', value: '' }]
    loadOptions()
  }
})
</script>

<template>
  <el-dialog
    v-model="visible"
    title="新增参数配置"
    width="800px"
    destroy-on-close
    :close-on-click-modal="false"
  >
    <div v-loading="loading">
      <div
        v-for="(row, index) in rows"
        :key="index"
        class="config-row"
      >
        <!-- 参数名下拉（支持模糊搜索，展示 name(label) 格式） -->
        <el-select
          v-model="row.parameterName"
          filterable
          clearable
          placeholder="选择参数"
          class="param-select"
          @change="handleParamChange(row)"
        >
          <el-option
            v-for="opt in options"
            :key="opt.name"
            :label="`${opt.name}(${opt.label})`"
            :value="opt.name"
          />
        </el-select>

        <!-- 参数值动态组件 -->
        <div class="value-wrapper">
          <!-- input -->
          <el-input
            v-if="!row.parameterName || findOption(row.parameterName)?.componentType === 'input'"
            v-model="row.value"
            placeholder="请输入参数值"
          />

          <!-- select / radio 都用下拉 -->
          <el-select
            v-else-if="
              findOption(row.parameterName)?.componentType === 'select' ||
              findOption(row.parameterName)?.componentType === 'radio'
            "
            v-model="row.value"
            clearable
            filterable
            placeholder="请选择参数值"
            style="width: 100%"
          >
            <el-option
              v-for="opt in parseOptions(findOption(row.parameterName)?.optionConfig)"
              :key="opt.value"
              :label="opt.label ?? opt.value"
              :value="opt.value"
            />
          </el-select>

          <!-- git-tree -->
          <GitTreeSelect
            v-else-if="
              findOption(row.parameterName)?.componentType === 'git-tree' ||
              findOption(row.parameterName)?.componentType === 'gitlab-tree'
            "
            v-model="row.value"
            :app-name="appName"
            placeholder="请选择目录"
          />

          <!-- 默认 input -->
          <el-input v-else v-model="row.value" placeholder="请输入参数值" />
        </div>

        <!-- 删除行 -->
        <el-button
          type="danger"
          circle
          size="small"
          @click="removeRow(index)"
        >
          <el-icon><Delete /></el-icon>
        </el-button>
      </div>

      <!-- 添加行按钮 -->
      <el-button type="primary" plain style="margin-top: 12px" @click="addRow">
        + 添加一行
      </el-button>
    </div>

    <template #footer>
      <el-button @click="visible = false">取消</el-button>
      <el-button type="primary" :loading="submitting" @click="handleSubmit">确定</el-button>
    </template>
  </el-dialog>
</template>

<style scoped>
.config-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.param-select {
  flex: 1;
}

.value-wrapper {
  flex: 1;
}
</style>
