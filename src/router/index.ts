import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', name: 'overview', component: () => import('@/pages/overview/index.vue') },
        { path: '/tasks', name: 'tasks', component: () => import('@/pages/tasks/index.vue') },
        { path: '/capture', name: 'capture', component: () => import('@/pages/capture/index.vue') },
        { path: '/projects', name: 'projects', component: () => import('@/pages/projects/index.vue') },
        { path: '/capabilities', name: 'capabilities', component: () => import('@/pages/capabilities/index.vue') },
        { path: '/settings', name: 'settings', component: () => import('@/pages/settings/index.vue') },
        { path: '/project/:path(.*)', name: 'projectDetail', component: () => import('@/pages/project-detail/index.vue') },
    ],
});

export default router;
