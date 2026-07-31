import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'

// ==================== 类型定义 ====================

/** 应用参数配置（对应后端 AppParameterConfigResponse） */
export interface AppParameterConfig {
  id?: number
  appName: string
  parameterName: string
  value: string
  env: string
  /** 参数中文名（来自 pipeline_parameter.label） */
  label?: string
  /** 参数描述（来自 pipeline_parameter.description） */
  description?: string
  createTime?: string
  updateTime?: string
}

/** 可配置参数选项（对应后端 AppParameterOptionResponse） */
export interface AppParameterOption {
  name: string
  label: string
  componentType: string
  paramType: string
  /** 选项配置 JSON（SELECT/RADIO 用） */
  optionConfig?: string
}

/** 新增请求 */
export interface AppParameterConfigCreate {
  appName: string
  parameterName: string
  value: string
  env: string
}

/** 批量新增请求 */
export interface AppParameterConfigBatchCreate {
  appName: string
  env: string
  items: { parameterName: string; value: string }[]
}

/** 修改请求（仅 value） */
export interface AppParameterConfigUpdate {
  id: number
  value: string
}

/** 列表查询条件 */
export interface AppParameterConfigQuery {
  appName: string
  env: string
}

// ==================== 接口函数 ====================

/** 新增单条：POST /app-parameter-config */
export async function createAppParameterConfig(
  data: AppParameterConfigCreate,
): Promise<AppParameterConfig> {
  const res = await request.post<unknown, ApiResult<AppParameterConfig>>(
    '/app-parameter-config',
    data,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新增失败')
  }
  return res.data
}

/** 批量新增：POST /app-parameter-config/batch */
export async function batchCreateAppParameterConfig(
  data: AppParameterConfigBatchCreate,
): Promise<void> {
  const res = await request.post<unknown, ApiResult<void>>(
    '/app-parameter-config/batch',
    data,
  )
  if (res.code !== 200) {
    throw new Error(res.message || '批量新增失败')
  }
}

/** 修改（仅 value）：PUT /app-parameter-config */
export async function updateAppParameterConfig(
  data: AppParameterConfigUpdate,
): Promise<AppParameterConfig> {
  const res = await request.put<unknown, ApiResult<AppParameterConfig>>(
    '/app-parameter-config',
    data,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改失败')
  }
  return res.data
}

/** 删除：DELETE /app-parameter-config/{id} */
export async function deleteAppParameterConfig(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(
    `/app-parameter-config/${id}`,
  )
  if (res.code !== 200) {
    throw new Error(res.message || '删除失败')
  }
}

/** 列表查询（不分页）：GET /app-parameter-config/list */
export async function listAppParameterConfig(
  query: AppParameterConfigQuery,
): Promise<AppParameterConfig[]> {
  const res = await request.get<unknown, ApiResult<AppParameterConfig[]>>(
    '/app-parameter-config/list',
    { params: query },
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '列表获取失败')
  }
  return res.data
}

/** 获取环境列表：GET /app-parameter-config/envs */
export async function listEnvs(): Promise<string[]> {
  const res = await request.get<unknown, ApiResult<string[]>>(
    '/app-parameter-config/envs',
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '环境列表获取失败')
  }
  return res.data
}

/** 获取可配置参数列表：GET /pipeline-parameter/configurable-list */
export async function listConfigurableParameters(): Promise<AppParameterOption[]> {
  const res = await request.get<unknown, ApiResult<AppParameterOption[]>>(
    '/pipeline-parameter/configurable-list',
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '参数列表获取失败')
  }
  return res.data
}
