import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'
import type { PageResult } from '@/api/dict'

// ==================== 类型定义 ====================

/** 集群信息（token 脱敏回显） */
export interface ClusterInfo {
  id: number
  clusterName: string
  description?: string
  argoUrl: string
  argoTokenMasked?: string
  argoNamespace: string
  k8sMasterUrl: string
  k8sTokenMasked?: string
  k8sVerifyingSsl: boolean
  connectTimeoutMs: number
  readTimeoutMs: number
  freeMemoryThreshold: number
  maxRunningWorkflows?: number | null
  enabled: boolean
  online: boolean
  isDefault: boolean
  creator?: string
  createTime?: string
  updater?: string
  updateTime?: string
}

/** 分页查询条件 */
export interface ClusterQuery {
  clusterName?: string
  enabled?: number
  online?: number
  pageNum: number
  pageSize: number
}

/** 新增入参 */
export interface ClusterCreate {
  clusterName: string
  description?: string
  argoUrl: string
  argoToken: string
  argoNamespace?: string
  k8sMasterUrl: string
  k8sToken: string
  k8sVerifyingSsl?: boolean
  connectTimeoutMs?: number
  readTimeoutMs?: number
  freeMemoryThreshold?: number
  maxRunningWorkflows?: number | null
  enabled?: boolean
  online?: boolean
  isDefault?: boolean
  /** 是否同步已有模板到新集群（默认 true） */
  autoSyncTemplates?: boolean
  creator?: string
}

/** 修改入参（clusterName 不可改；token 留空表示不修改） */
export type ClusterUpdate = Omit<ClusterCreate, 'clusterName' | 'argoToken' | 'k8sToken' | 'autoSyncTemplates'> & {
  id: number
  /** 留空表示不修改 */
  argoToken?: string
  /** 留空表示不修改 */
  k8sToken?: string
}

/** 测试连接入参 */
export interface ClusterTestConnectionRequest {
  id?: number
  argoUrl: string
  argoToken?: string
  k8sMasterUrl: string
  k8sToken?: string
  k8sVerifyingSsl?: boolean
  connectTimeoutMs?: number
  readTimeoutMs?: number
}

/** 测试连接响应 */
export interface ClusterTestConnectionResponse {
  argoOk: boolean
  argoMessage?: string
  argoCostMs?: number
  k8sOk: boolean
  k8sMessage?: string
  k8sCostMs?: number
  allOk: boolean
}

/** 单集群同步结果 */
export interface ClusterSyncResult {
  clusterName: string
  success: boolean
  errorMessage?: string
}

/** 全量同步报告 */
export interface ClusterSyncReport {
  clusterName: string
  total: number
  successCount: number
  failureCount: number
  failures: ClusterSyncResult[]
}

/** 集群下拉选项 */
export interface ClusterOption {
  clusterName: string
  description?: string
}

/** 调度策略下拉选项 */
export interface SchedulePolicyOption {
  code: string
  description: string
}

// ==================== 接口函数 ====================

/** 分页查询：GET /cluster/page */
export async function pageCluster(query: ClusterQuery): Promise<PageResult<ClusterInfo>> {
  const res = await request.get<unknown, ApiResult<PageResult<ClusterInfo>>>('/cluster/page', { params: query })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '集群列表获取失败')
  }
  return res.data
}

/** 新增：POST /cluster */
export async function createCluster(dto: ClusterCreate): Promise<ClusterInfo> {
  const res = await request.post<unknown, ApiResult<ClusterInfo>>('/cluster', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新增集群失败')
  }
  return res.data
}

/** 修改：PUT /cluster */
export async function updateCluster(dto: ClusterUpdate): Promise<ClusterInfo> {
  const res = await request.put<unknown, ApiResult<ClusterInfo>>('/cluster', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改集群失败')
  }
  return res.data
}

/** 删除：DELETE /cluster/{id} */
export async function deleteCluster(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(`/cluster/${id}`)
  if (res.code !== 200) {
    throw new Error(res.message || '删除集群失败')
  }
}

/** 摘流开关切换：POST /cluster/{clusterName}/online?online=true|false */
export async function toggleClusterOnline(clusterName: string, online: boolean): Promise<void> {
  const res = await request.post<unknown, ApiResult<void>>(`/cluster/${clusterName}/online`, null, {
    params: { online },
  })
  if (res.code !== 200) {
    throw new Error(res.message || '切换摘流状态失败')
  }
}

/** 测试连接：POST /cluster/test-connection */
export async function testClusterConnection(dto: ClusterTestConnectionRequest): Promise<ClusterTestConnectionResponse> {
  const res = await request.post<unknown, ApiResult<ClusterTestConnectionResponse>>('/cluster/test-connection', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '测试连接失败')
  }
  return res.data
}

/** 全量同步模板到集群：POST /cluster/{clusterName}/sync-templates */
export async function syncClusterTemplates(clusterName: string): Promise<ClusterSyncReport> {
  const res = await request.post<unknown, ApiResult<ClusterSyncReport>>(`/cluster/${clusterName}/sync-templates`)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '同步模板失败')
  }
  return res.data
}

/** 集群下拉选项：GET /cluster/options */
export async function listClusterOptions(): Promise<ClusterOption[]> {
  const res = await request.get<unknown, ApiResult<ClusterOption[]>>('/cluster/options')
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '集群选项获取失败')
  }
  return res.data
}

/** 调度策略下拉选项：GET /cluster/schedule-policies */
export async function listSchedulePolicies(): Promise<SchedulePolicyOption[]> {
  const res = await request.get<unknown, ApiResult<SchedulePolicyOption[]>>('/cluster/schedule-policies')
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '调度策略选项获取失败')
  }
  return res.data
}

/** 重推流水线模板到集群：POST /pipeline-template/sync-clusters */
export async function syncPipelineTemplateClusters(
  pipelineTemplateCode: string,
  clusterName?: string,
): Promise<ClusterSyncResult[]> {
  const res = await request.post<unknown, ApiResult<ClusterSyncResult[]>>('/pipeline-template/sync-clusters', null, {
    params: { pipelineTemplateCode, clusterName },
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '重推模板失败')
  }
  return res.data
}
