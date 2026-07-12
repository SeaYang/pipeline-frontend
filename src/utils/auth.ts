/**
 * 账号信息的持久化入口（mock 登录态）。
 *
 * 仅存「小写英文字母账号」字符串到 localStorage，作为登录态的唯一数据源。
 * Pinia store（src/stores/user.ts）与请求拦截器（src/utils/request.ts）都通过
 * 本模块读写，避免循环依赖与状态不一致。
 *
 * 注意：这是纯 mock，没有任何 token / 密码 / 过期时间，退出登录即清除该 key。
 */

/** localStorage 中存储账号的 key */
export const ACCOUNT_KEY = 'pipeline_user_account'

/** 读取当前登录账号，未登录返回 null */
export function getAccount(): string | null {
  return localStorage.getItem(ACCOUNT_KEY)
}

/** 登录成功后写入账号 */
export function setAccount(account: string): void {
  localStorage.setItem(ACCOUNT_KEY, account)
}

/** 退出登录：清除账号 */
export function clearAccount(): void {
  localStorage.removeItem(ACCOUNT_KEY)
}

/** 账号校验：仅允许小写英文字母 */
export const ACCOUNT_PATTERN = /^[a-z]+$/

/** 判断是否为合法账号（小写英文字母） */
export function isValidAccount(value: string): boolean {
  return ACCOUNT_PATTERN.test(value)
}
