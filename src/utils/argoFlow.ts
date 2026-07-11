import type { Edge, Node } from '@vue-flow/core'

// ============ Argo Workflows 轻量类型（仅取渲染所需字段）============

export interface ArgoParameter {
  name: string
  value?: string | null
  default?: string | null
  description?: string | null
}

export interface ArgoTemplateRef {
  name?: string | null
  template?: string | null
  clusterScope?: boolean | null
}

export interface ArgoTask {
  name: string
  /** 旧版依赖写法：字符串数组 */
  dependencies?: string[] | null
  /** 新版依赖写法：表达式字符串，如 "A.Succeeded && B.Succeeded" */
  depends?: string | null
  /** 直接引用本 workflow 内的同名模板 */
  template?: string | null
  /** 引用已发布的 WorkflowTemplate */
  templateRef?: ArgoTemplateRef | null
  inline?: unknown
  when?: string | null
  arguments?: { parameters?: ArgoParameter[] | null } | null
}

export interface ArgoDag {
  tasks: ArgoTask[]
  target?: string | null
  failFast?: boolean | null
}

export interface ArgoTemplate {
  name: string
  dag?: ArgoDag | null
  steps?: unknown
  script?: { image?: string | null } | null
  container?: { image?: string | null } | null
}

export interface ArgoWorkflow {
  apiVersion?: string | null
  kind?: string | null
  metadata?: {
    name?: string
    namespace?: string
    annotations?: Record<string, string> | null
  } | null
  spec?: {
    entrypoint?: string | null
    templates?: ArgoTemplate[] | null
    arguments?: { parameters?: ArgoParameter[] | null } | null
  } | null
}

// ============ Vue Flow 渲染类型 ============

export type ArgoRefKind =
  | 'templateRef'
  | 'template'
  | 'inline'
  | 'script'
  | 'container'
  | 'dag'
  | 'unknown'

/** 自定义节点携带的数据 */
export interface ArgoNodeData {
  label: string
  /** 引用的子模板名（templateRef.name 或 template） */
  templateName: string
  /** 引用方式 */
  refKind: ArgoRefKind
  /** 入参数量 */
  paramCount: number
  /** 直接依赖数量 */
  depCount: number
  /** when 条件（若有） */
  when?: string | null
  /** 所在列（从 0 开始，用于排序/展示） */
  layer: number
}

export interface ArgoFlowResult {
  nodes: Node<ArgoNodeData>[]
  edges: Edge[]
  meta: {
    name: string
    namespace?: string
    entrypoint: string
    entryTemplate: string
    description?: string
    taskCount: number
    edgeCount: number
    /** 命中兜底逻辑时给出说明，便于排查数据问题 */
    fallback?: string
  }
}

// ============ 工具函数 ============

/** 判断对象是否像一个 Argo Workflow（含 spec） */
function isWorkflow(x: unknown): x is ArgoWorkflow {
  return !!x && typeof x === 'object' && !!(x as ArgoWorkflow).spec
}

/**
 * 解析 `depends` 中引用的任务名。兼容 Argo 的两种写法：
 * - 裸任务名：`"git-sync"`、`"A && B"`、`"A,B"`
 * - 带修饰符的表达式：`"A.Succeeded && B.Failed"`、`"!C.Succeeded"`、`"(A || B) && C"`
 *
 * 做法：用运算符（&&、||、!）、括号、逗号与空白切成 token，再取每个 token 首个 `.` 之前的部分作为任务名。
 * 注意：不能用「标识符 + .」的正则去匹配，否则裸任务名（如 "git-sync"，无修饰符后缀）会被漏掉，导致整条链断成零依赖。
 */
function parseDepends(depends: string): string[] {
  const names = new Set<string>()
  const tokens = depends
    .split(/&&|\|\||[!(),\s]+/)
    .map((t) => t.trim())
    .filter(Boolean)
  for (const tok of tokens) {
    const name = tok.split('.')[0]!
    if (name) names.add(name)
  }
  return [...names]
}

/** 合并 dependencies + depends 得到某任务的全部直接依赖 */
function taskDependencies(task: ArgoTask): string[] {
  const deps = new Set<string>()
  for (const d of task.dependencies ?? []) if (d) deps.add(d)
  if (task.depends) for (const d of parseDepends(task.depends)) deps.add(d)
  return [...deps]
}

