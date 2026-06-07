<template>
  <div>
    <h2 style="margin-bottom: 12px">任务管理</h2>

    <a-card size="small">
      <TaskPanel :proj-path="selectedProj" @preview="onPreview" />
    </a-card>
    <FilePreview v-model:visible="previewVisible" :file-path="previewPath" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import TaskPanel from '@/components/TaskPanel.vue';
import FilePreview from '@/components/FilePreview.vue';
import { useProjectStore } from '@/stores/project';

const projStore = useProjectStore();
const selectedProj = computed(() => projStore.currentPath);

const previewVisible = ref(false);
const previewPath = ref('');

function onPreview(path: string) {
  previewPath.value = path;
  previewVisible.value = true;
}
</script>
