<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  getPipelineParameter,
  getPipelineParameterByName,
  updatePipelineParameter,
  type PipelineParameter,
  type PipelineParameterCreate,
} from '@/api/pipelineParameter'
import ParameterForm from './components/ParameterForm.vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const saving = ref(false)
const detail = ref<PipelineParameter | null>(null)
const formRef = ref<InstanceType<typeof ParameterForm>>()

const paramName = computed(() => route.params.name as string)

async function loadDetail() {
  loading.value = true
  try {
    // 优先按 name 查询
    detail.value = await getPipelineParameterByName(paramName.value)
  } catch {
    // 降级：如果 name 查询失败，尝试用 id（兼容旧路由）
    const id = Number(route.query.id)
    if (id) {
      try {
        detail.value = await getPipelineParameter(id)
      } catch (e) {
        ElMessage.error((e as Error)?.message || '获取参数详情失败')
      }
    }
  } finally {
    loading.value = false
  }
}

async function handleSubmit(data: PipelineParameterCreate & { id?: number }) {
  if (!detail.value?.id) {
    ElMessage.error('参数 ID 缺失')
    return
  }
  saving.value = true
  try {
    const updated = await updatePipelineParameter({ ...data, id: detail.value.id })
    detail.value = updated
    ElMessage.success('修改成功')
  } catch (e) {
    ElMessage.error((e as Error)?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

async function save() {
  await formRef.value?.doSubmit()
}

function goBack() {
  router.back()
}

onMounted(loadDetail)
</script>

<template>
  <div class="param-detail" v-loading="loading">
    <!-- 顶部操作栏 -->
    <div class="detail-header">
      <h3 class="title">
        {{ detail?.label ?? paramName }}
        <span class="title__name">({{ paramName }})</span>
      </h3>
      <div class="detail-header__right">
        <el-button @click="goBack">返回</el-button>
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </div>
    </div>

    <!-- 编辑表单 -->
    <div v-if="detail" class="edit-form">
      <ParameterForm
        ref="formRef"
        :model-data="detail"
        :readonly="false"
        @submit="handleSubmit"
      />
    </div>
  </div>
</template>

<style scoped>
.param-detail {
  padding: 16px 20px;
}
.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
.title__name {
  font-size: 14px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}
.edit-form {
  max-width: 800px;
}
</style>
