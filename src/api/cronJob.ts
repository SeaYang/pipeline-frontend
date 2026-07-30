import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'
import type { PageResult } from '@/api/dict'

// ==================== 类型定义 ====================

/** 定时任务定义 */
export interface CronJob {
  id?: number
  name: string
  beanName: string
  methodName: string
  /** 方法参数，JSON数组字符串，如 ["daily", 500]，无参可不填 */
  methodParams?: string
  /** CRON表达式（6位：秒 分 时 日 月 周） */
  cronExpr: string
  /** 是否启用：0-停用 1-启用 */
  enabled: number
  /** 错过执行策略：fire_now / fire_once / skip */
  misfirePolicy: string
  /** 是否允许并发执行：0-禁止 1-允许 */
  concurrent: number
  nextFireTime?: string
  lastFireTime?: string
  createTime?: string
  updateTime?: string
}

/** 分页查询条件 */
export interface CronJobQuery {
  name?: string
  enabled?: number
  pageNum: number
  pageSize: number
}

/** 新增入参 */
export type CronJobCreate = Omit<CronJob, 'id' | 'nextFireTime' | 'lastFireTime' | 'createTime' | 'updateTime'>

/** 修改入参（enabled 通过独立的启用/停用接口调整，不在编辑表单中提交） */
export type CronJobUpdate = Omit<CronJobCreate, 'enabled'> & { id: number }

/** 执行日志 */
export interface CronJobLog {
  id: number
  jobId: number
  jobName: string
  beanName: string
  methodName: string
  methodParams?: string
  status: 'running' | 'succeeded' | 'failed'
  message?: string
  instanceIp?: string
  startTime: string
  endTime?: string
  costMs?: number
  createTime?: string
}

/** 执行日志分页查询条件 */
export interface CronJobLogQuery {
  jobId?: number
  status?: string
  pageNum: number
  pageSize: number
}

/** 错过执行策略枚举选项（对应后端 MisfirePolicyEnum） */
export const misfirePolicyOptions = [
  { value: 'fire_now', label: '错过后立即执行一次' },
  { value: 'fire_once', label: '错过后仅补偿执行一次' },
  { value: 'skip', label: '错过后直接跳过' },
]

/** 执行状态展示文案 */
export const cronJobLogStatusLabel: Record<string, string> = {
  running: '执行中',
  succeeded: '成功',
  failed: '失败',
}

// ==================== 任务定义接口函数 ====================

/** 分页查询：GET /cron-job/page */
export async function pageCronJob(query: CronJobQuery): Promise<PageResult<CronJob>> {
  const res = await request.get<unknown, ApiResult<PageResult<CronJob>>>('/cron-job/page', { params: query })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '定时任务列表获取失败')
  }
  return res.data
}

/** 详情：GET /cron-job/{id} */
export async function getCronJob(id: number): Promise<CronJob> {
  const res = await request.get<unknown, ApiResult<CronJob>>(`/cron-job/${id}`)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '定时任务详情获取失败')
  }
  return res.data
}

/** 新增：POST /cron-job */
export async function createCronJob(dto: CronJobCreate): Promise<CronJob> {
  const res = await request.post<unknown, ApiResult<CronJob>>('/cron-job', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '新建定时任务失败')
  }
  return res.data
}

/** 修改：PUT /cron-job */
export async function updateCronJob(dto: CronJobUpdate): Promise<CronJob> {
  const res = await request.put<unknown, ApiResult<CronJob>>('/cron-job', dto)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '修改定时任务失败')
  }
  return res.data
}

/** 删除：DELETE /cron-job/{id} */
export async function deleteCronJob(id: number): Promise<void> {
  const res = await request.delete<unknown, ApiResult<void>>(`/cron-job/${id}`)
  if (res.code !== 200) {
    throw new Error(res.message || '删除定时任务失败')
  }
}

/** 启用：PUT /cron-job/{id}/enable */
export async function enableCronJob(id: number): Promise<void> {
  const res = await request.put<unknown, ApiResult<void>>(`/cron-job/${id}/enable`)
  if (res.code !== 200) {
    throw new Error(res.message || '启用定时任务失败')
  }
}

/** 停用：PUT /cron-job/{id}/disable */
export async function disableCronJob(id: number): Promise<void> {
  const res = await request.put<unknown, ApiResult<void>>(`/cron-job/${id}/disable`)
  if (res.code !== 200) {
    throw new Error(res.message || '停用定时任务失败')
  }
}

/** 手动触发：POST /cron-job/{id}/trigger，返回本次执行的日志ID */
export async function triggerCronJob(id: number): Promise<number> {
  const res = await request.post<unknown, ApiResult<number>>(`/cron-job/${id}/trigger`)
  if (res.code !== 200 || res.data === undefined || res.data === null) {
    throw new Error(res.message || '触发定时任务失败')
  }
  return res.data
}

/** 预览 CRON 表达式下一次触发时间：GET /cron-job/next-fire-time */
export async function previewNextFireTime(cronExpr: string): Promise<string | null> {
  const res = await request.get<unknown, ApiResult<string | null>>('/cron-job/next-fire-time', {
    params: { cronExpr },
  })
  if (res.code !== 200) {
    throw new Error(res.message || 'CRON表达式解析失败')
  }
  return res.data ?? null
}

// ==================== 执行日志接口函数 ====================

/** 执行日志分页查询：GET /cron-job/log/page */
export async function pageCronJobLog(query: CronJobLogQuery): Promise<PageResult<CronJobLog>> {
  const res = await request.get<unknown, ApiResult<PageResult<CronJobLog>>>('/cron-job/log/page', { params: query })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '执行日志列表获取失败')
  }
  return res.data
}

/** 执行日志详情：GET /cron-job/log/{id} */
export async function getCronJobLog(id: number): Promise<CronJobLog> {
  const res = await request.get<unknown, ApiResult<CronJobLog>>(`/cron-job/log/${id}`)
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '执行日志详情获取失败')
  }
  return res.data
}

/** 停止执行：POST /cron-job/log/{id}/stop，返回该记录当时是否处于执行中（true 表示确实触发了停止流程） */
export async function stopCronJobLog(id: number): Promise<boolean> {
  const res = await request.post<unknown, ApiResult<boolean>>(`/cron-job/log/${id}/stop`)
  if (res.code !== 200) {
    throw new Error(res.message || '停止任务失败')
  }
  return !!res.data
}
