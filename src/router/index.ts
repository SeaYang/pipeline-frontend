import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/argo-flow',
    },
    {
      path: '/argo-flow',
      name: 'argo-flow',
      component: () => import('../views/ArgoFlowView.vue'),
    },
    {
      path: '/argo/pipelines',
      name: 'argo-pipelines',
      component: () => import('../views/argo/PipelineList.vue'),
    },
    {
      path: '/argo/pipelines/:name',
      name: 'argo-pipeline-detail',
      component: () => import('../views/argo/PipelineDetail.vue'),
      props: true,
    },
  ],
})

export default router
