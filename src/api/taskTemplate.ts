import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'
import type { PageResult, DictData } from '@/api/dict'

// ============ 任务模板 ============

/** 任务模板（对应后端 TaskTemplateDTO，用于新增/修改/列表/详情） */
export interface TaskTemplate {
  id?: number
  /** 任务模板编码 */
  taskTemplateCode: string
  /** 任务模板名称 */
  name: string
  /** 详细描述内容 */
  description?: string
  /** 任务模板所属分组（存字典 dictKey） */
  taskTemplateGroup: string
  creator?: string
  createTime?: string
  updateTime?: string
}

/** 任务模板分页查询条件（对应后端 TaskTemplateQueryDTO） */
export interface TaskTemplateQuery {
  /** 任务模板编码（模糊匹配） */
  taskTemplateCode?: string
  /** 任务模板名称（模糊匹配） */
  name?: string
  /** 任务模板所属分组（精确匹配，可为空） */
  taskTemplateGroup?: string
  /** 排序字段：id / taskTemplateCode / name / description / taskTemplateGroup / creator / createTime / updateTime */
  sortField?: string
  /** 排序方向：asc / desc（后端默认 desc） */
  sortOrder?: 'asc' | 'desc'
  pageNum: number
  pageSize: number
}

// ============ 任务模板版本 ============

/** 任务模板版本状态：DRAFT 草稿 / EFFECTIVE 生效中 / EXPIRED 已失效 */
export type TaskTemplateVersionStatus = 'DRAFT' | 'EFFECTIVE' | 'EXPIRED'

/** 任务模板版本（对应后端 TaskTemplateVersionDTO，用于新增/修改/详情/列表） */
export interface TaskTemplateVersion {
  id?: number
  /** 任务模板编码 */
  taskTemplateCode: string
  /** 任务版本号，如 1.0.1 */
  version: string
  /** 任务版本状态 */
  status?: TaskTemplateVersionStatus
  /** 任务模板详情，对应 argo WorkflowTemplate 的 json/yml 字符串 */
  templateDetail?: string
  /** 版本变更说明 */
  changeNote?: string
  creator?: string
  createTime?: string
  updateTime?: string
}

/** 任务模板版本状态变更入参（对应后端 TaskTemplateVersionStatusDTO） */
export interface TaskTemplateVersionStatusChange {
  /** 任务模板编码 */
  taskTemplateCode: string
  /** 任务版本号 */
  version: string
  /** 目标状态：DRAFT / EFFECTIVE / EXPIRED */
  status: TaskTemplateVersionStatus
}

// ============ 任务模板 接口（/task-template） ============

/** 分页查询任务模板：GET /task-template/page */
export async function pageTaskTemplate(query: TaskTemplateQuery): Promise<PageResult<TaskTemplate>> {
  const res = await request.get<unknown, ApiResult<PageResult<TaskTemplate>>>('/task-template/page', {
    params: query,
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '任务模板列表获取失败')
  }
  return res.data
}

/** 新增任务模板：POST /task-template */
export async function createTaskTemplate(dto: TaskTemplate): Promise<TaskTemplate> {
  const res = await request.post<unknown, ApiResult<TaskTemplate>>('/task-template', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新增任务模板失败')
  }
  return res.data
}

/** 修改任务模板：PUT /task-template */
export async function updateTaskTemplate(dto: TaskTemplate): Promise<TaskTemplate> {
  const res = await request.put<unknown, ApiResult<TaskTemplate>>('/task-template', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改任务模板失败')
  }
  return res.data
}

/** 根据主键查询任务模板：GET /task-template/{id} */
export async function getTaskTemplate(id: number): Promise<TaskTemplate> {
  const res = await request.get<unknown, ApiResult<TaskTemplate>>(`/task-template/${id}`)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '任务模板详情获取失败')
  }
  return res.data
}

/** 删除任务模板（若存在版本则禁止删除）：DELETE /task-template/{id} */
export async function deleteTaskTemplate(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(`/task-template/${id}`)
  if (res.code !== 200) {
    throw new Error(res.message || '删除任务模板失败')
  }
}

/** 任务模板所属分组下拉列表：GET /task-template/groups（字典 task-template-group，按 sort 升序） */
export async function listTaskTemplateGroups(): Promise<DictData[]> {
  const res = await request.get<unknown, ApiResult<DictData[]>>('/task-template/groups')
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '任务模板分组获取失败')
  }
  return res.data
}

// ============ 任务模板版本 接口（/task-template/version） ============

/** 新增任务模板版本：POST /task-template/version */
export async function createVersion(dto: TaskTemplateVersion): Promise<TaskTemplateVersion> {
  const res = await request.post<unknown, ApiResult<TaskTemplateVersion>>('/task-template/version', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新增任务模板版本失败')
  }
  return res.data
}

/** 修改任务模板版本（仅 templateDetail / changeNote）：PUT /task-template/version */
export async function updateVersion(dto: TaskTemplateVersion): Promise<TaskTemplateVersion> {
  const res = await request.put<unknown, ApiResult<TaskTemplateVersion>>('/task-template/version', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改任务模板版本失败')
  }
  return res.data
}

/** 删除任务模板版本：DELETE /task-template/version/{id} */
export async function deleteVersion(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(`/task-template/version/${id}`)
  if (res.code !== 200) {
    throw new Error(res.message || '删除任务模板版本失败')
  }
}

/** 根据任务模板编码 + 版本号查询版本详情：GET /task-template/version/detail */
export async function getVersionDetail(
  taskTemplateCode: string,
  version: string,
): Promise<TaskTemplateVersion> {
  const res = await request.get<unknown, ApiResult<TaskTemplateVersion>>(
    '/task-template/version/detail',
    { params: { taskTemplateCode, version } },
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '版本详情获取失败')
  }
  return res.data
}

/** 根据任务模板编码查询版本列表（按创建时间倒序）：GET /task-template/version/list */
export async function listVersions(taskTemplateCode: string): Promise<TaskTemplateVersion[]> {
  const res = await request.get<unknown, ApiResult<TaskTemplateVersion[]>>(
    '/task-template/version/list',
    { params: { taskTemplateCode } },
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '版本列表获取失败')
  }
  return res.data
}

/** 变更版本状态（目标为生效中时，自动把其它生效中版本置为已失效）：PUT /task-template/version/status */
export async function changeVersionStatus(
  dto: TaskTemplateVersionStatusChange,
): Promise<TaskTemplateVersion> {
  const res = await request.put<unknown, ApiResult<TaskTemplateVersion>>(
    '/task-template/version/status',
    dto,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '版本状态变更失败')
  }
  return res.data
}
