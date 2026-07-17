import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'
import type { PageResult } from '@/api/dict'

// ============ 流水线实例 ============

/** 流水线实例（对应后端 PipelineResponse） */
export interface Pipeline {
  id?: number
  /** 流水线名称 */
  name: string
  /** 服务的 appName */
  appName: string
  /** 流水线模板编码 */
  pipelineTemplateCode: string
  /** 创建人 */
  creator?: string
  createTime?: string
  updateTime?: string
}

/** 流水线实例分页查询条件（对应后端 PipelineQueryRequest） */
export interface PipelineQuery {
  /** 应用名称（精确匹配，可为空） */
  appName?: string
  /** 排序字段：id / name / appName / pipelineTemplateCode / creator / createTime / updateTime */
  sortField?: string
  /** 排序方向：asc / desc（后端默认 desc） */
  sortOrder?: 'asc' | 'desc'
  pageNum: number
  pageSize: number
}

/** 流水线实例新增入参（对应后端 PipelineCreateRequest） */
export interface PipelineCreate {
  /** 流水线名称（必填） */
  name: string
  /** 服务的 appName（必填） */
  appName: string
  /** 流水线模板编码（必填） */
  pipelineTemplateCode: string
}

/** 流水线实例修改入参（对应后端 PipelineUpdateRequest，目前仅允许修改 name） */
export interface PipelineUpdate {
  /** 主键（必填） */
  id: number
  /** 流水线名称（仅允许修改该字段） */
  name: string
}

/** 执行流水线入参（对应后端 PipelineExecuteRequest） */
export interface PipelineExecute {
  /** 流水线 id（必填） */
  pipelineId: number
  /** 流水线参数对象，key 为参数名，value 为参数值 */
  parameters: Record<string, string>
}

/** 执行流水线响应（对应后端 PipelineExecuteResponse） */
export interface PipelineExecuteResult {
  /** 提交后 Argo 返回的 Workflow 名称 */
  workflowName: string
}

/** 新建流水线时的模板下拉项（对应后端 PipelineTemplateOptionResponse，仅含生效中版本） */
export interface PipelineTemplateOption {
  /** 流水线模板编码 */
  pipelineTemplateCode: string
  /** 模板名称 */
  name: string
  /** 模板详细描述 */
  description?: string
  /** 生效中版本的模板详情（argo WorkflowTemplate 的 json 字符串） */
  templateDetail?: string
}

/** 流水线模板参数（对应后端 WorkflowParameterResponse，argo arguments.parameters 单项） */
export interface WorkflowParameter {
  /** 参数名 */
  name: string
  /** 参数值（可能为空） */
  value?: string
  /** 参数默认值（可能为空） */
  defaultValue?: string
  /** 参数描述 */
  description?: string
}

// ============ 流水线实例 接口（/pipeline） ============

/** 分页查询流水线：GET /pipeline/page */
export async function pagePipeline(query: PipelineQuery): Promise<PageResult<Pipeline>> {
  const res = await request.get<unknown, ApiResult<PageResult<Pipeline>>>('/pipeline/page', {
    params: query,
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '流水线列表获取失败')
  }
  return res.data
}

/** 新增流水线：POST /pipeline */
export async function createPipeline(dto: PipelineCreate): Promise<Pipeline> {
  const res = await request.post<unknown, ApiResult<Pipeline>>('/pipeline', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新建流水线失败')
  }
  return res.data
}

/** 修改流水线（目前仅允许修改 name）：PUT /pipeline */
export async function updatePipeline(dto: PipelineUpdate): Promise<Pipeline> {
  const res = await request.put<unknown, ApiResult<Pipeline>>('/pipeline', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改流水线失败')
  }
  return res.data
}

/** 根据主键查询流水线：GET /pipeline/{id} */
export async function getPipeline(id: number): Promise<Pipeline> {
  const res = await request.get<unknown, ApiResult<Pipeline>>(`/pipeline/${id}`)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '流水线详情获取失败')
  }
  return res.data
}

/** 删除流水线：DELETE /pipeline/{id} */
export async function deletePipeline(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(`/pipeline/${id}`)
  if (res.code !== 200) {
    throw new Error(res.message || '删除流水线失败')
  }
}

/** 新建流水线时的模板下拉列表（按 app 所属编程语言过滤、仅含生效中版本）：GET /pipeline/templates */
export async function listPipelineTemplates(appName: string): Promise<PipelineTemplateOption[]> {
  const res = await request.get<unknown, ApiResult<PipelineTemplateOption[]>>('/pipeline/templates', {
    params: { appName },
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '流水线模板列表获取失败')
  }
  return res.data
}

/** 流水线模板参数列表：GET /pipeline/{pipelineId}/parameters */
export async function listPipelineParameters(pipelineId: number): Promise<WorkflowParameter[]> {
  const res = await request.get<unknown, ApiResult<WorkflowParameter[]>>(
    `/pipeline/${pipelineId}/parameters`,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '流水线参数获取失败')
  }
  return res.data
}

