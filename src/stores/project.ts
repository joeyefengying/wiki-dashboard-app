import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export interface ProjectInfo {
    name: string;
    path: string;
}

export const useProjectStore = defineStore('project', () => {
    const currentPath = ref('');
    const projects = ref<ProjectInfo[]>([]);
    const loaded = ref(false);

    const currentProject = computed(() =>
        projects.value.find(p => p.path === currentPath.value) || null
    );

    const projName = computed(() => currentProject.value?.name || '');

    async function loadProjects() {
        if (loaded.value) return;
        try {
            const api = (window as any).electronAPI;
            const dirs = await api.vault.listDir('PARA 管理/1. 项目');
            projects.value = dirs
                .filter((d: any) => d.isDir)
                .map((d: any) => ({ name: d.name, path: d.path }));
            loaded.value = true;
        } catch { /* ignore */ }
    }

    function selectProject(path: string) {
        currentPath.value = path;
    }

    return { currentPath, currentProject, projName, projects, loaded, loadProjects, selectProject };
});
