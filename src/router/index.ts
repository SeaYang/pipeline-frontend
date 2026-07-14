import { createRouter, createWebHistory } from 'vue-router'
import { getAccount } from '@/utils/auth'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      // 登录页：独立路由，不套布局壳（无顶栏 / 侧栏）
      path: '/login',
      name: 'login',
      component: () => import('@/views/LoginView.vue'),
      meta: { public: true },
    },
    {
      // 主布局：左侧栏 + 顶栏 + 主内容区，业务页面均作为其子路由
      path: '/',
      component: () => import('@/layouts/DefaultLayout.vue'),
      children: [
        { path: '', redirect: '/argo-flow' },
        {
          path: 'argo-flow',
          name: 'argo-flow',
          component: () => import('@/views/ArgoFlowView.vue'),
        },
        {
          path: 'argo/pipelines',
          name: 'argo-pipelines',
          component: () => import('@/views/argo/PipelineList.vue'),
        },
        {
          path: 'argo/pipelines/:name',
          name: 'argo-pipeline-detail',
          component: () => import('@/views/argo/PipelineDetail.vue'),
          props: true,
        },
        {
          path: 'dict/type',
          name: 'dict-type',
          component: () => import('@/views/dict/DictTypeList.vue'),
        },
        {
          path: 'dict/data/:dictType',
          name: 'dict-data',
          component: () => import('@/views/dict/DictDataList.vue'),
          props: true,
        },
        {
          path: 'task-template',
          name: 'task-template',
          component: () => import('@/views/task-template/TaskTemplateList.vue'),
        },
        {
          path: 'task-template/:taskTemplateCode/versions',
          name: 'task-template-versions',
          component: () => import('@/views/task-template/TaskTemplateVersionManage.vue'),
          props: true,
        },
        {
          path: 'pipeline-template',
          name: 'pipeline-template',
          component: () => import('@/views/pipeline-template/PipelineTemplateList.vue'),
        },
        {
          path: 'pipeline-template/:pipelineTemplateCode/versions',
          name: 'pipeline-template-versions',
          component: () => import('@/views/pipeline-template/PipelineTemplateVersionManage.vue'),
          props: true,
        },
      ],
    },
    {
      // 404 兜底：独立路由，不套布局壳
      path: '/:pathMatch(.*)*',
      name: 'not-found',
      component: () => import('@/views/NotFoundView.vue'),
      meta: { public: true },
    },
  ],
})

/**
 * 全局前置守卫：登录态判断（主机制）。
 *
 * - 未登录访问受保护页面 → 跳登录页，并携带 redirect 回跳地址；
 * - 已登录访问登录页 → 直接回首页，避免重复登录。
 *
 * 请求拦截器（src/utils/request.ts）作为兜底，二者读同一份数据源。
 */
router.beforeEach((to) => {
  const account = getAccount()
  if (!to.meta.public && !account) {
    return { name: 'login', query: { redirect: to.fullPath } }
  }
  if (to.name === 'login' && account) {
    return { path: '/' }
  }
})

export default router
