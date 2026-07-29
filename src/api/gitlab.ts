import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'

/** GitLab 分支信息（对应后端 GitBranchResponse） */
export interface GitBranch {
  /** 分支名 */
  name: string
  /** 最近 commit SHA */
  commitId?: string
  /** 最近 commit message */
  commitMessage?: string
  /** commit 作者 */
  authorName?: string
  /** commit 时间 */
  committedDate?: string
}

/** GitLab 目录树节点（对应后端 GitTreeNodeResponse） */
export interface GitTreeNode {
  /** 文件/目录名 */
  name: string
  /** 完整路径 */
  path: string
  /** tree(目录) / blob(文件) */
  type: string
  /** 文件模式 */
  mode: string
}

/** 查询仓库分支列表：GET /gitlab/branches */
export async function listGitBranches(appName: string): Promise<GitBranch[]> {
  const res = await request.get<unknown, ApiResult<GitBranch[]>>(
    '/gitlab/branches',
    { params: { appName } },
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '获取分支列表失败')
  }
  return res.data
}

/** 查询仓库目录树（懒加载单层）：GET /gitlab/tree */
export async function listGitTree(appName: string, path?: string): Promise<GitTreeNode[]> {
  const res = await request.get<unknown, ApiResult<GitTreeNode[]>>(
    '/gitlab/tree',
    { params: { appName, path: path || '' } },
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '获取目录树失败')
  }
  return res.data
}
