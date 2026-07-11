import axios from 'axios'

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

// 响应拦截：直接返回后端统一封装体 Result<T>（{ code, message, data }）
request.interceptors.response.use(
  (response) => response.data,
  (error) => {
    console.error('[request error]', error)
    return Promise.reject(error)
  },
)

export default request
