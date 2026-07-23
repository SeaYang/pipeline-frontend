<script setup lang="ts">
import { ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import {
  createPipelineParameter,
  type PipelineParameterCreate,
} from '@/api/pipelineParameter'
import ParameterForm from './components/ParameterForm.vue'

const router = useRouter()
const route = useRoute()
const saving = ref(false)
const formRef = ref<InstanceType<typeof ParameterForm>>()

/** 从 query 参数预填参数名（从模板版本未定义参数跳转过来时携带） */
const presetName = (route.query.name as string) ?? ''

async function handleSubmit(data: PipelineParameterCreate & { id?: number }) {
  saving.value = true
  try {
    const created = await createPipelineParameter(data)
    ElMessage.success('新增成功')
    // 跳转到详情页
    router.replace(`/pipeline-parameter/${encodeURIComponent(created.name)}`)
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
</script>

<template>
  <div class="param-create">
    <div class="create-header">
      <h3 class="title">新建流水线参数</h3>
      <div class="create-header__right">
        <el-button type="primary" :loading="saving" @click="save">保存</el-button>
      </div>
    </div>

    <ParameterForm ref="formRef" :preset-name="presetName" :readonly="false" @submit="handleSubmit" />
  </div>
</template>

<style scoped>
.param-create {
  padding: 16px 20px;
}
.create-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}
.create-header__left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
}
</style>
