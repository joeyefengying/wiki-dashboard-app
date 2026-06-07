import { createRouter, createWebHashHistory } from 'vue-router';

const router = createRouter({
    history: createWebHashHistory(),
    routes: [
        { path: '/', name: 'overview', component: () => import('@/views/OverviewPage.vue') },
        { path: '/tasks', name: 'tasks', component: () => import('@/views/TasksPage.vue') },
        { path: '/capture', name: 'capture', component: () => import('@/views/CapturePage.vue') },
        { path: '/projects', name: 'projects', component: () => import('@/views/ProjectsPage.vue') },
        { path: '/capabilities', name: 'capabilities', component: () => import('@/views/CapabilitiesPage.vue') },
        { path: '/settings', name: 'settings', component: () => import('@/views/SettingsPage.vue') },
    ],
});

export default router;
