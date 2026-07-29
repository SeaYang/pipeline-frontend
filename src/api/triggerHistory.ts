import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'
import type { PageResult } from '@/api/dict'

// ============ 触发历史 ============

/** 触发历史记录（对应后端 PipelineTriggerHistoryResponse） */
export interface PipelineTriggerHistory {
  id: number
  appName: string
  pipelineId: number
  /** 流水线执行记录id；触发失败时为 null */
  pipelineRunId?: number
  /** 事件绑定记录id；手动触发为 0 */
  pipelineEventBindId: number
  /** 触发状态：SUCCESS / FAILED */
  status: string
  /** 触发类型：手动触发为 user，事件触发为 eventType */
  type: string
  creator: string
  /** 触发请求的请求体（JSON 字符串） */
  requestBody?: string
  /** 触发失败时的错误信息 */
  errorMessage?: string
  pipelineTemplateCode: string
  pipelineTemplateVersion?: string
  createTime?: string
}

/** 触发历史分页查询条件（对应后端 PipelineTriggerHistoryQueryRequest） */
export interface PipelineTriggerHistoryQuery {
  pipelineId?: number
  appName?: string
  status?: string
  type?: string
  pageNum: number
  pageSize: number
}

/** 触发状态 → el-tag 类型 */
export function triggerHistoryStatusTagType(status?: string) {
  switch (status) {
    case 'SUCCESS':
      return 'success'
    case 'FAILED':
      return 'danger'
    default:
      return 'info'
  }
}

/** 分页查询触发历史：GET /pipeline/trigger-history/page */
export async function pageTriggerHistory(
  query: PipelineTriggerHistoryQuery,
): Promise<PageResult<PipelineTriggerHistory>> {
  const res = await request.get<unknown, ApiResult<PageResult<PipelineTriggerHistory>>>(
    '/pipeline/trigger-history/page',
    { params: query },
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '触发历史获取失败')
  }
  return res.data
}

/** 查询触发历史详情：GET /pipeline/trigger-history/{id} */
export async function getTriggerHistory(id: number): Promise<PipelineTriggerHistory> {
  const res = await request.get<unknown, ApiResult<PipelineTriggerHistory>>(
    `/pipeline/trigger-history/${id}`,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '触发历史详情获取失败')
  }
  return res.data
}
