import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { TreeNode } from '@/types/electron';

export interface ProjectInfo {
    name: string;
    path: string;
}

export const useProjectStore = defineStore('project', () => {
    const currentPath = ref('');
    const projects = ref<ProjectInfo[]>([]);
    const treeData = ref<TreeNode[]>([]);
    const loaded = ref(false);
    const treeLoaded = ref(false);

    const currentProject = computed(() =>
        projects.value.find(p => p.path === currentPath.value) || null
    );

    // projName 直接从路径末段提取，支持任意深度的子项目
    const projName = computed(() => {
        if (!currentPath.value) return '';
        return currentPath.value.split('/').pop() || '';
    });

    // 面包屑：从根到当前项目的路径段
    const breadcrumb = computed(() => {
        if (!currentPath.value) return [];
        const parts = currentPath.value.split('/');
        const result: { name: string; path: string }[] = [];
        let accumulated = '';
        for (const part of parts) {
            accumulated = accumulated ? `${accumulated}/${part}` : part;
            result.push({ name: part, path: accumulated });
        }
        return result;
    });

    // 在树中查找节点
    function findNode(nodes: TreeNode[], path: string): TreeNode | null {
        for (const node of nodes) {
            if (node.path === path) return node;
            const found = findNode(node.children, path);
            if (found) return found;
        }
        return null;
    }

    // 获取某路径的同级子项目
    function getSiblings(path: string): TreeNode[] {
        const parentPath = path.split('/').slice(0, -1).join('/');
        if (!parentPath) return treeData.value;
        const parent = findNode(treeData.value, parentPath);
        return parent?.children || [];
    }

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

    async function loadProjectTree() {
        if (treeLoaded.value) return;
        try {
            const api = (window as any).electronAPI;
            treeData.value = await api.vault.buildProjectTree();
            treeLoaded.value = true;
        } catch { /* ignore */ }
    }

    function selectProject(path: string) {
        currentPath.value = path;
    }

    function clearProject() {
        currentPath.value = '';
    }

    async function refreshTree() {
        treeLoaded.value = false;
        await loadProjectTree();
    }

    return {
        currentPath, currentProject, projName, projects, treeData,
        loaded, treeLoaded, breadcrumb,
        loadProjects, loadProjectTree, selectProject, clearProject,
        getSiblings, findNode, refreshTree,
    };
});
