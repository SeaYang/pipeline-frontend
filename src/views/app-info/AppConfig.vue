<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  listAppParameterConfig,
  deleteAppParameterConfig,
  listEnvs,
  type AppParameterConfig,
} from '@/api/appParameterConfig'
import { getAppInfoByAppName, updateAppInfo, pageAppInfo, type AppInfo } from '@/api/appInfo'
import AppConfigAddDialog from './components/AppConfigAddDialog.vue'
import AppConfigEditDialog from './components/AppConfigEditDialog.vue'

const route = useRoute()
const router = useRouter()

// ==================== 应用选择（远程模糊搜索） ====================
const currentAppName = ref('')
const appInfo = ref<AppInfo | null>(null)
const appLoading = ref(false)

/** appName 下拉选项 */
const appOptions = ref<string[]>([])
const remoteSearching = ref(false)
let lastKeyword = ''

/** 当前选中的 appName，与路由 params.appName 双向绑定 */
const selectedAppName = computed<string>({
  get: () => (route.params.appName ? String(route.params.appName) : ''),
  set: (val) => {
    const path = val ? `/app-config/${encodeURIComponent(val)}` : '/app-config'
    if (route.path !== path) router.replace(path)
  },
})

/** 远程模糊搜索 appName */
async function remoteSearch(keyword: string) {
  const kw = (keyword ?? '').trim()
  if (!kw) return
  if (kw === lastKeyword) return
  lastKeyword = kw
  remoteSearching.value = true
  try {
    const res = await pageAppInfo({ appName: kw, pageNum: 1, pageSize: 20 })
    appOptions.value = (res.records ?? []).map((r) => r.appName)
    const cur = selectedAppName.value
    if (cur && !appOptions.value.includes(cur)) appOptions.value.unshift(cur)
  } catch (e) {
    ElMessage.error((e as Error)?.message || '应用列表获取失败')
    appOptions.value = []
  } finally {
    remoteSearching.value = false
  }
}

/** 加载应用详情 */
async function loadAppInfo() {
  if (!currentAppName.value) return
  appLoading.value = true
  try {
    appInfo.value = await getAppInfoByAppName(currentAppName.value)
  } catch (e) {
    ElMessage.error((e as Error)?.message || '应用详情获取失败')
    appInfo.value = null
  } finally {
    appLoading.value = false
  }
}

// ==================== 基础信息编辑 ====================
const editingInfo = ref(false)
const infoForm = ref<AppInfo | null>(null)
const savingInfo = ref(false)

function startEditInfo() {
  infoForm.value = { ...appInfo.value } as AppInfo
  editingInfo.value = true
}

function cancelEditInfo() {
  editingInfo.value = false
  infoForm.value = null
}

async function saveInfo() {
  if (!infoForm.value) return
  savingInfo.value = true
  try {
    await updateAppInfo({
      id: infoForm.value.id!,
      appName: infoForm.value.appName,
      gitSshUrl: infoForm.value.gitSshUrl,
      programmingLanguage: infoForm.value.programmingLanguage,
    })
    ElMessage.success('保存成功')
    editingInfo.value = false
    await loadAppInfo()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '保存失败')
  } finally {
    savingInfo.value = false
  }
}

// ==================== 环境 Tab（env 同步到 URL query） ====================
const envs = ref<string[]>([])
const configList = ref<AppParameterConfig[]>([])
const listLoading = ref(false)

/** 当前选中的 env，与路由 query.env 双向绑定，默认 default */
const activeEnv = computed<string>({
  get: () => (route.query.env ? String(route.query.env) : 'default'),
  set: (val) => {
    const query = { ...route.query }
    if (val && val !== 'default') {
      query.env = val
    } else {
      delete query.env
    }
    router.replace({ query })
  },
})

/** 加载环境列表 */
async function loadEnvs() {
  try {
    envs.value = await listEnvs()
    // env 列表加载完后，如果当前 env 不在列表中，切到 default
    if (envs.value.length > 0 && !envs.value.includes(activeEnv.value)) {
      activeEnv.value = 'default'
    }
    await loadConfigList()
  } catch (e) {
    ElMessage.error((e as Error)?.message || '环境列表获取失败')
  }
}

/** 切换环境 Tab → 仅写入 URL query，由 watch(route.query.env) 统一触发请求 */
function handleTabChange(env: string) {
  activeEnv.value = env
}

/** 加载当前环境的参数配置列表 */
async function loadConfigList() {
  if (!currentAppName.value || !activeEnv.value) return
  listLoading.value = true
  try {
    configList.value = await listAppParameterConfig({
      appName: currentAppName.value,
      env: activeEnv.value,
    })
  } catch (e) {
    ElMessage.error((e as Error)?.message || '参数配置列表获取失败')
    configList.value = []
  } finally {
    listLoading.value = false
  }
}

// ==================== 新增 / 编辑 / 删除 ====================
const addVisible = ref(false)
const editVisible = ref(false)
const editRow = ref<AppParameterConfig | null>(null)

function openAdd() {
  addVisible.value = true
}

function openEdit(row: AppParameterConfig) {
  editRow.value = row
  editVisible.value = true
}

