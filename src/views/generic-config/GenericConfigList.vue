<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Delete, Edit, View } from '@element-plus/icons-vue'
import {
  listGenericConfig,
  createGenericConfig,
  updateGenericConfig,
  deleteGenericConfig,
  historyByConfigId,
  type GenericConfig,
  type GenericConfigHistory,
} from '@/api/genericConfig'
import { formatDateTime } from '@/utils/time'

const loading = ref(false)
const list = ref<GenericConfig[]>([])
const searchKey = ref('')

/** 查询全部配置 */
async function fetchData() {
  loading.value = true
  try {
    list.value = await listGenericConfig(searchKey.value)
  } catch (e) {
    ElMessage.error((e as Error)?.message || '配置列表获取失败')
    list.value = []
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  fetchData()
}

// ============ 新增 / 编辑 ============

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: undefined as number | undefined,
  configKey: '',
  configValue: '' as string | object,
  valueFormat: 'txt',
  description: '',
})

const rules: FormRules = {
  configKey: [{ required: true, message: '请输入配置键', trigger: 'blur' }],
  configValue: [{ required: true, message: '请输入配置值', trigger: 'blur' }],
  valueFormat: [{ required: true, message: '请选择值格式', trigger: 'change' }],
}

function resetForm() {
  form.id = undefined
  form.configKey = ''
  form.configValue = ''
  form.valueFormat = 'txt'
  form.description = ''
}

