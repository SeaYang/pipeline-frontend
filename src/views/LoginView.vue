<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { FormInstance, FormRules } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { ACCOUNT_PATTERN } from '@/utils/auth'

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()

const formRef = ref<FormInstance>()
const form = reactive({ account: '' })

const rules: FormRules<typeof form> = {
  account: [
    { required: true, message: '请输入账号', trigger: 'blur' },
    { pattern: ACCOUNT_PATTERN, message: '账号只能由小写英文字母组成', trigger: 'change' },
  ],
}

/** 输入时自动转小写，友好兜底（避免大写 / 输入法导致校验不过） */
function handleInput(value: string) {
  form.account = value.toLowerCase()
}

async function handleSubmit(formEl?: FormInstance) {
  if (!formEl) return
  await formEl.validate((valid) => {
    if (!valid) return
    userStore.login(form.account)
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/'
    router.replace(redirect)
  })
}
</script>

<template>
  <div class="login-page">
    <div class="login-card">
      <div class="login-title">流水线平台</div>
      <div class="login-subtitle">请输入小写英文字母账号登录</div>
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        size="large"
        @submit.prevent="handleSubmit(formRef)"
      >
        <el-form-item prop="account">
          <el-input
            :model-value="form.account"
            placeholder="例如：alice"
            autofocus
            @update:model-value="handleInput"
            @keyup.enter="handleSubmit(formRef)"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" class="login-btn" @click="handleSubmit(formRef)">
            登录
          </el-button>
        </el-form-item>
      </el-form>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  height: 100vh;
  width: 100vw;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4ecf7 100%);
}

.login-card {
  width: 360px;
  padding: 40px 36px 24px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
}

.login-title {
  font-size: 24px;
  font-weight: bold;
  color: var(--el-text-color-primary);
  text-align: center;
  margin-bottom: 8px;
}

.login-subtitle {
  font-size: 13px;
  color: var(--el-text-color-secondary);
  text-align: center;
  margin-bottom: 28px;
}

.login-btn {
  width: 100%;
}
</style>
