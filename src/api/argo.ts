import request from '@/utils/request'
import type { ApiResult } from '@/api/demo'

// ============ 类型（仅取列表展示所需字段） ============

export interface ArgoWorkflowMetadata {
  name: string
  namespace: string
  uid: string
  creationTimestamp?: string
  labels?: Record<string, string>
  annotations?: Record<string, string>
}

export interface ArgoWorkflowStatus {
  phase?: string
  message?: string
  startedAt?: string
  finishedAt?: string
  estimatedDuration?: number
  progress?: string
}

export interface ArgoWorkflowItem {
  metadata: ArgoWorkflowMetadata
  status?: ArgoWorkflowStatus
  spec?: Record<string, unknown>
}

export interface ArgoWorkflowList {
  metadata?: { resourceVersion?: string }
  items: ArgoWorkflowItem[]
}

// ============ 流水线详情（单个 Workflow 完整 CRD） ============

export interface ArgoParameter {
  name: string
  value?: string
  default?: string
  description?: string
  valueFrom?: { path: string }
}

export interface ArgoTemplateRef {
  name: string
  template: string
  clusterScope?: boolean
}

/** 单个节点（任务运行实例）的运行状态 */
export interface ArgoWorkflowNode {
  id: string
  name: string
  displayName?: string
  type?: string
  templateName?: string
  templateRef?: ArgoTemplateRef
  templateScope?: string
  phase?: string
  message?: string
  boundaryID?: string
  startedAt?: string
  finishedAt?: string
  estimatedDuration?: number
  progress?: string
  resourcesDuration?: Record<string, number>
  children?: string[]
  outboundNodes?: string[]
  inputs?: { parameters?: ArgoParameter[] }
  outputs?: { parameters?: ArgoParameter[]; exitCode?: string; result?: string }
  hostNodeName?: string
}

/** DAG 中的一个任务定义（模板级静态定义，与运行时节点一一对应，name 稳定不变） */
export interface ArgoDagTask {
  name: string
  /** 依赖表达式，如 "git-sync" 或 "a && b"（可能带 .Succeeded 等条件后缀） */
  depends?: string
  templateRef?: ArgoTemplateRef
  arguments?: { parameters?: ArgoParameter[] }
}

/** 模板定义（这里只关心含 dag.tasks 的入口模板） */
export interface ArgoTemplateDef {
  name: string
  dag?: { tasks: ArgoDagTask[] }
}

/** 流水线详情：对应 GET /api/v1/workflows/argo/{name} 的完整 Workflow 资源 */
export interface ArgoWorkflowDetail {
  metadata: {
    name: string
    namespace: string
    uid?: string
    creationTimestamp?: string
    resourceVersion?: string
    generation?: number
    labels?: Record<string, string>
    annotations?: Record<string, string>
  }
  spec?: {
    entrypoint?: string
    arguments?: { parameters?: ArgoParameter[] }
    workflowTemplateRef?: { name?: string; clusterScope?: boolean }
  }
  status?: {
    phase?: string
    message?: string
    startedAt?: string
    finishedAt?: string
    estimatedDuration?: number
    progress?: string
    /** DAG 中每个任务运行实例，key 为节点 id */
    nodes?: Record<string, ArgoWorkflowNode>
    /** 运行时归档的任务模板（含 script 源码等），key 形如 namespaced/<tpl>/<entrypoint> */
    storedTemplates?: Record<string, unknown>
    /** 提交时的 WorkflowTemplate 模板定义（含 DAG tasks 与 depends 依赖，节点全集的权威来源） */
    storedWorkflowTemplateSpec?: {
      entrypoint?: string
      templates?: ArgoTemplateDef[]
    }
  }
}

/**
 * 拉取 go-cicd-pipeline 模板下的流水线运行列表。
 * 走 Java 后端 DemoController#getWorkflowList：GET /demo/workflow/list，
 * labelSelector / limit / fields 均由后端写死，这里仅解包 Result<T>.data；
 * code !== 200 时抛错，由调用方 catch 统一提示。
 */
export async function listWorkflows(): Promise<ArgoWorkflowList> {
  const res = await request.get<unknown, ApiResult<ArgoWorkflowList>>('/demo/workflow/list')
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '流水线列表获取失败')
  }
  return res.data
}

/**
 * 拉取单个流水线的运行详情（完整 Workflow CRD）。
 * 走 Java 后端 DemoController#getWorkflow：GET /demo/workflow/get?name={name}，
 * 返回体为统一封装 Result<Workflow>（{ code, message, data }），这里解包取 data；
 * code !== 200 时抛错，由调用方 catch 统一提示。
 *
 * @param name Workflow 名称，如 go-cicd-pipeline-vwkvf
 */
export async function getWorkflowDetail(name: string): Promise<ArgoWorkflowDetail> {
  const res = await request.get<unknown, ApiResult<ArgoWorkflowDetail>>('/demo/workflow/get', {
    params: { name },
  })
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '流水线详情获取失败')
  }
  return res.data
}

/** 执行详情响应：Argo Workflow 实时数据 + 任务编码→中文名映射 */
export interface PipelineRunExecuteDetail {
  /** Argo Workflow 实时详情（结构同 ArgoWorkflowDetail） */
  argoDetail: ArgoWorkflowDetail
  /** 任务节点编码 → 中文名 映射 */
  taskCodeNameMap: Record<string, string>
}

/**
 * 拉取流水线执行详情（Argo Workflow 实时数据 + 任务编码→中文名映射）。
 * 走 Java 后端 PipelineRunController#executeDetail：GET /pipeline-run/execute-detail?pipelineRunName={name}
 */
export async function getExecuteDetail(pipelineRunName: string): Promise<PipelineRunExecuteDetail> {
  const res = await request.get<unknown, ApiResult<PipelineRunExecuteDetail>>(
    '/pipeline-run/execute-detail',
    { params: { pipelineRunName } },
  )
  if (res.code !== 200 || !res.data) {
    throw new Error(res.message || '流水线执行详情获取失败')
  }
  return res.data
}

// ============ SSE 执行详情 ============

/** SSE 推送的执行详情 DTO（和后端 PipelineRunDetailDTO 对应） */
export interface PipelineRunDetailDTO {
  pipelineRunName: string
  /** 流水线执行记录主键 id */
  pipelineRunId?: number
  status: string
  startedAt?: string
  finishedAt?: string
  duration?: number
  failMessage?: string
  /** 服务 appName */
  appName?: string
  /** 流水线模板编码 */
  pipelineTemplateCode?: string
  /** 流水线模板名称 */
  pipelineTemplateName?: string
  /** 执行人 */
  creator?: string
  /** 流水线名称 */
  pipelineName?: string
  /** 运行参数 JSON 字符串 */
  arguments?: string
  /** VueFlow 渲染数据（结构兼容 ArgoWorkflowDetail） */
  workflowDetail: ArgoWorkflowDetail
  /** 任务编码→中文名 */
  taskCodeNameMap: Record<string, string>
}

/**
 * 获取任务节点日志。
 * 非终态调 k8s 实时获取，终态从 pipeline_task_run.log_content 取。
 *
 * @param pipelineRunName 流水线执行名称
 * @param taskCode        任务节点编码
 */
export async function getTaskLog(pipelineRunName: string, taskCode: string): Promise<string> {
  const res = await request.get<unknown, ApiResult<string>>(
    `/pipeline-run/task-log`,
    { params: { pipelineRunName, taskCode } },
  )
  if (res.code !== 200) {
    throw new Error(res.message || '获取日志失败')
  }
  return res.data || '（暂无日志）'
}