/** 执行流水线（按模板名拉起 Argo Workflow）：POST /pipeline/execute */
export async function executePipeline(dto: PipelineExecute): Promise<PipelineExecuteResult> {
  const res = await request.post<unknown, ApiResult<PipelineExecuteResult>>('/pipeline/execute', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '执行流水线失败')
  }
  return res.data
}

// ============ 流水线执行记录（/pipeline-run） ============

/** 流水线执行记录（对应后端 PipelineRunResponse） */
export interface PipelineRun {
  id: number
  pipelineId: number
  /** 执行名称（Argo Workflow 名称） */
  name: string
  appName: string
  pipelineTemplateCode: string
  pipelineTemplateVersion: string
  /** 执行状态编码，见 PIPELINE_RUN_STATUS_MAP */
  status: string
  gitBranch?: string
  commitId?: string
  arguments?: string
  failType?: string
  failMessage?: string
  /** 执行时长（秒） */
  duration?: number
  revision?: number
  creator: string
  startTime?: string
  endTime?: string
  createTime?: string
  updateTime?: string
}

/** 流水线执行记录分页查询条件（对应后端 PipelineRunQueryRequest） */
export interface PipelineRunQuery {
  /** 流水线 id（精确匹配，可为空） */
  pipelineId?: number
  /** 应用名称（精确匹配，可为空） */
  appName?: string
  /** 执行状态（精确匹配，可为空） */
  status?: string
  /** 排序字段：id / name / appName / pipelineTemplateCode / pipelineTemplateVersion / status / duration / createTime / updateTime */
  sortField?: string
  /** 排序方向：asc / desc（后端默认 desc） */
  sortOrder?: 'asc' | 'desc'
  pageNum: number
  pageSize: number
}

/** 执行状态编码 → 中文描述（对应后端 com.ci.pipeline.common.enums.PipelineRunStatus） */
export const PIPELINE_RUN_STATUS_MAP: Record<string, string> = {
  Pending: '排队中',
  Running: '运行中',
  Succeeded: '成功',
  Failed: '失败',
  Error: '错误',
  Unknown: '未知',
  Cancelled: '已取消',
}

/** 执行状态编码 → 中文描述，未知编码原样返回 */
export function pipelineRunStatusLabel(status?: string): string {
  if (!status) return '-'
  return PIPELINE_RUN_STATUS_MAP[status] ?? status
}

/** 执行状态编码 → el-tag 类型 */
export function pipelineRunStatusTagType(status?: string) {
  switch (status) {
    case 'Succeeded':
      return 'success'
    case 'Failed':
    case 'Error':
      return 'danger'
    case 'Running':
      return 'primary'
    case 'Pending':
      return 'warning'
    default:
      return 'info'
  }
}

/** 分页查询流水线执行记录：GET /pipeline-run/page */
export async function pagePipelineRun(query: PipelineRunQuery): Promise<PageResult<PipelineRun>> {
  const res = await request.get<unknown, ApiResult<PageResult<PipelineRun>>>('/pipeline-run/page', {
    params: query,
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '运行历史获取失败')
  }
  return res.data
}

/** 查询流水线最近一次执行记录（无执行记录返回 null）：GET /pipeline-run/latest */
export async function getLatestPipelineRun(pipelineId: number): Promise<PipelineRun | null> {
  const res = await request.get<unknown, ApiResult<PipelineRun | null>>('/pipeline-run/latest', {
    params: { pipelineId },
  })
  if (res.code !== 200) {
    throw new Error(res.message || '最近执行记录获取失败')
  }
  return res.data ?? null
}

/** 流水线执行快照响应（对应后端 PipelineRunSnapshotResponse） */
export interface PipelineRunSnapshot {
  /** 流水线执行记录 id */
  pipelineRunId: number
  /** 执行详情快照 JSON 字符串 */
  detail: string
}

/** 查询流水线执行快照：GET /pipeline-run/{id}/snapshot */
export async function getPipelineRunSnapshot(pipelineRunId: number): Promise<PipelineRunSnapshot> {
  const res = await request.get<unknown, ApiResult<PipelineRunSnapshot>>(
    `/pipeline-run/${pipelineRunId}/snapshot`,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '执行快照获取失败')
  }
  return res.data
}

/** 重试流水线执行（仅 Failed / Error 可重试）：POST /pipeline-run/{id}/retry */
export async function retryPipelineRun(id: number): Promise<PipelineRun> {
  const res = await request.post<unknown, ApiResult<PipelineRun>>(`/pipeline-run/${id}/retry`)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '重试失败')
  }
  return res.data
}

/** 停止流水线执行（终止 Argo Workflow 并置为 Cancelled）：POST /pipeline-run/{id}/stop */
export async function stopPipelineRun(id: number): Promise<PipelineRun> {
  const res = await request.post<unknown, ApiResult<PipelineRun>>(`/pipeline-run/${id}/stop`)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '停止失败')
  }
  return res.data
}
