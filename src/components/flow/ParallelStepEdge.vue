<script setup lang="ts">
/**
 * 自定义正交折线边（ParallelStepEdge）
 *
 * 解决 smoothstep 在并行分支分叉时形成"2"字形折线的问题。
 *
 * 核心思路：手写 SVG path，从源 handle 出发后走固定偏移 OFFSET，
 * 然后垂直走到目标行，再水平进入目标。这样从同一源节点出发的所有边
 * 在同一个 x 坐标处拐弯，形成平行分叉/汇聚。
 *
 * 拐角用二次贝塞尔曲线（Q 命令）做圆角过渡，和 smoothstep 风格一致。
 *
 * 当 source 和 target 的 y 相同时（同一行），退化为直线。
 */
import { computed } from 'vue'
import { BaseEdge, type EdgeProps, type GraphNode } from '@vue-flow/core'

const props = defineProps<EdgeProps>()

/** 从源 handle 出发后的固定水平偏移量（拐弯 x 距离 sourceX 的距离） */
const OFFSET = 60

/** 拐角圆角半径 */
const RADIUS = 8

/** 默认节点尺寸（与 PipelineFlowNode 的 .pnode CSS 一致） */
const NODE_W = 200
const NODE_H = 96

/**
 * 计算 handle 的实际坐标。
 *
 * VueFlow 传入的 sourceX/sourceY 在节点 dimensions 初始化前是节点左上角坐标，
 * 而非 handle 中点。这里根据 sourceNode/targetNode 的 position + dimensions
 * 自行计算，确保坐标始终正确。
 */
function getHandlePos(
  node: GraphNode | undefined,
  fallbackX: number,
  fallbackY: number,
  side: 'source' | 'target',
) {
  if (!node) return { x: fallbackX, y: fallbackY }
  const w = node.dimensions?.width || NODE_W
  const h = node.dimensions?.height || NODE_H
  const pos = node.computedPosition || node.position
  const x = side === 'source' ? pos.x + w : pos.x
  const y = pos.y + h / 2
  return { x, y }
}

const edgePath = computed(() => {
  // 从 sourceNode/targetNode 自行计算 handle 坐标，避免 VueFlow 初始化时序问题
  const source = getHandlePos(props.sourceNode, props.sourceX, props.sourceY, 'source')
  const target = getHandlePos(props.targetNode, props.targetX, props.targetY, 'target')
  const sourceX = source.x
  const sourceY = source.y
  const targetX = target.x
  const targetY = target.y

  // 同一行：直线
  if (Math.abs(sourceY - targetY) < 1) {
    return {
      path: `M ${sourceX} ${sourceY} L ${targetX} ${targetY}`,
      labelX: (sourceX + targetX) / 2,
      labelY: sourceY,
    }
  }

  // 拐弯 x：从源 handle 出发固定偏移
  const turnX = sourceX + OFFSET

  // 目标在源下方 sign=1；上方 sign=-1
  const dy = targetY - sourceY
  const sign = dy > 0 ? 1 : -1

  // 圆角不能超过可用空间
  const r = Math.min(RADIUS, OFFSET, Math.abs(targetX - turnX) / 2)

  // 路径：水平 → 圆角拐垂直 → 垂直 → 圆角拐水平 → 水平进入目标
  // 用 Q（二次贝塞尔）做圆角，和 smoothstep 的 getBend 函数风格一致
  const path = [
    `M ${sourceX} ${sourceY}`,
    `L ${turnX - r} ${sourceY}`,
    `Q ${turnX} ${sourceY} ${turnX} ${sourceY + sign * r}`,
    `L ${turnX} ${targetY - sign * r}`,
    `Q ${turnX} ${targetY} ${turnX + r} ${targetY}`,
    `L ${targetX} ${targetY}`,
  ].join(' ')

  return {
    path,
    labelX: turnX,
    labelY: (sourceY + targetY) / 2,
  }
})
</script>

<template>
  <BaseEdge
    :id="props.id"
    :path="edgePath.path"
    :label-x="edgePath.labelX"
    :label-y="edgePath.labelY"
    :marker-end="props.markerEnd"
    :marker-start="props.markerStart"
    :label="props.label"
    :label-style="props.labelStyle"
    :label-show-bg="props.labelShowBg"
    :label-bg-style="props.labelBgStyle"
    :label-bg-padding="props.labelBgPadding"
    :label-bg-border-radius="props.labelBgBorderRadius"
  />
</template>
