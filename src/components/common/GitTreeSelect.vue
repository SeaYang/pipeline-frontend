<script setup lang="ts">
import { ref, watch } from 'vue'
import { listGitTree, type GitTreeNode } from '@/api/gitlab'

interface Props {
  /** v-model 绑定值（选中的路径） */
  modelValue?: string
  /** 应用名称，用于查询 GitLab 仓库 */
  appName: string
  /** placeholder */
  placeholder?: string
  /** 是否允许选择根目录（值为 ./），默认 true */
  allowRoot?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: '',
  placeholder: '请选择目录',
  allowRoot: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

/** 根节点标识 */
const ROOT_KEY = '__root__'

/** 当前选中的值 */
const treeValue = ref(props.modelValue || (props.allowRoot ? ROOT_KEY : ''))

/** 用于 appName 变化时强制重建 el-tree-select，清空内部节点缓存 */
const renderKey = ref(0)

watch(
  () => props.modelValue,
  (val) => {
    if (!val || val === './' || val === '.') {
      treeValue.value = props.allowRoot ? ROOT_KEY : ''
    } else {
      treeValue.value = val
    }
  },
)

function handleChange(val: string | undefined) {
  if (val === ROOT_KEY || val === undefined || val === '') {
    emit('update:modelValue', './')
  } else {
    emit('update:modelValue', val)
  }
}

/**
 * el-tree-select 原生 lazy load 回调。
 *
 * Element Plus 内部机制：
 * - 首次调用时 node.level === 0（不可见的虚拟根），resolve 返回第一层可见节点
 * - 后续展开某节点时 node.level >= 1，resolve 返回该节点的子节点
 * - 组件内部自动管理 loaded / loading / isLeaf 状态，无需手动干预
 *
 * @param node    Element Plus 内部 Node 对象
 * @param resolve 将子节点数组传给 Element Plus 渲染
 */
function loadNode(
  node: { level: number; data?: { value?: string } },
  resolve: (children: { value: string; label: string; leaf?: boolean }[]) => void,
) {
  // level 0 是虚拟根节点
  if (node.level === 0) {
    if (props.allowRoot) {
      // 有根目录模式：第一层只返回一个"根目录"虚拟节点，展开后加载真实一级目录
      resolve([{ value: ROOT_KEY, label: '根目录 (./)', leaf: false }])
    } else {
      // 无根目录模式：直接加载仓库一级目录
      fetchAndResolve('', resolve)
    }
    return
  }
  // level >= 1：加载某个目录节点的子目录
  const path = node.data?.value === ROOT_KEY ? '' : node.data?.value || ''
  fetchAndResolve(path, resolve)
}

/** 调 GitLab API 获取目录列表，过滤出 type=tree 的目录节点后 resolve */
function fetchAndResolve(
  path: string,
  resolve: (children: { value: string; label: string; leaf?: boolean }[]) => void,
) {
  listGitTree(props.appName, path)
    .then((tree) => {
      const dirs = tree
        .filter((item: GitTreeNode) => item.type === 'tree')
        .map((item) => ({
          // value 和 label 都用 path 全路径，选中后回显和传给后端都是 path 值
          value: item.path,
          label: item.path,
          // name 是当前层级短名称，仅用于树节点 slot 内显示
          name: item.name,
          // GitLab API 无法预知目录是否有子目录，统一标记为非叶子节点
          // 这样展开箭头始终显示，点击后由 load 回调按需加载
          leaf: false,
        }))
      resolve(dirs)
    })
    .catch(() => {
      resolve([])
    })
}

/**
 * el-tree-select 的 props 映射配置。
 * 注意：Element Plus 中控制叶子节点的字段名是 isLeaf（不是 leaf）。
 */
const treeProps = {
  label: 'label',
  value: 'value',
  children: 'children',
  isLeaf: 'leaf',
}

/**
 * appName 变化时，递增 renderKey 强制 el-tree-select 重建，
 * 清空旧的内部节点缓存，重新走 lazy load 流程。
 */
watch(
  () => props.appName,
  () => {
    renderKey.value++
    treeValue.value = props.allowRoot ? ROOT_KEY : ''
  },
)
</script>

<template>
  <el-tree-select
    :key="renderKey"
    :model-value="treeValue"
    @update:model-value="handleChange"
    :lazy="true"
    :load="loadNode"
    :props="treeProps"
    :placeholder="placeholder"
    :default-expanded-keys="props.allowRoot ? [ROOT_KEY] : []"
    check-strictly
    clearable
    style="width: 100%"
  >
    <!-- 树节点只显示当前层级短名称，选中后回显框显示 label（即 path 全路径） -->
    <template #default="{ data }">
      {{ data.name || data.label }}
    </template>
  </el-tree-select>
</template>
