<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Delete, Edit, VideoPlay, Tickets } from '@element-plus/icons-vue'
import {
  pageCronJob,
  createCronJob,
  updateCronJob,
  deleteCronJob,
  enableCronJob,
  disableCronJob,
  triggerCronJob,
  previewNextFireTime,
  misfirePolicyOptions,
  type CronJob,
  type CronJobQuery,
} from '@/api/cronJob'
import { formatDateTime } from '@/utils/time'

const router = useRouter()

// ==================== 列表数据 ====================
const loading = ref(false)
const list = ref<CronJob[]>([])
const total = ref(0)

const query = reactive<CronJobQuery>({
  name: '',
  enabled: undefined,
  pageNum: 1,
  pageSize: 10,
})

async function fetchData() {
  loading.value = true
  try {
    const res = await pageCronJob(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '定时任务列表获取失败')
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

onMounted(fetchData)

// ==================== 启用 / 停用 ====================

async function handleToggleEnabled(row: CronJob, value: boolean) {
  try {
    if (value) {
      await enableCronJob(row.id!)
      ElMessage.success('已启用')
    } else {
      await disableCronJob(row.id!)
      ElMessage.success('已停用')
    }
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '操作失败')
  }
}

// ==================== 手动触发 ====================

async function handleTrigger(row: CronJob) {
  try {
    await ElMessageBox.confirm(`确定要立即触发一次「${row.name}」吗？`, '触发确认', {
      type: 'warning',
      confirmButtonText: '触发',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    const logId = await triggerCronJob(row.id!)
    ElMessage.success(`已触发，执行日志ID: ${logId}`)
  } catch (e) {
    ElMessage.error((e as Error)?.message || '触发失败')
  }
}

// ==================== 查看执行日志 ====================

function goLog(row?: CronJob) {
  router.push({ path: '/cron-job/log', query: row ? { jobId: String(row.id), jobName: row.name } : {} })
}

// ==================== 新增 / 编辑 ====================

const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const formRef = ref<FormInstance>()
const previewLoading = ref(false)
const previewResult = ref('')

const form = reactive({
  id: undefined as number | undefined,
  name: '',
  beanName: '',
  methodName: '',
  methodParams: '',
  cronExpr: '',
  misfirePolicy: 'fire_now',
  concurrent: 0,
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入任务名称', trigger: 'blur' }],
  beanName: [{ required: true, message: '请输入Bean名称', trigger: 'blur' }],
  methodName: [{ required: true, message: '请输入方法名称', trigger: 'blur' }],
  cronExpr: [{ required: true, message: '请输入CRON表达式', trigger: 'blur' }],
}

function resetForm() {
  form.id = undefined
  form.name = ''
  form.beanName = ''
  form.methodName = ''
  form.methodParams = ''
  form.cronExpr = ''
  form.misfirePolicy = 'fire_now'
  form.concurrent = 0
  previewResult.value = ''
}

function openCreate() {
  resetForm()
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: CronJob) {
  resetForm()
  form.id = row.id
  form.name = row.name
  form.beanName = row.beanName
  form.methodName = row.methodName
  form.methodParams = row.methodParams || ''
  form.cronExpr = row.cronExpr
  form.misfirePolicy = row.misfirePolicy
  form.concurrent = row.concurrent
  dialogMode.value = 'edit'
  dialogVisible.value = true
}

async function handlePreview() {
  if (!form.cronExpr) {
    ElMessage.warning('请先输入CRON表达式')
    return
  }
  previewLoading.value = true
  try {
    const next = await previewNextFireTime(form.cronExpr)
    previewResult.value = next ? formatDateTime(next) : '无法计算下一次执行时间，请检查表达式'
  } catch (e) {
    previewResult.value = (e as Error)?.message || 'CRON表达式无效'
  } finally {
    previewLoading.value = false
  }
}

async function submitForm() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    const payload = {
      name: form.name,
      beanName: form.beanName,
      methodName: form.methodName,
      methodParams: form.methodParams || undefined,
      cronExpr: form.cronExpr,
      misfirePolicy: form.misfirePolicy,
      concurrent: form.concurrent,
    }
    if (dialogMode.value === 'create') {
      await createCronJob({ ...payload, enabled: 1 })
      ElMessage.success('新建成功')
    } else {
      await updateCronJob({ ...payload, id: form.id! })
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

// ==================== 删除 ====================

async function handleDelete(row: CronJob) {
  try {
    await ElMessageBox.confirm(`确定要删除定时任务「${row.name}」吗？`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await deleteCronJob(row.id!)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '删除失败')
  }
}

function misfirePolicyText(code: string): string {
  return misfirePolicyOptions.find((o) => o.value === code)?.label ?? code
}
</script>

<template>
  <div class="cron-job-list">
    <div class="list-header">
      <h3 class="title">定时任务管理</h3>
    </div>

    <div class="search-bar">
      <el-input
        v-model="query.name"
        placeholder="任务名称"
        clearable
        class="search-input"
        @keyup.enter="handleSearch"
        @clear="handleSearch"
      />
      <el-select
        v-model="query.enabled"
        placeholder="启用状态"
        clearable
        class="search-select"
        @change="handleSearch"
      >
        <el-option label="启用" :value="1" />
        <el-option label="停用" :value="0" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button :icon="Tickets" @click="goLog()">全部执行日志</el-button>
      <el-button type="primary" :icon="Plus" class="create-btn" @click="openCreate">新建</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe style="width: 100%" empty-text="暂无定时任务">
      <el-table-column label="ID" prop="id" width="70" />
      <el-table-column label="任务名称" prop="name" min-width="140" show-overflow-tooltip />
      <el-table-column label="Bean.方法" min-width="220" show-overflow-tooltip>
        <template #default="{ row }">{{ row.beanName }}.{{ row.methodName }}</template>
      </el-table-column>
      <el-table-column label="方法参数" prop="methodParams" min-width="150" show-overflow-tooltip>
        <template #default="{ row }">{{ row.methodParams || '-' }}</template>
      </el-table-column>
      <el-table-column label="CRON表达式" prop="cronExpr" width="150" show-overflow-tooltip />
      <el-table-column label="错过策略" width="100">
        <template #default="{ row }">{{ misfirePolicyText(row.misfirePolicy) }}</template>
      </el-table-column>
      <el-table-column label="允许并发" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="row.concurrent ? 'warning' : 'info'" size="small">
            {{ row.concurrent ? '是' : '否' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="启用" width="80" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.enabled === 1"
            @change="(val: boolean) => handleToggleEnabled(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="下次执行时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.nextFireTime) }}</template>
      </el-table-column>
      <el-table-column label="上次执行时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.lastFireTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="220" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="VideoPlay" @click="handleTrigger(row)">触发</el-button>
          <el-button link type="primary" :icon="Tickets" @click="goLog(row)">日志</el-button>
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
      :title="dialogMode === 'create' ? '新建定时任务' : '编辑定时任务'"
      width="640px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="任务名称" prop="name">
          <el-input v-model="form.name" maxlength="100" show-word-limit placeholder="请输入任务名称" />
        </el-form-item>
        <el-form-item label="Bean名称" prop="beanName">
          <el-input v-model="form.beanName" maxlength="200" placeholder="目标 Spring Bean 名称" />
        </el-form-item>
        <el-form-item label="方法名称" prop="methodName">
          <el-input v-model="form.methodName" maxlength="100" placeholder="目标方法名称" />
        </el-form-item>
        <el-form-item label="方法参数">
          <el-input
            v-model="form.methodParams"
            maxlength="500"
            placeholder='JSON数组字符串，如 ["daily", 500]，无参可不填'
          />
        </el-form-item>
        <el-form-item label="CRON表达式" prop="cronExpr">
          <div class="cron-input-row">
            <el-input v-model="form.cronExpr" placeholder="6位：秒 分 时 日 月 周，如 0 0/5 * * * ?" />
            <el-button :loading="previewLoading" @click="handlePreview">预览</el-button>
          </div>
          <div v-if="previewResult" class="cron-preview">下一次执行时间：{{ previewResult }}</div>
        </el-form-item>
        <el-form-item label="错过策略">
          <el-select v-model="form.misfirePolicy" placeholder="请选择">
            <el-option v-for="opt in misfirePolicyOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </el-select>
        </el-form-item>
        <el-form-item label="允许并发">
          <el-switch v-model="form.concurrent" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="submitForm">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<style scoped>
.cron-job-list {
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
.search-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}
.search-input {
  width: 200px;
}
.search-select {
  width: 140px;
}
.create-btn {
  margin-left: auto;
}
.pagination {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
.cron-input-row {
  display: flex;
  gap: 8px;
  width: 100%;
}
.cron-preview {
  margin-top: 4px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>
