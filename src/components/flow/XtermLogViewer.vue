<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
// xterm 样式需全局注入（不能用 scoped）
import '@xterm/xterm/css/xterm.css'

const props = defineProps<{
  /** 要展示的日志文本 */
  content: string
}>()

const termHost = ref<HTMLElement | null>(null)

let term: Terminal | null = null
let fitAddon: FitAddon | null = null
let resizeObserver: ResizeObserver | null = null

// ANSI 颜色码（xterm 原生支持）
const RESET = '\x1b[0m'
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const GRAY = '\x1b[90m'

/**
 * 给日志逐行加一点颜色，更接近真实 CI 控制台：
 * - `Warning` 开头 → 黄色
 * - 含 `level=info` → 灰色（argo 噪声行）
 * - 含 `[Info]` / `完成` → 绿色（关键进度行）
 * - 含 `level=error` / `error=` 且非 `"<nil>"` → 红色
 */
function colorize(text: string): string {
  const lines = text.split(/\r?\n/)
  return lines
    .map((line) => {
      if (/^\s*Warning/i.test(line)) return YELLOW + line + RESET
      if (/level=info/.test(line)) return GRAY + line + RESET
      if (/\[Info\]/.test(line) || /完成/.test(line)) return GREEN + line + RESET
      if (/level=error/i.test(line)) return RED + line + RESET
      if (/DONE\s+\d/.test(line) || /ok\s+github\.com/.test(line)) return CYAN + line + RESET
      return line
    })
    .join('\n')
}

onMounted(async () => {
  term = new Terminal({
    fontFamily: 'Menlo, Consolas, "Courier New", monospace',
    fontSize: 13,
    lineHeight: 1.3,
    cursorBlink: false,
    disableStdin: true, // 只读日志
    convertEol: true, // \n 自动当换行
    scrollback: 5000,
    theme: {
      background: '#1e1e1e',
      foreground: '#d4d4d4',
      cursor: '#d4d4d4',
      selectionBackground: '#264f78aa',
    },
  })

  fitAddon = new FitAddon()
  term.loadAddon(fitAddon)
  term.open(termHost.value!)

  // 写入日志（带轻度着色）
  term.write(colorize(props.content ?? ''))

  // 容器尺寸稳定后再 fit，避免列数算错导致折行
  await nextTick()
  fitAddon.fit()

  // 弹窗拉伸 / 窗口缩放时自动重新 fit
  resizeObserver = new ResizeObserver(() => {
    try {
      fitAddon?.fit()
    } catch {
      /* 忽略尺寸为 0 时的偶发报错 */
    }
  })
  resizeObserver.observe(termHost.value!)
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
  term?.dispose()
  term = null
})
</script>

<template>
  <div ref="termHost" class="xterm-host"></div>
</template>

<style scoped>
.xterm-host {
  width: 100%;
  height: 100%;
  padding: 8px;
  background: #1e1e1e;
  box-sizing: border-box;
}

/* 让终端填满容器 */
.xterm-host :deep(.xterm) {
  height: 100%;
}
</style>
