import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'
import type { PageResult } from '@/api/dict'

// ============ 事件-模板绑定 ============

/** 事件-模板绑定（对应后端 PipelineTemplateEventBindResponse） */
export interface TemplateEventBind {
  id?: number
  /** 事件类型编码 */
  eventType: string
  /** 事件类型中文名（关联字典翻译） */
  eventTypeDesc?: string
  /** 流水线模板编码 */
  pipelineTemplateCode: string
  /** 模板名称（关联翻译） */
  pipelineTemplateName?: string
  creator?: string
  createTime?: string
  updateTime?: string
}

/** 事件-模板绑定 新增请求 */
export interface TemplateEventBindCreate {
  eventType: string
  pipelineTemplateCode: string
}

/** 事件-模板绑定 修改请求 */
export interface TemplateEventBindUpdate {
  id: number
  eventType: string
  pipelineTemplateCode: string
}

/** 事件-模板绑定 分页查询条件 */
export interface TemplateEventBindQuery {
  /** 事件类型（精确过滤，可为空） */
  eventType?: string
  /** 排序字段 */
  sortField?: string
  /** 排序方向：asc / desc */
  sortOrder?: 'asc' | 'desc'
  pageNum: number
  pageSize: number
}

// ============ 接口（/pipeline-template-event-bind） ============

/** 分页查询：GET /pipeline-template-event-bind/page */
export async function pageTemplateEventBind(
  query: TemplateEventBindQuery,
): Promise<PageResult<TemplateEventBind>> {
  const res = await request.get<unknown, ApiResult<PageResult<TemplateEventBind>>>(
    '/pipeline-template-event-bind/page',
    { params: query },
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '事件-模板绑定列表获取失败')
  }
  return res.data
}

/** 新增：POST /pipeline-template-event-bind */
export async function createTemplateEventBind(dto: TemplateEventBindCreate): Promise<TemplateEventBind> {
  const res = await request.post<unknown, ApiResult<TemplateEventBind>>(
    '/pipeline-template-event-bind',
    dto,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新增事件-模板绑定失败')
  }
  return res.data
}

/** 修改：PUT /pipeline-template-event-bind */
export async function updateTemplateEventBind(dto: TemplateEventBindUpdate): Promise<TemplateEventBind> {
  const res = await request.put<unknown, ApiResult<TemplateEventBind>>(
    '/pipeline-template-event-bind',
    dto,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改事件-模板绑定失败')
  }
  return res.data
}

/** 根据主键查询：GET /pipeline-template-event-bind/{id} */
export async function getTemplateEventBind(id: number): Promise<TemplateEventBind> {
  const res = await request.get<unknown, ApiResult<TemplateEventBind>>(
    `/pipeline-template-event-bind/${id}`,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '事件-模板绑定详情获取失败')
  }
  return res.data
}

/** 删除：DELETE /pipeline-template-event-bind/{id} */
export async function deleteTemplateEventBind(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(
    `/pipeline-template-event-bind/${id}`,
  )
  if (res.code !== 200) {
    throw new Error(res.message || '删除事件-模板绑定失败')
  }
}
