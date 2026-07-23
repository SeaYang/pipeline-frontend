import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'
import type { PageResult } from '@/api/dict'

// ==================== 类型定义 ====================

/** 参数定义 */
export interface PipelineParameter {
  id?: number
  name: string
  label: string
  description?: string
  componentType?: string
  paramType: string
  required?: boolean
  defaultValue?: string
  needSystemProcess?: boolean
  regexPattern?: string
  dependParams?: string
  refreshOnChanged?: boolean
  paramGroup: string
  paramGroupSort?: number
  optionConfig?: string
  defaultValueStrategyConfig?: string
  creator?: string
  createTime?: string
  updateTime?: string
}

/** 分页查询条件 */
export interface PipelineParameterQuery {
  name?: string
  label?: string
  paramType?: string
  paramGroup?: string
  sortField?: string
  sortOrder?: 'asc' | 'desc'
  pageNum: number
  pageSize: number
}

/** 新增入参 */
export type PipelineParameterCreate = Omit<PipelineParameter, 'id' | 'creator' | 'createTime' | 'updateTime'>

/** 修改入参 */
export type PipelineParameterUpdate = PipelineParameterCreate & { id: number }

// ==================== 接口函数 ====================

/** 分页查询：GET /pipeline-parameter/page */
export async function pagePipelineParameter(
  query: PipelineParameterQuery,
): Promise<PageResult<PipelineParameter>> {
  const res = await request.get<unknown, ApiResult<PageResult<PipelineParameter>>>(
    '/pipeline-parameter/page',
    { params: query },
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '参数定义列表获取失败')
  }
  return res.data
}

/** 新增：POST /pipeline-parameter */
export async function createPipelineParameter(dto: PipelineParameterCreate): Promise<PipelineParameter> {
  const res = await request.post<unknown, ApiResult<PipelineParameter>>('/pipeline-parameter', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新增参数定义失败')
  }
  return res.data
}

/** 修改：PUT /pipeline-parameter */
export async function updatePipelineParameter(dto: PipelineParameterUpdate): Promise<PipelineParameter> {
  const res = await request.put<unknown, ApiResult<PipelineParameter>>('/pipeline-parameter', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改参数定义失败')
  }
  return res.data
}

/** 详情：GET /pipeline-parameter/{id} */
export async function getPipelineParameter(id: number): Promise<PipelineParameter> {
  const res = await request.get<unknown, ApiResult<PipelineParameter>>(`/pipeline-parameter/${id}`)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '参数定义获取失败')
  }
  return res.data
}

/** 删除：DELETE /pipeline-parameter/{id} */
export async function deletePipelineParameter(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(`/pipeline-parameter/${id}`)
  if (res.code !== 200) {
    throw new Error(res.message || '删除参数定义失败')
  }
}

/** 按参数名查询详情：GET /pipeline-parameter/name/{name} */
export async function getPipelineParameterByName(name: string): Promise<PipelineParameter> {
  const res = await request.get<unknown, ApiResult<PipelineParameter>>(
    `/pipeline-parameter/name/${encodeURIComponent(name)}`,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '参数定义获取失败')
  }
  return res.data
}

// ==================== 枚举接口 ====================

/** 枚举选项 */
export interface EnumOption {
  code: string
  description: string
}

/** 参数类型枚举：GET /pipeline-parameter/enums/param-type */
export async function paramTypeEnums(): Promise<EnumOption[]> {
  const res = await request.get<unknown, ApiResult<EnumOption[]>>(
    '/pipeline-parameter/enums/param-type',
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '参数类型枚举获取失败')
  }
  return res.data
}

/** 组件类型枚举：GET /pipeline-parameter/enums/component-type */
export async function componentTypeEnums(): Promise<EnumOption[]> {
  const res = await request.get<unknown, ApiResult<EnumOption[]>>(
    '/pipeline-parameter/enums/component-type',
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '组件类型枚举获取失败')
  }
  return res.data
}

/** 默认值策略类型枚举：GET /pipeline-parameter/enums/strategy-type */
export async function strategyTypeEnums(): Promise<EnumOption[]> {
  const res = await request.get<unknown, ApiResult<EnumOption[]>>(
    '/pipeline-parameter/enums/strategy-type',
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '策略类型枚举获取失败')
  }
  return res.data
}

/** 查询全部参数（仅 name 和 label），用于依赖参数选择：GET /pipeline-parameter/list-all */
export async function listAllParams(): Promise<PipelineParameter[]> {
  const res = await request.get<unknown, ApiResult<PipelineParameter[]>>(
    '/pipeline-parameter/list-all',
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '参数列表获取失败')
  }
  return res.data
}