/** 最长路径分层布局（依赖无关、确定性），返回每个节点的层号与坐标 */
function layoutLayered(
  ids: string[],
  depMap: Map<string, string[]>,
): { layers: Map<string, number>; positions: Map<string, { x: number; y: number }> } {
  const layers = new Map<string, number>()
  const visiting = new Set<string>()
  const idSet = new Set(ids)

  const layerOf = (id: string): number => {
    if (layers.has(id)) return layers.get(id)!
    if (visiting.has(id)) return 0 // 环路兜底
    visiting.add(id)
    const deps = (depMap.get(id) ?? []).filter((d) => idSet.has(d) && d !== id)
    const l = deps.length ? Math.max(...deps.map(layerOf)) + 1 : 0
    layers.set(id, l)
    visiting.delete(id)
    return l
  }
  ids.forEach(layerOf)

  // 按层分列
  const columns = new Map<number, string[]>()
  for (const id of ids) {
    const l = layers.get(id)!
    const col = columns.get(l) ?? []
    col.push(id)
    columns.set(l, col)
  }

  // 计算坐标：x 由列决定（左→右），y 由列内顺序决定
  const positions = new Map<string, { x: number; y: number }>()
  const COL_W = 300
  const ROW_H = 120
  const PAD_X = 24
  const PAD_Y = 24

  for (const ci of [...columns.keys()].sort((a, b) => a - b)) {
    const col = columns.get(ci) ?? []
    // 列内按上游节点 y 的中位数排序，尽量减少连线交叉
    const medianY = (id: string): number => {
      const deps = (depMap.get(id) ?? []).filter((d) => positions.has(d))
      if (!deps.length) return 0
      const ys = deps.map((d) => positions.get(d)!.y).sort((a, b) => a - b)
      return ys[Math.floor(ys.length / 2)] ?? 0
    }
    col.sort((a, b) => medianY(a) - medianY(b))
    col.forEach((id, idx) => {
      positions.set(id, { x: PAD_X + ci * COL_W, y: PAD_Y + idx * ROW_H })
    })
  }

  return { layers, positions }
}

// ============ 主转换函数 ============

/**
 * 将 Argo Workflows 模板（Workflow / WorkflowTemplate）转换为 Vue Flow 的节点与连线。
 * - 自动剥去 { code, message, data } 外层包装。
 * - 读取 spec.entrypoint 指向的模板，取其 dag.tasks 作为节点。
 * - 边由每个 task 的 dependencies / depends 推导。
 * - 节点按最长路径分层，左→右排布。
 */
export function argoToFlow(raw: unknown): ArgoFlowResult {
  // 兼容 { code, message, data: workflow } 包装
  const root = raw as Record<string, unknown>
  const workflow: ArgoWorkflow = isWorkflow(root.data)
    ? (root.data as ArgoWorkflow)
    : isWorkflow(root)
      ? (root as ArgoWorkflow)
      : (root as ArgoWorkflow)

  const spec = workflow.spec ?? {}
  const templates = spec.templates ?? []
  const entryName = spec.entrypoint ?? templates[0]?.name ?? ''
  const entryTpl = templates.find((t) => t.name === entryName) ?? null

  let tasks: ArgoTask[] = []
  let fallback: string | undefined

  if (entryTpl?.dag?.tasks?.length) {
    tasks = entryTpl.dag.tasks
  } else if (entryTpl) {
    // 入口模板本身不是 DAG：退化为单节点呈现
    tasks = [{ name: entryTpl.name }]
    fallback = `入口模板「${entryTpl.name}」未包含 dag.tasks，按单节点呈现`
  } else if (templates.length) {
    const firstDag = templates.find((t) => !!t.dag?.tasks?.length)
    if (firstDag?.dag?.tasks) {
      tasks = firstDag.dag.tasks
      fallback = `未找到 entrypoint「${entryName}」，已使用首个 DAG 模板「${firstDag.name}」`
    } else {
      tasks = templates.map((t) => ({ name: t.name, template: t.name }))
      fallback = `未找到 DAG，已将全部模板（${templates.length} 个）作为节点呈现`
    }
  }

  // 依赖映射，并过滤掉指向不存在任务的悬空依赖
  const taskNameSet = new Set(tasks.map((t) => t.name))
  const depMap = new Map<string, string[]>()
  for (const t of tasks) {
    depMap.set(
      t.name,
      taskDependencies(t).filter((d) => taskNameSet.has(d) && d !== t.name),
    )
  }

  // 连线（smoothstep + 流动动画，左→右观感更好）
  const edges: Edge[] = []
  for (const t of tasks) {
    for (const dep of depMap.get(t.name) ?? []) {
      edges.push({
        id: `e-${dep}-${t.name}`,
        source: dep,
        target: t.name,
        type: 'smoothstep',
        animated: true,
      })
    }
  }

  // 分层与坐标（最长路径分层，左→右排布）
  const { layers, positions } = layoutLayered(
    tasks.map((t) => t.name),
    depMap,
  )

  const nodes: Node<ArgoNodeData>[] = tasks.map((t) => {
    const deps = depMap.get(t.name) ?? []
    const ref = t.templateRef ?? undefined
    const refKind: ArgoRefKind = ref?.name
      ? 'templateRef'
      : t.template
        ? 'template'
        : t.inline
          ? 'inline'
          : 'unknown'
    return {
      id: t.name,
      type: 'argo',
      position: positions.get(t.name) ?? { x: 0, y: 0 },
      data: {
        label: t.name,
        templateName: ref?.name ?? t.template ?? '',
        refKind,
        paramCount: t.arguments?.parameters?.length ?? 0,
        depCount: deps.length,
        when: t.when ?? null,
        layer: layers.get(t.name) ?? 0,
      },
    }
  })

  const description = workflow.metadata?.annotations?.['app.kubernetes.io/description'] ?? undefined

  return {
    nodes,
    edges,
    meta: {
      name: workflow.metadata?.name ?? entryName,
      namespace: workflow.metadata?.namespace,
      entrypoint: entryName,
      entryTemplate: entryTpl?.name ?? '',
      description,
      taskCount: tasks.length,
      edgeCount: edges.length,
      fallback,
    },
  }
}
