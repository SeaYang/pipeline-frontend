import dagre from '@dagrejs/dagre'
import type { Edge, Node } from '@vue-flow/core'
import type {
  ArgoDagTask,
  ArgoTemplateRef,
  ArgoWorkflowDetail,
  ArgoWorkflowNode,
} from '@/api/argo'
import { formatDuration } from '@/utils/time'

/**
 * 把「运行中的 Argo Workflow」转换成 VueFlow 可渲染的节点与边。
 *
 * 节点全集来自 status.storedWorkflowTemplateSpec.templates 中入口模板的 dag.tasks（提交时的静态
 * DAG 定义），而非 status.nodes——后者在运行过程中是增量出现的（跑到哪个节点才有哪个节点的记录，
 * Argo 官方 UI 也是这个现象）。这样任何时刻节点数都固定不变，只是每个节点的状态（phase）随
 * status.nodes 里对应运行实例的更新而变化；尚未产生运行实例的节点状态展示为自定义的 Waiting（未开始）。
 */

/** 流水线节点携带的展示数据 */
export interface PipelineNodeData {
  /** 节点名（displayName） */
  label: string
  /** 节点运行状态（Argo phase，未执行为自定义的 Waiting） */
  phase?: string
  /** 节点类型（Pod/Retry/Suspend…） */
  type?: string
  /** 进度，如 1/1 */
  progress?: string
  /** 耗时（已格式化） */
  duration?: string
  /** 开始时间 */
  startedAt?: string
  /** 结束时间 */
  finishedAt?: string
  /** 运行节点 */
  hostNodeName?: string
  /** 引用的模板名 */
  templateName?: string
  /** 引用模板的 resource name（templateRef.name） */
  templateRefName?: string
  /** 节点信息/错误信息 */
  message?: string
  /** 是否已产生运行实例（控制“查看日志”等仅运行后才可用的操作） */
  hasRun: boolean
}

/** 合并「静态 DAG 任务定义」与「运行时节点状态」后的任务节点，节点全集且 taskName 稳定不变 */
export interface ArgoTaskNode {
  /** 任务名，同时作为 VueFlow 节点 id */
  taskName: string
  displayName: string
  /** Argo phase；尚未产生运行实例时为自定义的 Waiting */
  phase: string
  type?: string
  progress?: string
  startedAt?: string
  finishedAt?: string
  hostNodeName?: string
  templateRef?: ArgoTemplateRef
  message?: string
  /** 运行时节点 id（构造 pod name 需要），未执行时为 undefined */
  runtimeId?: string
  /** 是否已产生运行实例 */
  hasRun: boolean
  /** 入参（运行时） */
  inputs?: { parameters?: ArgoParameter[] }
  /** 出参（运行时） */
  outputs?: { parameters?: ArgoParameter[]; exitCode?: string }
}

const NODE_W = 200
const NODE_H = 96

/** 未开始节点的自定义状态值（非 Argo 原生 phase） */
export const WAITING_PHASE = 'Waiting'

/** 取入口模板（含 dag.tasks 的静态定义） */
function getEntrypointTasks(detail: ArgoWorkflowDetail): ArgoDagTask[] {
  const spec = detail.status?.storedWorkflowTemplateSpec
  const entrypoint = spec?.entrypoint ?? detail.spec?.entrypoint ?? 'main'
  const templates = spec?.templates ?? []
  const mainTemplate = templates.find((t) => t.name === entrypoint) ?? templates[0]
  return mainTemplate?.dag?.tasks ?? []
}

/** 运行时任务节点（排除 DAG/Steps 根节点），按「任务名」建索引 */
function getRuntimeByTaskName(detail: ArgoWorkflowDetail): Map<string, ArgoWorkflowNode> {
  const wfName = detail.metadata?.name ?? ''
  const prefix = `${wfName}.`
  const map = new Map<string, ArgoWorkflowNode>()
  for (const n of Object.values(detail.status?.nodes ?? {})) {
    if (n.type === 'DAG' || n.type === 'Steps') continue
    const taskName = n.name.startsWith(prefix) ? n.name.slice(prefix.length) : n.name
    map.set(taskName, n)
  }
  return map
}

