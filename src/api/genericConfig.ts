import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'
import type { PageResult } from '@/api/dict'

// ==================== 类型定义 ====================

export interface GenericConfig {
  id?: number
  configKey: string
  configValue: unknown
  valueFormat: string
  description?: string
  creator?: string
  createTime?: string
  updater?: string
  updateTime?: string
}

export interface GenericConfigHistory {
  id: number
  configId: number
  configKey: string
  action: string
  oldValue: unknown
  newValue: unknown
  oldValueFormat?: string
  newValueFormat?: string
  changeSummary?: string
  operator: string
  operateTime: string
}

export interface GenericConfigHistoryQuery {
  configKey?: string
  action?: string
  operator?: string
  pageNum: number
  pageSize: number
}

export type GenericConfigCreate = Omit<GenericConfig, 'id' | 'creator' | 'createTime' | 'updater' | 'updateTime'>
export type GenericConfigUpdate = Pick<GenericConfig, 'description' | 'valueFormat'> & {
  id: number
  configValue: unknown
}

// ==================== 接口函数 ====================

export async function listGenericConfig(configKey?: string): Promise<GenericConfig[]> {
  const res = await request.get<unknown, ApiResult<GenericConfig[]>>('/generic-config/list', {
    params: { configKey },
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '配置列表获取失败')
  }
  return res.data
}

export async function getGenericConfig(id: number): Promise<GenericConfig> {
  const res = await request.get<unknown, ApiResult<GenericConfig>>(`/generic-config/${id}`)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '配置详情获取失败')
  }
  return res.data
}

export async function createGenericConfig(dto: GenericConfigCreate): Promise<GenericConfig> {
  const res = await request.post<unknown, ApiResult<GenericConfig>>('/generic-config', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新建配置失败')
  }
  return res.data
}

export async function updateGenericConfig(dto: GenericConfigUpdate): Promise<GenericConfig> {
  const res = await request.put<unknown, ApiResult<GenericConfig>>('/generic-config', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改配置失败')
  }
  return res.data
}

export async function deleteGenericConfig(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(`/generic-config/${id}`)
  if (res.code !== 200) {
    throw new Error(res.message || '删除配置失败')
  }
}

export async function historyByConfigId(configId: number): Promise<GenericConfigHistory[]> {
  const res = await request.get<unknown, ApiResult<GenericConfigHistory[]>>(
    `/generic-config/${configId}/history`,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '变更历史获取失败')
  }
  return res.data
}

export async function historyPage(
  query: GenericConfigHistoryQuery,
): Promise<PageResult<GenericConfigHistory>> {
  const res = await request.get<unknown, ApiResult<PageResult<GenericConfigHistory>>>(
    '/generic-config/history/page',
    { params: query },
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '变更历史获取失败')
  }
  return res.data
}
