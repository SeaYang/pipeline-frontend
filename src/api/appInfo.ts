import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'
import type { PageResult } from '@/api/dict'

// ============ 应用信息 ============

/** 应用基础信息（对应后端 AppInfoResponse） */
export interface AppInfo {
  id?: number
  /** 应用名称 */
  appName: string
  /** 所使用的编程语言或平台 */
  programmingLanguage?: string
  /** 应用描述 */
  description?: string
  /** git 仓库地址（ssh 格式） */
  gitSshUrl?: string
  createTime?: string
  updateTime?: string
}

/** 应用信息分页查询条件（对应后端 AppInfoQueryRequest） */
export interface AppInfoQuery {
  /** 应用名称（模糊匹配） */
  appName?: string
  /** 排序字段：appName / programmingLanguage / gitSshUrl / updateTime 等 */
  sortField?: string
  /** 排序方向：asc / desc（后端默认 desc） */
  sortOrder?: 'asc' | 'desc'
  pageNum: number
  pageSize: number
}

// ============ 应用信息 接口（/app-info） ============

/** 分页查询应用信息：GET /app-info/page */
export async function pageAppInfo(query: AppInfoQuery): Promise<PageResult<AppInfo>> {
  const res = await request.get<unknown, ApiResult<PageResult<AppInfo>>>('/app-info/page', {
    params: query,
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '应用信息列表获取失败')
  }
  return res.data
}
