<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Delete, Edit } from '@element-plus/icons-vue'
import {
  pageDictData,
  createDictData,
  updateDictData,
  deleteDictData,
  type DictData,
  type DictDataQuery,
} from '@/api/dict'
import { formatDateTime } from '@/utils/time'

/** 路由参数注入：当前所属字典类型编码（/dict/data/:dictType） */
const props = defineProps<{ dictType: string }>()

const loading = ref(false)
const list = ref<DictData[]>([])
const total = ref(0)

const query = reactive<DictDataQuery>({
  dictType: props.dictType,
  dictKey: '',
  dictValue: '',
  sortField: 'id',
  sortOrder: 'asc',
  pageNum: 1,
  pageSize: 10,
})

/** 分页查询当前字典类型下的数据 */
async function fetchData() {
  loading.value = true
  try {
    query.dictType = props.dictType
    const res = await pageDictData(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '字典数据列表获取失败')
    list.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  query.pageNum = 1
  fetchData()
}

function handlePageChange() {
  fetchData()
}

function handleSizeChange() {
  query.pageNum = 1
  fetchData()
}

/** 服务端排序：el-table 的 ascending/descending 转为后端 asc/desc */
function handleSortChange({
  prop,
  order,
}: {
  prop?: string | null
  order?: 'ascending' | 'descending' | null
}) {
  if (prop && order) {
    query.sortField = prop
    query.sortOrder = order === 'ascending' ? 'asc' : 'desc'
  } else {
    query.sortField = undefined
    query.sortOrder = undefined
  }
  query.pageNum = 1
  fetchData()
}

// ============ 新增 / 编辑 ============

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive<DictData>({
  id: undefined,
  dictType: props.dictType,
  dictKey: '',
  dictValue: '',
  dictSort: 0,
  remark: '',
  enabled: true,
})

const rules: FormRules<DictData> = {
  dictType: [{ required: true, message: '请输入字典类型', trigger: 'blur' }],
  dictKey: [{ required: true, message: '请输入字典编码', trigger: 'blur' }],
  dictValue: [{ required: true, message: '请输入字典值', trigger: 'blur' }],
}

function resetForm() {
  form.id = undefined
  form.dictType = props.dictType
  form.dictKey = ''
  form.dictValue = ''
  form.dictSort = 0
  form.remark = ''
  form.enabled = true
}

function openCreate() {
  resetForm()
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: DictData) {
  resetForm()
  Object.assign(form, row)
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

async function submitForm(keepOpen = false) {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (dialogMode.value === 'create') {
      await createDictData({ ...form })
      ElMessage.success('新增成功')
    } else {
      await updateDictData({ ...form })
      ElMessage.success('修改成功')
    }
    if (keepOpen && dialogMode.value === 'create') {
      // 保存并继续：清空表单留在弹框内，继续录入下一条
      resetForm()
      formRef.value?.clearValidate()
    } else {
      dialogVisible.value = false
      fetchData()
    }
  } catch (e) {
    ElMessage.error((e as Error)?.message || '保存失败')
  } finally {
    submitting.value = false
  }
}

// ============ 删除 ============

async function handleDelete(row: DictData) {
  try {
    await ElMessageBox.confirm(`确定要删除字典数据「${row.dictValue}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return // 用户取消
  }
  try {
    await deleteDictData(row.id!)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '删除失败')
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="dict-data-list">
    <div class="list-header">
      <div class="header-left">
        <el-breadcrumb separator="/">
          <el-breadcrumb-item :to="{ path: '/dict/type' }">字典配置</el-breadcrumb-item>
          <el-breadcrumb-item>字典数据</el-breadcrumb-item>
        </el-breadcrumb>
        <h3 class="title">
          字典数据
          <el-tag size="small" type="info" class="type-tag">{{ props.dictType }}</el-tag>
        </h3>
      </div>
    </div>

    <div class="search-bar">
      <el-input
        v-model="query.dictKey"
        placeholder="字典编码"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-input
        v-model="query.dictValue"
        placeholder="字典值"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button type="primary" :icon="Plus" class="create-btn" @click="openCreate">新增</el-button>
    </div>

    <el-table
      v-loading="loading"
      :data="list"
      border
      stripe
      :default-sort="{ prop: 'id', order: 'ascending' }"
      style="width: 100%"
      empty-text="暂无字典数据"
      @sort-change="handleSortChange"
    >
      <el-table-column label="ID" prop="id" width="80" sortable="custom" />
      <el-table-column label="字典类型" prop="dictType" min-width="140" sortable="custom" />
      <el-table-column label="字典编码" prop="dictKey" min-width="120" sortable="custom" />
      <el-table-column label="字典值" prop="dictValue" min-width="120" sortable="custom" />
      <el-table-column
        label="备注"
        prop="remark"
        min-width="140"
        show-overflow-tooltip
        sortable="custom"
      />
      <el-table-column label="是否生效" prop="enabled" width="100" sortable="custom">
        <template #default="{ row }">
          <el-tag v-if="row.enabled" type="success" size="small">启用</el-tag>
          <el-tag v-else type="info" size="small">停用</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="排序值" prop="dictSort" width="90" sortable="custom" />
      <el-table-column label="创建时间" prop="createTime" min-width="170" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" prop="updateTime" min-width="170" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="160" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Edit" @click="openEdit(row)">编辑</el-button>
          <el-button link type="danger" :icon="Delete" @click="handleDelete(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination">
      <el-pagination
        v-model:current-page="query.pageNum"
        v-model:page-size="query.pageSize"
        :total="total"
        :page-sizes="[10, 20, 50, 100]"
        layout="total, sizes, prev, pager, next, jumper"
        background
        @current-change="handlePageChange"
        @size-change="handleSizeChange"
      />
    </div>

    <!-- 新增 / 编辑弹框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="dialogMode === 'create' ? '新增字典数据' : '编辑字典数据'"
      width="500px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="字典类型" prop="dictType">
          <el-input v-model="form.dictType" />
        </el-form-item>
        <el-form-item label="字典编码" prop="dictKey">
          <el-input v-model="form.dictKey" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="字典值" prop="dictValue">
          <el-input v-model="form.dictValue" maxlength="128" show-word-limit />
        </el-form-item>
        <el-form-item label="排序值" prop="dictSort">
          <el-input-number v-model="form.dictSort" :min="0" controls-position="right" />
        </el-form-item>
        <el-form-item label="是否生效" prop="enabled">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="form.remark" type="textarea" :rows="3" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm(false)">保存</el-button>
        <el-button v-if="dialogMode === 'create'" type="success" :loading="submitting" @click="submitForm(true)">
          保存并继续
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.dict-data-list {
  padding: 16px 20px;
}

.list-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 16px;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-tag {
  font-weight: normal;
}

.actions {
  display: flex;
  gap: 8px;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.search-input {
  width: 200px;
}

.create-btn {
  margin-left: auto;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}
</style>
