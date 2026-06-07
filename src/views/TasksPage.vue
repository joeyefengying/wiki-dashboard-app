<template>
  <div>
    <h2 style="margin-bottom: 16px">任务管理</h2>
    <a-card size="small">
      <TaskPanel @preview="onPreview" />
    </a-card>
    <FilePreview v-model:visible="previewVisible" :file-path="previewPath" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import TaskPanel from '@/components/TaskPanel.vue';
import FilePreview from '@/components/FilePreview.vue';

const previewVisible = ref(false);
const previewPath = ref('');

function onPreview(path: string) {
  previewPath.value = path;
  previewVisible.value = true;
}
</script>
