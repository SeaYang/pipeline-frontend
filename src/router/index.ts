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
        { path: '', redirect: '/app-list' },
        {
          // 流水线列表：以 appName 为维度，进入菜单时无 appName，由页面顶部下拉选择后写入路由
          path: 'pipeline/list/:appName?',
          name: 'pipeline-list',
          component: () => import('@/views/pipeline/PipelineList.vue'),
        },
        {
          // 最近运行 / 运行历史：同一流水线的运行信息，以 tab 形式共享父路由，各 tab 是独立子路由
          path: 'pipeline/:pipelineId/run',
          component: () => import('@/views/pipeline/PipelineRunTabs.vue'),
          props: true,
          redirect: (to) => `/pipeline/${to.params.pipelineId}/run/latest`,
          children: [
            {
              // 最近运行：查询流水线最近一次执行记录，拿到 workflowName 后在本路由内直接展示 vue-flow（不跳转 /argo/pipelines/{name}）
              path: 'latest',
              name: 'pipeline-latest-run',
              component: () => import('@/views/pipeline/PipelineLatestRun.vue'),
              props: true,
            },
            {
              // 运行历史：分页展示流水线的执行记录列表
              path: 'history',
              name: 'pipeline-run-history',
              component: () => import('@/views/pipeline/PipelineRunHistory.vue'),
              props: true,
            },
          ],
        },
        {
          // 触发历史：支持按 pipelineId 或 appName 维度查询
          path: 'pipeline/trigger-history',
          name: 'pipeline-trigger-history',
          component: () => import('@/views/pipeline/PipelineTriggerHistory.vue'),
        },
        {
          path: 'argo/pipelines',
          name: 'argo-pipelines',
          component: () => import('@/views/argo/PipelineList.vue'),
        },
        {
          // 流水线执行详情（原 /argo/pipelines/:name，优化为语义更清晰的路径）
          path: 'pipeline/execute-detail/:name',
          name: 'pipeline-execute-detail',
          component: () => import('@/views/argo/PipelineDetail.vue'),
          props: true,
        },
        {
          path: 'app-list',
          name: 'app-list',
          component: () => import('@/views/app-info/AppInfoList.vue'),
        },
        {
          path: 'app-config',
          name: 'app-config',
          component: () => import('@/views/app-info/AppConfig.vue'),
        },
        {
          path: 'app-config/:appName',
          name: 'app-config-detail',
          component: () => import('@/views/app-info/AppConfig.vue'),
          props: true,
        },
        {
          path: 'artifact-list',
          name: 'artifact-list',
          component: () => import('@/views/artifact/ArtifactList.vue'),
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
        {
          path: 'pipeline-parameter',
          name: 'pipeline-parameter',
          component: () => import('@/views/pipeline-parameter/PipelineParameterList.vue'),
        },
        {
          path: 'pipeline-parameter/create',
          name: 'pipeline-parameter-create',
          component: () => import('@/views/pipeline-parameter/PipelineParameterCreate.vue'),
        },
        {
          path: 'pipeline-parameter/:name',
          name: 'pipeline-parameter-detail',
          component: () => import('@/views/pipeline-parameter/PipelineParameterDetail.vue'),
          props: true,
        },
        {
          path: 'trigger-event-enum',
          name: 'trigger-event-enum',
          component: () => import('@/views/trigger-event-enum/TriggerEventEnumList.vue'),
        },
        {
          path: 'template-event-bind',
          name: 'template-event-bind',
          component: () => import('@/views/template-event-bind/TemplateEventBindList.vue'),
        },
        {
          path: 'generic-config',
          name: 'generic-config',
          component: () => import('@/views/generic-config/GenericConfigPage.vue'),
        },
        {
          path: 'cron-job',
          name: 'cron-job',
          component: () => import('@/views/cron-job/CronJobList.vue'),
        },
        {
          path: 'cron-job/log',
          name: 'cron-job-log',
          component: () => import('@/views/cron-job/CronJobLogList.vue'),
        },
        {
          path: 'cluster',
          name: 'cluster',
          component: () => import('@/views/cluster/ClusterList.vue'),
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