/**
 * 合并静态 DAG 任务定义与运行时状态，得到「节点全集」（节点数固定，不随运行进度变化）。
 * 若静态定义缺失（异常/兼容旧数据），退回按运行时节点渲染。
 */
export function buildTaskNodes(detail: ArgoWorkflowDetail): ArgoTaskNode[] {
  const tasks = getEntrypointTasks(detail)
  const runtimeByTaskName = getRuntimeByTaskName(detail)

  if (tasks.length === 0) {
    return Array.from(runtimeByTaskName.values()).map((n) => ({
      taskName: n.id,
      displayName: n.displayName || n.name,
      phase: n.phase ?? WAITING_PHASE,
      type: n.type,
      progress: n.progress,
      startedAt: n.startedAt,
      finishedAt: n.finishedAt,
      hostNodeName: n.hostNodeName,
      templateRef: n.templateRef,
      message: n.message,
      runtimeId: n.id,
      hasRun: true,
      inputs: n.inputs,
      outputs: n.outputs,
    }))
  }

  return tasks.map((task) => {
    const runtime = runtimeByTaskName.get(task.name)
    return {
      taskName: task.name,
      displayName: runtime?.displayName || task.name,
      phase: runtime?.phase ?? WAITING_PHASE,
      type: runtime?.type ?? task.templateRef?.template,
      progress: runtime?.progress,
      startedAt: runtime?.startedAt,
      finishedAt: runtime?.finishedAt,
      hostNodeName: runtime?.hostNodeName,
      templateRef: task.templateRef,
      message: runtime?.message,
      runtimeId: runtime?.id,
      hasRun: !!runtime,
      inputs: runtime?.inputs,
      outputs: runtime?.outputs,
    }
  })
}

/** 解析 depends 表达式（如 "a && b.Succeeded"）为纯任务名列表，忽略 &&/||/! 与条件后缀 */
function parseDependsTaskNames(depends?: string): string[] {
  if (!depends) return []
  return depends
    .replace(/[()]/g, ' ')
    .split(/&&|\|\|/)
    .map((s) => s.trim().replace(/^!/, '').split('.')[0]?.trim())
    .filter((s): s is string => !!s)
}

/** 构建任务间的依赖边；静态 DAG 定义缺失时退回按运行时节点 children 连边 */
function buildEdges(detail: ArgoWorkflowDetail, taskNodes: ArgoTaskNode[]): Edge[] {
  const tasks = getEntrypointTasks(detail)
  const phaseByTaskName = new Map(taskNodes.map((t) => [t.taskName, t.phase]))
  const idSet = new Set(taskNodes.map((t) => t.taskName))

  if (tasks.length > 0) {
    const edges: Edge[] = []
    for (const task of tasks) {
      if (!idSet.has(task.name)) continue
      for (const dep of parseDependsTaskNames(task.depends)) {
        if (!idSet.has(dep)) continue
        edges.push({
          id: `e-${dep}-${task.name}`,
          source: dep,
          target: task.name,
          type: 'smoothstep',
          animated: phaseByTaskName.get(task.name) === 'Running',
        })
      }
    }
    return edges
  }

  // 退回：按运行时节点 children 连边（taskName 此时即运行时节点 id）
  const runtimeNodes = Object.values(detail.status?.nodes ?? {}).filter(
    (n) => n.type !== 'DAG' && n.type !== 'Steps',
  )
  const edges: Edge[] = []
  for (const n of runtimeNodes) {
    for (const childId of n.children ?? []) {
      if (idSet.has(childId) && idSet.has(n.id)) {
        edges.push({
          id: `e-${n.id}-${childId}`,
          source: n.id,
          target: childId,
          type: 'smoothstep',
          animated: phaseByTaskName.get(childId) === 'Running',
        })
      }
    }
  }
  return edges
}

