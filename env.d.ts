/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** axios 实例的 baseURL，默认 /api（由 vite 代理转发到后端） */
  readonly VITE_API_BASE_URL?: string
  /** 查询 Pod 日志时使用的默认命名空间，默认 argo（与后端 argo.server.namespace 一致） */
  readonly VITE_K8S_NAMESPACE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
