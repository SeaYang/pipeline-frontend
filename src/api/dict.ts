import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'

// ============ 通用：分页结果（对应后端 com.ci.pipeline.facade.dto.PageResult） ============

export interface PageResult<T> {
  records: T[]
  total: number
  current: number
  size: number
  pages: number
}

// ============ 字典类型 ============

/** 字典类型（对应后端 DictTypeDTO，用于新增/修改/列表/详情） */
export interface DictType {
  id?: number
  /** 字典类型（编码，如 sys_user_sex） */
  dictType: string
  /** 字典名称 */
  dictName: string
  remark?: string
  createTime?: string
  updateTime?: string
}

/** 字典类型分页查询条件（对应后端 DictTypeQueryDTO） */
export interface DictTypeQuery {
  /** 字典类型（模糊匹配） */
  dictType?: string
  /** 字典名称（模糊匹配） */
  dictName?: string
  /** 排序字段：id / dictType / dictName / remark / createTime / updateTime */
  sortField?: string
  /** 排序方向：asc / desc（后端默认 desc） */
  sortOrder?: 'asc' | 'desc'
  pageNum: number
  pageSize: number
}

// ============ 字典数据 ============

/** 字典数据（对应后端 DictDataDTO） */
export interface DictData {
  id?: number
  /** 字典类型（所属类型编码） */
  dictType: string
  /** 字典编码（后端字段 dictKey） */
  dictKey: string
  /** 字典值（后端字段 dictValue） */
  dictValue: string
  /** 排序值 */
  dictSort?: number
  remark?: string
  /** 是否启用 */
  enabled?: boolean
  createTime?: string
  updateTime?: string
}

/** 字典数据分页查询条件（对应后端 DictDataQueryDTO） */
export interface DictDataQuery {
  /** 字典类型（精确匹配，可为空） */
  dictType?: string
  /** 字典编码（模糊匹配） */
  dictKey?: string
  /** 字典值（模糊匹配） */
  dictValue?: string
  /** 排序字段：id / dictType / dictKey / dictValue / dictSort / remark / enabled / createTime / updateTime */
  sortField?: string
  /** 排序方向：asc / desc（后端默认 desc） */
  sortOrder?: 'asc' | 'desc'
  pageNum: number
  pageSize: number
}

// ============ 字典类型 接口（/dict/type） ============

/** 分页查询字典类型：GET /dict/type/page */
export async function pageDictType(query: DictTypeQuery): Promise<PageResult<DictType>> {
  const res = await request.get<unknown, ApiResult<PageResult<DictType>>>('/dict/type/page', {
    params: query,
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '字典类型列表获取失败')
  }
  return res.data
}

/** 新增字典类型：POST /dict/type */
export async function createDictType(dto: DictType): Promise<DictType> {
  const res = await request.post<unknown, ApiResult<DictType>>('/dict/type', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新增字典类型失败')
  }
  return res.data
}

/** 修改字典类型：PUT /dict/type */
export async function updateDictType(dto: DictType): Promise<DictType> {
  const res = await request.put<unknown, ApiResult<DictType>>('/dict/type', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改字典类型失败')
  }
  return res.data
}

/** 根据主键查询字典类型：GET /dict/type/{id} */
export async function getDictType(id: number): Promise<DictType> {
  const res = await request.get<unknown, ApiResult<DictType>>(`/dict/type/${id}`)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '字典类型详情获取失败')
  }
  return res.data
}

/** 删除字典类型（若存在字典数据则禁止删除）：DELETE /dict/type/{id} */
export async function deleteDictType(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(`/dict/type/${id}`)
  if (res.code !== 200) {
    throw new Error(res.message || '删除字典类型失败')
  }
}

// ============ 字典数据 接口（/dict/data） ============

/**
 * 分页查询字典数据：GET /dict/data/page
 * 注意：该接口需后端补充（DictDataQueryDTO 已就绪、Controller 待加 page 方法），
 * 前端按契约先行编写，联调时等后端补上即可。
 */
export async function pageDictData(query: DictDataQuery): Promise<PageResult<DictData>> {
  const res = await request.get<unknown, ApiResult<PageResult<DictData>>>('/dict/data/page', {
    params: query,
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '字典数据列表获取失败')
  }
  return res.data
}

/** 查询指定字典类型下的全部数据（按排序值升序）：GET /dict/data/list?dictType= */
export async function listDictData(dictType: string): Promise<DictData[]> {
  const res = await request.get<unknown, ApiResult<DictData[]>>('/dict/data/list', {
    params: { dictType },
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '字典数据列表获取失败')
  }
  return res.data
}

/** 新增字典数据：POST /dict/data */
export async function createDictData(dto: DictData): Promise<DictData> {
  const res = await request.post<unknown, ApiResult<DictData>>('/dict/data', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新增字典数据失败')
  }
  return res.data
}

/** 修改字典数据：PUT /dict/data */
export async function updateDictData(dto: DictData): Promise<DictData> {
  const res = await request.put<unknown, ApiResult<DictData>>('/dict/data', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改字典数据失败')
  }
  return res.data
}

/** 根据主键查询字典数据：GET /dict/data/{id} */
export async function getDictData(id: number): Promise<DictData> {
  const res = await request.get<unknown, ApiResult<DictData>>(`/dict/data/${id}`)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '字典数据详情获取失败')
  }
  return res.data
}

/** 删除字典数据：DELETE /dict/data/{id} */
export async function deleteDictData(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(`/dict/data/${id}`)
  if (res.code !== 200) {
    throw new Error(res.message || '删除字典数据失败')
  }
}
