<template>
  <div>
    <h2 style="margin-bottom: 12px">任务管理</h2>

    <!-- 项目筛选（外层时显示） -->
    <a-space v-if="!selectedProj" style="margin-bottom: 12px" align="center">
      <span style="font-size: 13px; color: #999">筛选项目：</span>
      <a-select
        v-model:value="filterProj"
        style="width: 220px"
        placeholder="全部任务"
        size="small"
        allow-clear
        show-search
        option-filter-prop="label"
      >
        <a-select-option value="" label="全部">全部任务</a-select-option>
        <a-select-option v-for="p in projStore.projects" :key="p.path" :value="p.path" :label="p.name">{{ p.name }}</a-select-option>
      </a-select>
    </a-space>

    <a-card size="small">
      <TaskPanel :proj-path="selectedProj || filterProj" @preview="onPreview" />
    </a-card>
    <FilePreview v-model:visible="previewVisible" :file-path="previewPath" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import TaskPanel from '@/components/task-panel/index.vue';
import FilePreview from '@/components/file-preview/index.vue';
import { useProjectStore } from '@/stores/project';

const projStore = useProjectStore();
const selectedProj = computed(() => projStore.currentPath);
const filterProj = ref('');

const previewVisible = ref(false);
const previewPath = ref('');

function onPreview(path: string) {
  previewPath.value = path;
  previewVisible.value = true;
}
</script>