function openCreate() {
  resetForm()
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: GenericConfig) {
  resetForm()
  form.id = row.id
  form.configKey = row.configKey
  form.valueFormat = row.valueFormat
  form.description = row.description || ''
  // JSON 格式时将对象序列化为格式化字符串，便于编辑器展示和修改
  if (row.valueFormat === 'json' && row.configValue !== null && row.configValue !== undefined) {
    form.configValue = typeof row.configValue === 'string'
      ? row.configValue
      : JSON.stringify(row.configValue, null, 2)
  } else {
    form.configValue = row.configValue as string
  }
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

/** 将表单中的 configValue 转为提交格式 */
function buildSubmitValue(): unknown {
  if (form.valueFormat === 'json') {
    // json 格式：如果输入的是字符串，尝试解析为对象
    if (typeof form.configValue === 'string' && form.configValue.trim()) {
      try {
        return JSON.parse(form.configValue)
      } catch {
        throw new Error('配置值不是合法的 JSON')
      }
    }
    return form.configValue
  }
  // txt 格式：统一转字符串
  return typeof form.configValue === 'string' ? form.configValue : JSON.stringify(form.configValue)
}

async function submitForm() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const submitValue = buildSubmitValue()
    if (dialogMode.value === 'create') {
      await createGenericConfig({
        configKey: form.configKey,
        configValue: submitValue,
        valueFormat: form.valueFormat,
        description: form.description,
      })
      ElMessage.success('新建成功')
    } else {
      await updateGenericConfig({
        id: form.id!,
        configValue: submitValue,
        valueFormat: form.valueFormat,
        description: form.description,
      })
      ElMessage.success('修改成功')
    }
    dialogVisible.value = false
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

// ============ 删除 ============

async function handleDelete(row: GenericConfig) {
  try {
    await ElMessageBox.confirm(`确定要删除配置「${row.configKey}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deleteGenericConfig(row.id!)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '删除失败')
  }
}

// ============ 查看单条变更历史 ============

const historyDialogVisible = ref(false)
const historyList = ref<GenericConfigHistory[]>([])
const historyLoading = ref(false)
const historyConfigKey = ref('')

const actionTagType: Record<string, '' | 'success' | 'warning' | 'danger' | 'info'> = {
  CREATE: 'success',
  UPDATE: '',
  DELETE: 'danger',
}

const actionLabel: Record<string, string> = {
  CREATE: '新建',
  UPDATE: '修改',
  DELETE: '删除',
}

async function viewHistory(row: GenericConfig) {
  historyConfigKey.value = row.configKey
  historyDialogVisible.value = true
  historyLoading.value = true
  try {
    historyList.value = await historyByConfigId(row.id!)
  } catch (e) {
    ElMessage.error((e as Error)?.message || '变更历史获取失败')
    historyList.value = []
  } finally {
    historyLoading.value = false
  }
}

/** 格式化值用于展示（截断长文本） */
function formatValue(val: unknown): string {
  if (val === null || val === undefined) return '-'
  if (typeof val === 'object') return JSON.stringify(val)
  return String(val)
}

onMounted(fetchData)
</script>

<template>
  <div class="config-list-tab">
    <div class="search-bar">
      <el-input
        v-model="searchKey"
        placeholder="配置键"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button type="primary" :icon="Plus" class="create-btn" @click="openCreate">新建</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      style="width: 100%"
      empty-text="暂无配置"
    >
      <el-table-column label="ID" prop="id" width="70" />
      <el-table-column label="配置键" prop="configKey" min-width="180" show-overflow-tooltip />
      <el-table-column label="值格式" prop="valueFormat" width="90">
        <template #default="{ row }">
          <el-tag :type="row.valueFormat === 'json' ? 'warning' : 'info'" size="small">
            {{ row.valueFormat }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="配置值" min-width="200" show-overflow-tooltip>
        <template #default="{ row }">{{ formatValue(row.configValue) }}</template>
      </el-table-column>
      <el-table-column label="备注" prop="description" min-width="150" show-overflow-tooltip />
      <el-table-column label="创建人" prop="creator" width="110" />
      <el-table-column label="创建时间" prop="createTime" width="170">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="修改人" prop="updater" width="110" />
      <el-table-column label="修改时间" prop="updateTime" width="170">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="View" @click="viewHistory(row)">历史</el-button>
          <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 新增 / 编辑弹框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新建配置' : '编辑配置'"
      width="600px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="配置键" prop="configKey">
          <el-input
            v-model="form.configKey"
            maxlength="200"
            show-word-limit
            :disabled="dialogMode === 'edit'"
            placeholder="全局唯一，编辑时不可修改"
          />
        </el-form-item>
        <el-form-item label="值格式" prop="valueFormat">
          <el-select v-model="form.valueFormat" placeholder="请选择">
            <el-option label="纯文本 (txt)" value="txt" />
            <el-option label="JSON (json)" value="json" />
          </el-select>
        </el-form-item>
        <el-form-item label="配置值" prop="configValue">
          <el-input
            v-if="form.valueFormat === 'txt'"
            v-model="form.configValue as string"
            type="textarea"
            :rows="5"
            placeholder="请输入配置值"
          />
          <el-input
            v-else
            v-model="form.configValue as string"
            type="textarea"
            :rows="8"
            placeholder='请输入 JSON，如 {"key": "value"}'
          />
        </el-form-item>
        <el-form-item label="备注" prop="description">
          <el-input
            v-model="form.description"
            type="textarea"
            :rows="2"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>

    <!-- 单条变更历史弹框 -->
    <el-dialog
      v-model="historyDialogVisible"
      :title="`变更历史 - ${historyConfigKey}`"
      width="850px"
      destroy-on-close
    >
      <el-table
        v-loading="historyLoading"
        :data="historyList"
        border
        stripe
        max-height="500"
        style="width: 100%"
        empty-text="暂无变更历史"
      >
        <el-table-column label="操作类型" prop="action" width="90">
          <template #default="{ row }">
            <el-tag :type="actionTagType[row.action] || 'info'" size="small">
              {{ actionLabel[row.action] || row.action }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="变更前值" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ formatValue(row.oldValue) }}</template>
        </el-table-column>
        <el-table-column label="变更后值" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">{{ formatValue(row.newValue) }}</template>
        </el-table-column>
        <el-table-column label="变更摘要" prop="changeSummary" min-width="180" show-overflow-tooltip />
        <el-table-column label="操作人" prop="operator" width="110" />
        <el-table-column label="操作时间" prop="operateTime" width="170">
          <template #default="{ row }">{{ formatDateTime(row.operateTime) }}</template>
        </el-table-column>
      </el-table>
    </el-dialog>
  </div>
</template>

<style scoped>
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input {
  width: 240px;
}

.create-btn {
  margin-left: auto;
}
</style>