/**
 * 将 Argo Workflow 详情转为 VueFlow 的 nodes/edges（含 dagre 自动布局）。
 * - 节点全集来自静态 DAG 任务定义，节点数量固定不随运行进度变化
 * - 边由静态 DAG 的 depends 依赖构成
 * - 布局方向：从左到右（LR）
 *
 * @param detail           Argo Workflow 详情
 * @param taskCodeNameMap  任务编码→中文名映射，提供时节点 label 优先使用中文名
 */
export function workflowToFlow(
  detail: ArgoWorkflowDetail,
  taskCodeNameMap?: Record<string, string>,
): {
  nodes: Node<PipelineNodeData>[]
  edges: Edge[]
} {
  const taskNodes = buildTaskNodes(detail)
  // 如果提供了中文名映射，覆盖 displayName
  if (taskCodeNameMap) {
    for (const t of taskNodes) {
      if (taskCodeNameMap[t.taskName]) {
        t.displayName = taskCodeNameMap[t.taskName]
      }
    }
  }
  const nodes: Node<PipelineNodeData>[] = taskNodes.map(toFlowNode)
  const edges = buildEdges(detail, taskNodes)

  // dagre 自动布局
  const g = new dagre.graphlib.Graph()
  g.setDefaultEdgeLabel(() => ({}))
  g.setGraph({ rankdir: 'LR', nodesep: 40, ranksep: 90, marginx: 20, marginy: 20 })
  nodes.forEach((n) => g.setNode(n.id, { width: NODE_W, height: NODE_H }))
  edges.forEach((e) => g.setEdge(e.source, e.target))
  dagre.layout(g)
  nodes.forEach((n) => {
    const pos = g.node(n.id)
    if (pos) n.position = { x: pos.x - NODE_W / 2, y: pos.y - NODE_H / 2 }
  })

  return { nodes, edges }
}

function toFlowNode(t: ArgoTaskNode): Node<PipelineNodeData> {
  return {
    id: t.taskName,
    type: 'pipeline',
    position: { x: 0, y: 0 },
    data: {
      label: t.displayName,
      phase: t.phase,
      type: t.type,
      progress: t.progress,
      duration: formatDuration(t.startedAt, t.finishedAt),
      startedAt: t.startedAt,
      finishedAt: t.finishedAt,
      hostNodeName: t.hostNodeName,
      templateName: t.templateRef?.template,
      templateRefName: t.templateRef?.name,
      message: t.message,
      hasRun: t.hasRun,
    },
  }
}

/**
 * 按 Argo Workflows pod-name-format v2 规则推算 Pod 名。
 *
 * 规则：<workflow名>-<templateRef.template 或 templateName>-<nodeID去掉workflow名前缀的hash>
 * 例：wfName=go-cicd-pipeline-vwkvf、node.id=go-cicd-pipeline-vwkvf-3348853539、
 *     node.templateRef.template=entrypoint → go-cicd-pipeline-vwkvf-entrypoint-3348853539
 *
 * 注意：Argo 的 hash 由 workflow-controller 用 FNV 生成，前端无法复算，
 * 只能从 node.id（= <wfName>-<hash>）反截得到。v1 格式下 pod 名等于 node.id，
 * 此函数仅适用于 v2（见 metadata.annotations['workflows.argoproj.io/pod-name-format']）。
 */
export function buildPodName(
  wfName: string,
  node: Pick<ArgoWorkflowNode, 'id' | 'templateRef' | 'templateName'>,
): string {
  const tpl = node.templateRef?.template ?? node.templateName ?? ''
  const prefix = `${wfName}-`
  const hash = node.id.startsWith(prefix) ? node.id.slice(prefix.length) : node.id
  return `${wfName}-${tpl}-${hash}`
}

