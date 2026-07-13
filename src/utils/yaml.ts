import { load as yamlLoad, dump as yamlDump } from 'js-yaml'

/** 文本格式：yaml 或 json */
export type TextFormat = 'yaml' | 'json'

/** 把文本按指定格式解析为对象；解析失败抛错 */
function parseObject(text: string, fmt: TextFormat): unknown {
  const trimmed = text.trim()
  if (fmt === 'json') {
    return JSON.parse(trimmed)
  }
  return yamlLoad(trimmed)
}

/** 把对象序列化为指定格式字符串 */
function dumpObject(obj: unknown, fmt: TextFormat): string {
  if (fmt === 'json') {
    return JSON.stringify(obj, null, 2)
  }
  return yamlDump(obj, { indent: 2, lineWidth: 120 })
}

/**
 * 把文本从一种格式转换为另一种格式（先解析为对象再序列化）。
 * 解析失败时抛错，调用方可据此回滚切换并提示用户。
 */
export function convertFormat(text: string, from: TextFormat, to: TextFormat): string {
  if (from === to) return text
  return dumpObject(parseObject(text, from), to)
}

/**
 * 猜测文本格式：能 JSON.parse 且首字符为 `{` 或 `[` 视作 JSON，否则视作 YAML。
 * 用于加载版本详情时自动设定编辑器语言。
 */
export function detectFormat(text?: string | null): TextFormat {
  if (!text) return 'yaml'
  const trimmed = text.trim()
  if (!trimmed) return 'yaml'
  const head = trimmed[0]
  if (head === '{' || head === '[') {
    try {
      JSON.parse(trimmed)
      return 'json'
    } catch {
      return 'yaml'
    }
  }
  return 'yaml'
}

/** 仅校验文本在指定格式下是否合法，合法返回 null，否则返回错误信息 */
export function validateFormat(text: string, fmt: TextFormat): string | null {
  try {
    parseObject(text, fmt)
    return null
  } catch (e) {
    return (e as Error)?.message || '格式不合法'
  }
}
