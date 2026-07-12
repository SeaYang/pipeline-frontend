import axios from 'axios'
import router from '@/router'
import { getAccount } from '@/utils/auth'

/**
 * 全局 axios 实例。
 *
 * baseURL 默认为 /api，开发期由 vite.config.ts 的 server.proxy 转发到本地后端
 * （http://localhost:9000），从而规避浏览器跨域。生产环境可通过 VITE_API_BASE_URL
 * 指向后端网关地址。
 */
const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 30000,
})

// 请求拦截：固定带上当前登录账号（x-user-id）；拿不到账号则兜底跳登录页。
// 直接读 localStorage（经 auth.ts），不引入 Pinia 实例，避免循环依赖。
request.interceptors.request.use((config) => {
  const account = getAccount()
  if (account) {
    config.headers['x-user-id'] = account
  } else if (!config.url?.startsWith('/public')) {
    // 理论上路由守卫已拦截未登录场景；这里做一层防御性兜底。
    router.replace({ name: 'login' })
  }
  return config
})

// 响应拦截：直接返回后端统一封装体 Result<T>（{ code, message, data }）
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('[request error]', error)
    return Promise.reject(error)
  },
)

export default request
