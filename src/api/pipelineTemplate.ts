import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'
import type { DictData } from '@/api/dict'

// ============ 流水线模板 ============

/** 流水线模板（对应后端 PipelineTemplateResponse，用于新增/修改/列表/详情） */
export interface PipelineTemplate {
  id?: number
  /** 流水线模板编码 */
  pipelineTemplateCode: string
  /** 流水线模板名称 */
  name: string
  /** 详细描述内容 */
  description?: string
  /** 流水线模板所属分组（存字典 dictKey） */
  pipelineTemplateGroup: string
  creator?: string
  createTime?: string
  updateTime?: string
}

/** 流水线模板列表查询条件（对应后端 PipelineTemplateQueryRequest；后端不分页） */
export interface PipelineTemplateQuery {
  /** 流水线模板所属分组（精确匹配，可为空） */
  pipelineTemplateGroup?: string
  /** 排序字段：id / pipelineTemplateCode / name / description / pipelineTemplateGroup / creator / createTime / updateTime */
  sortField?: string
  /** 排序方向：asc / desc（后端默认 desc） */
  sortOrder?: 'asc' | 'desc'
}

// ============ 流水线模板版本 ============

/** 流水线模板版本状态：DRAFT 草稿 / EFFECTIVE 生效中 / EXPIRED 已失效 */
export type PipelineTemplateVersionStatus = 'DRAFT' | 'EFFECTIVE' | 'EXPIRED'

/** 流水线模板版本（对应后端 PipelineTemplateVersionResponse，用于新增/修改/详情/列表） */
export interface PipelineTemplateVersion {
  id?: number
  /** 流水线模板编码 */
  pipelineTemplateCode: string
  /** 模板版本号，如 1.0.1 */
  version: string
  /** 模板版本状态 */
  status?: PipelineTemplateVersionStatus
  /** 流水线模板详情，对应 argo WorkflowTemplate 的 json/yml 字符串 */
  templateDetail?: string
  /** 版本变更说明 */
  changeNote?: string
  creator?: string
  createTime?: string
  updateTime?: string
}

/** 流水线模板版本状态变更入参（对应后端 PipelineTemplateVersionStatusRequest） */
export interface PipelineTemplateVersionStatusChange {
  /** 流水线模板编码 */
  pipelineTemplateCode: string
  /** 模板版本号 */
  version: string
  /** 目标状态：DRAFT / EFFECTIVE / EXPIRED */
  status: PipelineTemplateVersionStatus
}

// ============ 流水线模板 接口（/pipeline-template） ============

/** 列表查询流水线模板（不分页）：GET /pipeline-template/list */
export async function listPipelineTemplate(query: PipelineTemplateQuery): Promise<PipelineTemplate[]> {
  const res = await request.get<unknown, ApiResult<PipelineTemplate[]>>('/pipeline-template/list', {
    params: query,
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '流水线模板列表获取失败')
  }
  return res.data
}

/** 新增流水线模板：POST /pipeline-template */
export async function createPipelineTemplate(dto: PipelineTemplate): Promise<PipelineTemplate> {
  const res = await request.post<unknown, ApiResult<PipelineTemplate>>('/pipeline-template', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新增流水线模板失败')
  }
  return res.data
}

/** 修改流水线模板：PUT /pipeline-template */
export async function updatePipelineTemplate(dto: PipelineTemplate): Promise<PipelineTemplate> {
  const res = await request.put<unknown, ApiResult<PipelineTemplate>>('/pipeline-template', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改流水线模板失败')
  }
  return res.data
}

/** 根据主键查询流水线模板：GET /pipeline-template/{id} */
export async function getPipelineTemplate(id: number): Promise<PipelineTemplate> {
  const res = await request.get<unknown, ApiResult<PipelineTemplate>>(`/pipeline-template/${id}`)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '流水线模板详情获取失败')
  }
  return res.data
}

/** 删除流水线模板（若存在版本则禁止删除）：DELETE /pipeline-template/{id} */
export async function deletePipelineTemplate(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(`/pipeline-template/${id}`)
  if (res.code !== 200) {
    throw new Error(res.message || '删除流水线模板失败')
  }
}

/** 流水线模板所属分组下拉列表：GET /pipeline-template/groups（字典 programming-language，按 sort 升序） */
export async function listPipelineTemplateGroups(): Promise<DictData[]> {
  const res = await request.get<unknown, ApiResult<DictData[]>>('/pipeline-template/groups')
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '流水线模板分组获取失败')
  }
  return res.data
}

// ============ 流水线模板版本 接口（/pipeline-template/version） ============

/** 新增流水线模板版本：POST /pipeline-template/version */
export async function createVersion(dto: PipelineTemplateVersion): Promise<PipelineTemplateVersion> {
  const res = await request.post<unknown, ApiResult<PipelineTemplateVersion>>(
    '/pipeline-template/version',
    dto,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新增流水线模板版本失败')
  }
  return res.data
}

/** 修改流水线模板版本（仅 templateDetail / changeNote）：PUT /pipeline-template/version */
export async function updateVersion(dto: PipelineTemplateVersion): Promise<PipelineTemplateVersion> {
  const res = await request.put<unknown, ApiResult<PipelineTemplateVersion>>(
    '/pipeline-template/version',
    dto,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改流水线模板版本失败')
  }
  return res.data
}

/** 删除流水线模板版本：DELETE /pipeline-template/version/{id} */
export async function deleteVersion(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(`/pipeline-template/version/${id}`)
  if (res.code !== 200) {
    throw new Error(res.message || '删除流水线模板版本失败')
  }
}

/** 根据流水线模板编码 + 版本号查询版本详情：GET /pipeline-template/version/detail */
export async function getVersionDetail(
  pipelineTemplateCode: string,
  version: string,
): Promise<PipelineTemplateVersion> {
  const res = await request.get<unknown, ApiResult<PipelineTemplateVersion>>(
    '/pipeline-template/version/detail',
    { params: { pipelineTemplateCode, version } },
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '版本详情获取失败')
  }
  return res.data
}

/** 根据流水线模板编码查询版本列表（按创建时间倒序）：GET /pipeline-template/version/list */
export async function listVersions(pipelineTemplateCode: string): Promise<PipelineTemplateVersion[]> {
  const res = await request.get<unknown, ApiResult<PipelineTemplateVersion[]>>(
    '/pipeline-template/version/list',
    { params: { pipelineTemplateCode } },
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '版本列表获取失败')
  }
  return res.data
}

/** 变更版本状态（目标为生效中时，自动把其它生效中/草稿版本置为已失效）：PUT /pipeline-template/version/status */
export async function changeVersionStatus(
  dto: PipelineTemplateVersionStatusChange,
): Promise<PipelineTemplateVersion> {
  const res = await request.put<unknown, ApiResult<PipelineTemplateVersion>>(
    '/pipeline-template/version/status',
    dto,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '版本状态变更失败')
  }
  return res.data
}
