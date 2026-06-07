<template>
  <div>
    <h2 style="margin-bottom: 12px">任务管理</h2>

    <!-- 项目切换 -->
    <a-space style="margin-bottom: 12px" align="center">
      <span style="font-size: 13px; color: #999">项目筛选：</span>
      <a-select
        v-model:value="selectedProj"
        style="width: 260px"
        placeholder="全部任务"
        size="small"
        allow-clear
        show-search
        option-filter-prop="label"
        @change="onProjChange"
      >
        <a-select-option value="" label="全部任务">📋 全部任务</a-select-option>
        <a-select-option v-for="p in projects" :key="p.path" :value="p.path" :label="p.name">{{ p.name }}</a-select-option>
      </a-select>
    </a-space>

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

const selectedProj = ref('');
const projects = ref<Array<{ name: string; path: string }>>([]);

const previewVisible = ref(false);
const previewPath = ref('');

onMounted(async () => {
  const dirs = await api.vault.listDir('PARA 管理/1. 项目');
  projects.value = dirs.filter(d => d.isDir).map(d => ({ name: d.name, path: d.path }));
});

function onProjChange(val: string) {
  // selectedProj 已通过 v-model 绑定
}

function onPreview(path: string) {
  previewPath.value = path;
  previewVisible.value = true;
}
</script>
