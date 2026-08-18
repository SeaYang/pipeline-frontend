<script setup lang="ts">
import { onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Plus, Search, Delete, Edit, Connection, Refresh } from '@element-plus/icons-vue'
import {
  pageCluster,
  createCluster,
  updateCluster,
  deleteCluster,
  toggleClusterOnline,
  testClusterConnection,
  syncClusterTemplates,
  type ClusterInfo,
  type ClusterQuery,
  type ClusterTestConnectionResponse,
} from '@/api/cluster'
import { formatDateTime } from '@/utils/time'

// ==================== 列表数据 ====================
const loading = ref(false)
const list = ref<ClusterInfo[]>([])
const total = ref(0)

const query = reactive<ClusterQuery>({
  clusterName: '',
  enabled: undefined,
  online: undefined,
  pageNum: 1,
  pageSize: 10,
})

async function fetchData() {
  loading.value = true
  try {
    const res = await pageCluster(query)
    list.value = res.records ?? []
    total.value = res.total ?? 0
  } catch (e) {
    ElMessage.error((e as Error)?.message || '集群列表获取失败')
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

// ==================== 摘流开关 ====================

async function handleToggleOnline(row: ClusterInfo, value: boolean) {
  const tip = value
    ? `确定要恢复「${row.clusterName}」在线吗？恢复后将立即参与调度。`
    : `确定要摘流「${row.clusterName}」吗？摘流期间该集群不接新任务（模板同步不受影响）。`
  try {
    await ElMessageBox.confirm(tip, '摘流确认', {
      type: 'warning',
      confirmButtonText: value ? '恢复在线' : '确认摘流',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await toggleClusterOnline(row.clusterName, value)
    ElMessage.success(value ? '已恢复在线' : '已摘流')
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '操作失败')
  }
}

// ==================== 同步模板 ====================

const syncLoading = ref('')

async function handleSyncTemplates(row: ClusterInfo) {
  try {
    await ElMessageBox.confirm(
      `确定要将全部生效中的模板（流水线 + 任务）同步到「${row.clusterName}」吗？`,
      '同步确认',
      { type: 'warning', confirmButtonText: '同步', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  syncLoading.value = row.clusterName
  try {
    const report = await syncClusterTemplates(row.clusterName)
    if (report.failureCount === 0) {
      ElMessage.success(`同步完成：共 ${report.total} 个模板全部成功`)
    } else {
      const detail = report.failures.map((f) => `${f.clusterName}: ${f.errorMessage}`).join('；')
      ElMessageBox.alert(
        `总数 ${report.total}，成功 ${report.successCount}，失败 ${report.failureCount}。<br/>失败明细：${detail}`,
        '同步报告（部分失败）',
        { type: 'warning', dangerouslyUseHTMLString: true },
      )
    }
  } catch (e) {
    ElMessage.error((e as Error)?.message || '同步模板失败')
  } finally {
    syncLoading.value = ''
  }
}

// ==================== 新增 / 编辑 ====================
const dialogVisible = ref(false)
const dialogMode = ref<'create' | 'edit'>('create')
const submitting = ref(false)
const formRef = ref<FormInstance>()

const form = reactive({
  id: undefined as number | undefined,
  clusterName: '',
  description: '',
  argoUrl: '',
  argoToken: '',
  argoNamespace: 'argo',
  k8sMasterUrl: '',
  k8sToken: '',
  k8sVerifyingSsl: false,
  connectTimeoutMs: 5000,
  readTimeoutMs: 10000,
  freeMemoryThreshold: 0.2,
  maxRunningWorkflows: undefined as number | undefined,
  enabled: true,
  online: true,
  isDefault: false,
  autoSyncTemplates: true,
})

const rules: FormRules = {
  clusterName: [
    { required: true, message: '请输入集群标识', trigger: 'blur' },
    {
      pattern: /^[a-z0-9-]{1,100}$/,
      message: '小写字母数字中划线，长度 1~100',
      trigger: 'blur',
    },
  ],
  argoUrl: [
    { required: true, message: '请输入 Argo Server 地址', trigger: 'blur' },
    {
      pattern: /^https?:\/\//,
      message: '必须以 http:// 或 https:// 开头',
      trigger: 'blur',
    },
  ],
  argoToken: [{ required: true, message: '请输入 Argo Token', trigger: 'blur' }],
  k8sMasterUrl: [
    { required: true, message: '请输入 K8s API Server 地址', trigger: 'blur' },
    {
      pattern: /^https?:\/\//,
      message: '必须以 http:// 或 https:// 开头',
      trigger: 'blur',
    },
  ],
  k8sToken: [{ required: true, message: '请输入 K8s Token', trigger: 'blur' }],
}

function resetForm() {
  form.id = undefined
  form.clusterName = ''
  form.description = ''
  form.argoUrl = ''
  form.argoToken = ''
  form.argoNamespace = 'argo'
  form.k8sMasterUrl = ''
  form.k8sToken = ''
  form.k8sVerifyingSsl = false
  form.connectTimeoutMs = 5000
  form.readTimeoutMs = 10000
  form.freeMemoryThreshold = 0.2
  form.maxRunningWorkflows = undefined
  form.enabled = true
  form.online = true
  form.isDefault = false
  form.autoSyncTemplates = true
  testResult.value = null
}

function openCreate() {
  resetForm()
  dialogMode.value = 'create'
  dialogVisible.value = true
}

function openEdit(row: ClusterInfo) {
  resetForm()
  dialogMode.value = 'edit'
  form.id = row.id
  form.clusterName = row.clusterName
  form.description = row.description || ''
  form.argoUrl = row.argoUrl
  form.argoNamespace = row.argoNamespace
  form.k8sMasterUrl = row.k8sMasterUrl
  form.k8sVerifyingSsl = row.k8sVerifyingSsl
  form.connectTimeoutMs = row.connectTimeoutMs
  form.readTimeoutMs = row.readTimeoutMs
  form.freeMemoryThreshold = row.freeMemoryThreshold
  form.maxRunningWorkflows = row.maxRunningWorkflows ?? undefined
  form.enabled = row.enabled
  form.online = row.online
  form.isDefault = row.isDefault
  dialogVisible.value = true
}

async function submitForm() {
  if (!formRef.value) return
  const valid = await formRef.value.validate().catch(() => false)
  if (!valid) return
  submitting.value = true
  try {
    if (dialogMode.value === 'create') {
      await createCluster({
        clusterName: form.clusterName,
        description: form.description || undefined,
        argoUrl: form.argoUrl,
        argoToken: form.argoToken,
        argoNamespace: form.argoNamespace,
        k8sMasterUrl: form.k8sMasterUrl,
        k8sToken: form.k8sToken,
        k8sVerifyingSsl: form.k8sVerifyingSsl,
        connectTimeoutMs: form.connectTimeoutMs,
        readTimeoutMs: form.readTimeoutMs,
        freeMemoryThreshold: form.freeMemoryThreshold,
        maxRunningWorkflows: form.maxRunningWorkflows ?? null,
        enabled: form.enabled,
        online: form.online,
        isDefault: form.isDefault,
        autoSyncTemplates: form.autoSyncTemplates,
      })
      ElMessage.success(
        form.autoSyncTemplates ? '新增成功，已有模板正在后台同步到新集群' : '新增成功',
      )
    } else {
      await updateCluster({
        id: form.id!,
        description: form.description || undefined,
        argoUrl: form.argoUrl,
        // token 留空表示不修改
        argoToken: form.argoToken || undefined,
        argoNamespace: form.argoNamespace || 'argo',
        k8sMasterUrl: form.k8sMasterUrl,
        k8sToken: form.k8sToken || undefined,
        k8sVerifyingSsl: form.k8sVerifyingSsl,
        connectTimeoutMs: form.connectTimeoutMs,
        readTimeoutMs: form.readTimeoutMs,
        freeMemoryThreshold: form.freeMemoryThreshold,
        maxRunningWorkflows: form.maxRunningWorkflows ?? null,
        enabled: form.enabled,
        online: form.online,
        isDefault: form.isDefault,
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

// ==================== 测试连接 ====================
const testLoading = ref(false)
const testResult = ref<ClusterTestConnectionResponse | null>(null)

async function handleTestConnection() {
  if (!form.argoUrl || !form.k8sMasterUrl) {
    ElMessage.warning('请先填写 Argo 和 K8s 地址')
    return
  }
  if (dialogMode.value === 'create' && (!form.argoToken || !form.k8sToken)) {
    ElMessage.warning('请先填写 Argo Token 和 K8s Token')
    return
  }
  testLoading.value = true
  try {
    testResult.value = await testClusterConnection({
      id: dialogMode.value === 'edit' ? form.id : undefined,
      argoUrl: form.argoUrl,
      argoToken: form.argoToken || undefined,
      k8sMasterUrl: form.k8sMasterUrl,
      k8sToken: form.k8sToken || undefined,
      k8sVerifyingSsl: form.k8sVerifyingSsl,
      connectTimeoutMs: form.connectTimeoutMs,
      readTimeoutMs: form.readTimeoutMs,
    })
  } catch (e) {
    ElMessage.error((e as Error)?.message || '测试连接失败')
  } finally {
    testLoading.value = false
  }
}

// ==================== 删除 ====================
async function handleDelete(row: ClusterInfo) {
  try {
    await ElMessageBox.confirm(
      `确定要删除集群「${row.clusterName}」吗？存在执行记录的集群无法删除（请改用下线）。`,
      '删除确认',
      { type: 'warning', confirmButtonText: '删除', cancelButtonText: '取消' },
    )
  } catch {
    return
  }
  try {
    await deleteCluster(row.id)
    ElMessage.success('删除成功')
    fetchData()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '删除失败')
  }
}
</script>

<template>
  <div class="cluster-list">
    <div class="list-header">
      <h3 class="title">集群管理</h3>
    </div>

    <div class="search-bar">
      <el-input
        v-model="query.clusterName"
        placeholder="集群标识"
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
        <el-option label="下线" :value="0" />
      </el-select>
      <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
      <el-button type="primary" :icon="Plus" class="create-btn" @click="openCreate">新增集群</el-button>
    </div>

    <el-table v-loading="loading" :data="list" border stripe style="width: 100%" empty-text="暂无集群">
      <el-table-column label="集群标识" prop="clusterName" min-width="120" show-overflow-tooltip />
      <el-table-column label="描述" prop="description" min-width="140" show-overflow-tooltip>
        <template #default="{ row }">{{ row.description || '-' }}</template>
      </el-table-column>
      <el-table-column label="Argo 地址" prop="argoUrl" min-width="200" show-overflow-tooltip />
      <el-table-column label="默认" width="70" align="center">
        <template #default="{ row }">
          <el-tag v-if="row.isDefault" type="success" size="small">默认</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="启用" width="80" align="center">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'" size="small">
            {{ row.enabled ? '启用' : '下线' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="在线" width="90" align="center">
        <template #default="{ row }">
          <el-switch
            :model-value="row.online"
            :disabled="!row.enabled"
            @change="(val: boolean) => handleToggleOnline(row, val)"
          />
        </template>
      </el-table-column>
      <el-table-column label="水位阈值" width="90" align="center">
        <template #default="{ row }">{{ row.freeMemoryThreshold }}</template>
      </el-table-column>
      <el-table-column label="更新时间" width="170">
        <template #default="{ row }">{{ formatDateTime(row.updateTime) }}</template>
      </el-table-column>
      <el-table-column label="操作" width="280" fixed="right">
        <template #default="{ row }">
          <el-button link type="primary" :icon="Connection" @click="openEdit(row); testResult = null">编辑</el-button>
          <el-button
            link
            type="primary"
            :icon="Refresh"
            :loading="syncLoading === row.clusterName"
            @click="handleSyncTemplates(row)"
          >
            同步模板
          </el-button>
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
      :title="dialogMode === 'create' ? '新增集群' : '编辑集群'"
      width="720px"
      destroy-on-close
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-width="150px">
        <el-form-item label="集群标识" prop="clusterName">
          <el-input
            v-model="form.clusterName"
            :disabled="dialogMode === 'edit'"
            placeholder="小写字母数字中划线，创建后不可修改"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" maxlength="500" placeholder="集群描述" />
        </el-form-item>
        <el-form-item label="Argo Server 地址" prop="argoUrl">
          <el-input v-model="form.argoUrl" placeholder="https://192.168.10.130:2746" />
        </el-form-item>
        <el-form-item label="Argo Token" prop="argoToken">
          <el-input
            v-model="form.argoToken"
            type="password"
            show-password
            :placeholder="dialogMode === 'edit' ? '留空表示不修改' : '含 Bearer 前缀'"
          />
        </el-form-item>
        <el-form-item label="Argo 命名空间">
          <el-input v-model="form.argoNamespace" placeholder="默认 argo" />
        </el-form-item>
        <el-form-item label="K8s API 地址" prop="k8sMasterUrl">
          <el-input v-model="form.k8sMasterUrl" placeholder="https://192.168.10.130:6443" />
        </el-form-item>
        <el-form-item label="K8s Token" prop="k8sToken">
          <el-input
            v-model="form.k8sToken"
            type="password"
            show-password
            :placeholder="dialogMode === 'edit' ? '留空表示不修改' : '不含 Bearer 前缀'"
          />
        </el-form-item>
        <el-form-item label="校验 K8s 证书">
          <el-switch v-model="form.k8sVerifyingSsl" />
        </el-form-item>
        <el-form-item label="连接超时(ms)">
          <el-input-number v-model="form.connectTimeoutMs" :min="1000" :max="60000" :step="500" />
        </el-form-item>
        <el-form-item label="读取超时(ms)">
          <el-input-number v-model="form.readTimeoutMs" :min="1000" :max="120000" :step="500" />
        </el-form-item>
        <el-form-item label="空闲内存水位">
          <el-input-number
            v-model="form.freeMemoryThreshold"
            :min="0.05"
            :max="1"
            :step="0.05"
            :precision="2"
          />
          <span class="form-tip">平均空闲内存占比低于该值的集群不参与调度</span>
        </el-form-item>
        <el-form-item label="运行数上限">
          <el-input-number v-model="form.maxRunningWorkflows" :min="1" :step="1" />
          <span class="form-tip">运行中 Workflow 数硬上限，留空不启用</span>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
          <span class="form-tip">下线后不参与调度、模板不再同步到该集群</span>
        </el-form-item>
        <el-form-item label="在线">
          <el-switch v-model="form.online" />
          <span class="form-tip">摘流后不参与调度，但模板同步照常</span>
        </el-form-item>
        <el-form-item label="设为默认集群">
          <el-switch v-model="form.isDefault" />
          <span class="form-tip">全局唯一；存量执行记录路由的兜底集群</span>
        </el-form-item>
        <el-form-item v-if="dialogMode === 'create'" label="同步已有模板">
          <el-switch v-model="form.autoSyncTemplates" />
          <span class="form-tip">保存后异步将全部生效中模板推送到新集群</span>
        </el-form-item>
        <el-form-item label="连通性">
          <el-button :loading="testLoading" :icon="Connection" @click="handleTestConnection">
            测试连接
          </el-button>
          <span v-if="testResult" class="test-result">
            <el-tag :type="testResult.argoOk ? 'success' : 'danger'" size="small">
              Argo {{ testResult.argoOk ? '通' : '不通' }}（{{ testResult.argoCostMs }}ms）
            </el-tag>
            <el-tag :type="testResult.k8sOk ? 'success' : 'danger'" size="small">
              K8s {{ testResult.k8sOk ? '通' : '不通' }}（{{ testResult.k8sCostMs }}ms）
            </el-tag>
          </span>
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
.cluster-list {
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
.form-tip {
  margin-left: 8px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
.test-result {
  margin-left: 12px;
  display: inline-flex;
  gap: 8px;
}
</style>
