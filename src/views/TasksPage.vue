<template>
  <div>
    <h2 style="margin-bottom: 12px">任务管理</h2>

    <!-- 项目 Tabs -->
    <a-tabs v-model:activeKey="activeProj" size="small" style="margin-bottom: 4px" @change="onProjChange">
      <a-tab-pane key="all" tab="全部" />
      <a-tab-pane v-for="p in projects" :key="p.path" :tab="p.name" />
    </a-tabs>

    <a-card size="small">
      <TaskPanel :proj-path="selectedProj" @preview="onPreview" />
    </a-card>
    <FilePreview v-model:visible="previewVisible" :file-path="previewPath" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import TaskPanel from '@/components/TaskPanel.vue';
import FilePreview from '@/components/FilePreview.vue';

const api = window.electronAPI;

const activeProj = ref('all');
const selectedProj = ref('');
const projects = ref<Array<{ name: string; path: string }>>([]);

const previewVisible = ref(false);
const previewPath = ref('');

onMounted(async () => {
  const dirs = await api.vault.listDir('PARA 管理/1. 项目');
  projects.value = dirs.filter(d => d.isDir).map(d => ({ name: d.name, path: d.path }));
});

function onProjChange(key: string) {
  selectedProj.value = key === 'all' ? '' : key;
}

function onPreview(path: string) {
  previewPath.value = path;
  previewVisible.value = true;
}
</script>
