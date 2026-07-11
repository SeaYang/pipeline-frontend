/**
 * 时间相关格式化工具，用于流水线列表的展示。
 */

/**
 * 将 ISO 时间字符串格式化为「YYYY-MM-DD HH:mm:ss」。
 * 非法或空输入返回 '-'。
 */
export function formatDateTime(iso?: string | null): string {
  if (!iso) return '-'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  )
}

/**
 * 把毫秒数格式化为最多两位有效单位的可读时长，如「1d2h」「1h2m」「2m10s」「5s」。
 */
function humanizeDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '-'
  const totalSec = Math.floor(ms / 1000)
  const days = Math.floor(totalSec / 86400)
  const hours = Math.floor((totalSec % 86400) / 3600)
  const minutes = Math.floor((totalSec % 3600) / 60)
  const seconds = totalSec % 60
  if (days > 0) return `${days}d${hours}h`
  if (hours > 0) return `${hours}h${minutes}m`
  if (minutes > 0) return `${minutes}m${seconds}s`
  return `${seconds}s`
}

/**
 * 两个 ISO 时间之间的耗时，如「1h2m」。
 * 任一缺失或非法时返回 '-'（例如仍在运行、尚未结束）。
 */
export function formatDuration(startIso?: string | null, endIso?: string | null): string {
  if (!startIso || !endIso) return '-'
  const start = new Date(startIso).getTime()
  const end = new Date(endIso).getTime()
  if (Number.isNaN(start) || Number.isNaN(end)) return '-'
  return humanizeDuration(end - start)
}

/**
 * 距当前时间的相对描述，如「1h2m ago」。
 * 未来时间或非法输入返回空串（便于在模板中按需展示）。
 */
export function formatRelative(iso?: string | null): string {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return ''
  const diff = Date.now() - t
  if (diff < 1000) return 'just now'
  return `${humanizeDuration(diff)} ago`
}
