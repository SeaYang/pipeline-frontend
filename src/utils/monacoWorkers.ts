import * as monaco from 'monaco-editor'
import { loader } from '@guolao/vue-monaco-editor'
// Vite 原生支持 `?worker` 后缀导入，把 worker 构造函数交给运行时；无需额外插件或 vite.config 改动。
import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import jsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker'

/** Monaco worker 工厂所需的运行时环境结构（等价于 monaco 的全局 Environment） */
interface MonacoWorkerEnv {
  getWorker(workerId: string, label: string): Worker
}

/**
 * Monaco 运行时初始化（副作用模块，只需被 import 一次 —— 在 CodeEditor.vue 顶部）。
 *
 * 1) 让 @guolao/vue-monaco-editor 使用本地安装的 monaco-editor，而非默认从 CDN 拉取
 *    （@monaco-editor/loader 默认走 CDN，离线/内网会失败）。
 * 2) 注册 Vite 下的 web worker：JSON 有专用 worker（带 schema 校验），
 *    YAML 走基础 editor.worker + 内置语法高亮，不需要独立 worker。
 *
 * 必须在 Monaco 编辑器实例化之前执行。
 */
loader.config({ monaco })

;(self as unknown as { MonacoEnvironment?: MonacoWorkerEnv }).MonacoEnvironment = {
  getWorker(_workerId: string, label: string) {
    if (label === 'json') return new jsonWorker()
    return new editorWorker()
  },
}
