import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'
import type { PageResult } from '@/api/dict'

/** 制品类型 */
export type ArtifactType = 'RAW' | 'IMAGE'

/** 制品信息（对应后端 ArtifactResponse） */
export interface Artifact {
  id?: number
  appName: string
  name: string
  type: ArtifactType
  gitBranch?: string
  commitId?: string
  env?: string
  buildTime?: string
  buildUser?: string
  pipelineRunId?: number
  pipelineRunName?: string
  artifactRepository?: string
  artifactRepositoryPath?: string
  artifactUrl?: string
  size?: number
  sha256?: string
  createTime?: string
  updateTime?: string
}

/** 制品分页查询条件 */
export interface ArtifactQuery {
  appName?: string
  name?: string
  gitBranch?: string
  env?: string
  type?: ArtifactType
  sortField?: string
  sortOrder?: 'asc' | 'desc'
  pageNum: number
  pageSize: number
}

/** 分页查询制品列表：GET /artifact/page */
export async function pageArtifact(query: ArtifactQuery): Promise<PageResult<Artifact>> {
  const res = await request.get<unknown, ApiResult<PageResult<Artifact>>>('/artifact/page', {
    params: query,
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '制品列表获取失败')
  }
  return res.data
}

/** 根据流水线运行名称查询制品列表：GET /artifact/list-by-run/:pipelineRunName */
export async function listArtifactByRun(pipelineRunName: string): Promise<Artifact[]> {
  const res = await request.get<unknown, ApiResult<Artifact[]>>(
    `/artifact/list-by-run/${encodeURIComponent(pipelineRunName)}`,
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '制品信息获取失败')
  }
  return res.data
}