async function handleDelete(row: AppParameterConfig) {
  try {
    await ElMessageBox.confirm(
      `确认删除参数「${row.label || row.parameterName}」的配置吗？`,
      '提示',
      { type: 'warning' },
    )
    await deleteAppParameterConfig(row.id!)
    ElMessage.success('删除成功')
    await loadConfigList()
  } catch (e) {
    if (e !== 'cancel') {
      ElMessage.error((e as Error)?.message || '删除失败')
    }
  }
}

/** 新增/编辑成功后刷新列表（保持当前 Tab） */
function handleSuccess() {
  loadConfigList()
}

// ==================== 初始化与路由监听 ====================

/** 从路由参数初始化 appName */
function initFromRoute() {
  currentAppName.value = selectedAppName.value
}

/** 路由 params.appName 变化 → 重新加载应用数据 */
watch(
  () => route.params.appName,
  (val) => {
    const name = val ? String(val) : ''
    if (name !== currentAppName.value) {
      currentAppName.value = name
      if (name) {
        loadAppInfo()
        loadEnvs()
      } else {
        appInfo.value = null
        configList.value = []
      }
    }
  },
)

/** 路由 query.env 变化 → 重新加载参数列表（Tab 切换的唯一请求入口） */
watch(
  () => route.query.env,
  () => {
    if (currentAppName.value && envs.value.length > 0) {
      loadConfigList()
    }
  },
)

onMounted(() => {
  initFromRoute()
  if (currentAppName.value) {
    loadAppInfo()
    loadEnvs()
  }
})
</script>

<template>
  <div class="app-config-page">
    <div class="page-header">
      <h3 class="title">应用配置</h3>
    </div>

    <!-- 应用选择（远程模糊搜索） -->
    <div class="app-select-bar">
      <el-select
        v-model="selectedAppName"
        filterable
        remote
        clearable
        :remote-method="remoteSearch"
        :loading="remoteSearching"
        placeholder="请输入应用名称搜索"
        style="width: 300px"
      >
        <el-option v-for="a in appOptions" :key="a" :label="a" :value="a" />
      </el-select>
    </div>

    <template v-if="currentAppName">
      <!-- 基础信息区域 -->
      <el-card class="info-card" v-loading="appLoading" shadow="never">
        <template #header>
          <div class="card-header">
            <span>基础信息</span>
            <el-button
              v-if="!editingInfo && appInfo"
              type="primary"
              size="small"
              @click="startEditInfo"
            >
              编辑
            </el-button>
          </div>
        </template>

        <el-form v-if="appInfo" label-width="120px" class="info-form">
          <el-form-item label="应用名称">
            <span>{{ appInfo.appName }}</span>
          </el-form-item>
          <el-form-item label="Git SSH URL">
            <el-input
              v-if="editingInfo && infoForm"
              v-model="infoForm.gitSshUrl"
              placeholder="git@github.com:xxx/xxx.git"
            />
            <span v-else>{{ appInfo.gitSshUrl || '-' }}</span>
          </el-form-item>
          <el-form-item label="编程语言">
            <el-input
              v-if="editingInfo && infoForm"
              v-model="infoForm.programmingLanguage"
              placeholder="如：java、go、node"
            />
            <span v-else>{{ appInfo.programmingLanguage || '-' }}</span>
          </el-form-item>
          <el-form-item label="Repo ID">
            <span>{{ appInfo.repoId ?? '-' }}</span>
          </el-form-item>
          <el-form-item v-if="editingInfo">
            <el-button type="primary" :loading="savingInfo" @click="saveInfo">保存</el-button>
            <el-button @click="cancelEditInfo">取消</el-button>
          </el-form-item>
        </el-form>

        <el-empty v-else-if="!appLoading" description="应用不存在" :image-size="60" />
      </el-card>

      <!-- 参数配置区域 -->
      <el-card class="config-card" shadow="never">
        <template #header>
          <div class="card-header">
            <span>参数配置</span>
            <el-button type="primary" size="small" @click="openAdd" :disabled="!activeEnv">
              新增
            </el-button>
          </div>
        </template>

        <el-tabs v-model="activeEnv" @tab-change="handleTabChange">
          <el-tab-pane
            v-for="env in envs"
            :key="env"
            :label="env"
            :name="env"
          />
        </el-tabs>

        <el-table
          v-loading="listLoading"
          :data="configList"
          border
          stripe
          style="width: 100%"
          empty-text="暂无参数配置"
        >
          <el-table-column label="参数编码" prop="parameterName" min-width="160" />
          <el-table-column label="参数名称" prop="label" min-width="140" />
          <el-table-column label="参数值" prop="value" min-width="200" show-overflow-tooltip />
          <el-table-column label="描述" prop="description" min-width="200" show-overflow-tooltip />
          <el-table-column label="操作" width="140" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="openEdit(row)">编辑</el-button>
              <el-button type="danger" link size="small" @click="handleDelete(row)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </template>

    <!-- 新增弹框 -->
    <AppConfigAddDialog
      v-model="addVisible"
      :app-name="currentAppName"
      :env="activeEnv"
      @success="handleSuccess"
    />

    <!-- 编辑弹框 -->
    <AppConfigEditDialog
      v-model="editVisible"
      :row="editRow"
      @success="handleSuccess"
    />
  </div>
</template>

<style scoped>
.app-config-page {
  padding: 16px 20px;
}

.page-header {
  margin-bottom: 16px;
}

.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.app-select-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
}

.info-card,
.config-card {
  margin-bottom: 16px;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.info-form {
  max-width: 600px;
}
</style>
