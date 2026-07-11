import request from '@/utils/request'

/** 后端统一返回结果封装 Result<T> */
export interface ApiResult<T> {
  code: number
  message: string
  data: T
}

/**
 * 查询 Pod 日志时使用的默认命名空间。
 * 与后端 argo.server.namespace 保持一致（默认 argo），可通过 VITE_K8S_NAMESPACE 覆盖。
 */
const DEFAULT_NAMESPACE = import.meta.env.VITE_K8S_NAMESPACE ?? 'argo'

/**
 * 获取 Pod 日志（对应后端 DemoController#getPodLog）。
 *
 * 后端签名同时要求 namespace 与 podName；前端调用方只需提供 podName，
 * namespace 取默认值。如需指定其它命名空间，调整上面的 DEFAULT_NAMESPACE 或
 * 给本函数再加一个可选参数即可。
 *
 * @param podName Pod 名称（当前用 DAG 节点任务名兜底，如 "git-sync"）
 */
export function getPodLog(podName: string) {
  return request.get<unknown, ApiResult<string>>('/demo/pod/log', {
    params: {
      namespace: DEFAULT_NAMESPACE,
      podName,
    },
  })
}
