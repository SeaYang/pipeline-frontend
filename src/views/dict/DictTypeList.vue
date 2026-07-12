<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Delete, Edit } from '@element-plus/icons-vue'
import { useRouter } from 'vue-router'
import {
  pageDictType,
  createDictType,
  updateDictType,
  deleteDictType,
  type DictType,
  type DictTypeQuery,
} from '@/api/dict'
import { formatDateTime } from '@/utils/time'

const router = useRouter()

const loading = ref(false)
const list = ref<DictType[]>([])
const total = ref(0)

const query = reactive<DictTypeQuery>({
  dictType: '',
  dictName: '',
  sortField: 'id',
  sortOrder: 'asc',
  pageNum: 1,
  pageSize: 10,
})

/** 分页查询字典类型 */
async function fetchData() {
  loading.value = true
  try {
    const res = await pageDictType(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '字典类型列表获取失败')
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

const form = reactive<DictType>({
  id: undefined,
  dictType: '',
  dictName: '',
  remark: '',
})

const rules: FormRules<DictType> = {
  dictType: [{ required: true, message: '请输入字典类型', trigger: 'blur' }],
  dictName: [{ required: true, message: '请输入字典名称', trigger: 'blur' }],
}

function resetForm() {
  form.id = undefined
  form.dictType = ''
  form.dictName = ''
  form.remark = ''
}

function openCreate() {
  resetForm()
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: DictType) {
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
      await createDictType({ ...form })
      ElMessage.success('新增成功')
    } else {
      await updateDictType({ ...form })
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

async function handleDelete(row: DictType) {
  try {
    await ElMessageBox.confirm(`确定要删除字典类型「${row.dictName}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return // 用户取消
  }
  try {
    await deleteDictType(row.id!)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '删除失败')
  }
}

// ============ 进入该类型下的字典数据列表 ============

function goDictData(row: DictType) {
  router.push(`/dict/data/${encodeURIComponent(row.dictType)}`)
}

onMounted(fetchData)
</script>

<template>
  <div class="dict-type-list">
    <div class="list-header">
      <h3 class="title">字典类型</h3>
    </div>

    <div class="search-bar">
      <el-input
        v-model="query.dictType"
        placeholder="字典类型"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-input
        v-model="query.dictName"
        placeholder="字典名称"
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
      empty-text="暂无字典类型"
      @sort-change="handleSortChange"
    >
      <el-table-column label="ID" prop="id" width="80" sortable="custom" />
      <el-table-column label="字典类型" prop="dictType" min-width="160" sortable="custom" />
      <el-table-column label="字典名称" prop="dictName" min-width="140" sortable="custom" />
      <el-table-column
        label="备注"
        prop="remark"
        min-width="160"
        show-overflow-tooltip
        sortable="custom"
      />
      <el-table-column label="创建时间" prop="createTime" min-width="170" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.createTime) }}</template>
      </el-table-column>
      <el-table-column label="更新时间" prop="updateTime" min-width="170" sortable="custom">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="240" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" @click="goDictData(row)">字典数据</el-button>
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
      :title="dialogMode === 'create' ? '新增字典类型' : '编辑字典类型'"
      width="480px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="字典类型" prop="dictType">
          <el-input v-model="form.dictType" maxlength="64" show-word-limit />
        </el-form-item>
        <el-form-item label="字典名称" prop="dictName">
          <el-input v-model="form.dictName" maxlength="64" show-word-limit />
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
.dict-type-list {
  padding: 16px 20px;
}

.list-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
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
