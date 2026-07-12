import { ref } from 'vue'
import { defineStore } from 'pinia'
import { clearAccount, getAccount, setAccount } from '@/utils/auth'

/**
 * 用户（登录态）store。
 *
 * account 初始值即从 localStorage 读取，保证刷新页面后仍保持登录态；
 * login/logout 同步更新 localStorage，保证请求拦截器（直接读 localStorage）
 * 与组件（读 store.account）始终一致。
 */
export const useUserStore = defineStore('user', () => {
  const account = ref<string | null>(getAccount())

  /** 登录：写入账号 */
  function login(name: string) {
    setAccount(name)
    account.value = name
  }

  /** 退出登录：清除账号 */
  function logout() {
    clearAccount()
    account.value = null
  }

  return { account, login, logout }
})
