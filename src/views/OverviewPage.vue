<template>
  <div>
    <h2 style="margin-bottom: 16px">概览</h2>
    <!-- 统计卡片 -->
    <a-row :gutter="16">
      <a-col :span="6" v-for="s in statsCards" :key="s.label">
        <a-card :hoverable="false">
          <a-statistic :title="s.label" :value="s.value" />
        </a-card>
      </a-col>
    </a-row>

    <!-- 最近动态 -->
    <a-card title="最近动态" style="margin-top: 16px">
      <a-list :data-source="recentFiles" :loading="loading">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                <a @click="openFile(item.path)">{{ item.name }}</a>
              </template>
              <template #description>
                <a-tag>{{ item.path.split('/').slice(0, -1).join(' / ') }}</a-tag>
                <span style="color: #999">{{ formatTime(item.mtime) }}</span>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive } from 'vue';
import type { VaultStats, FileInfo } from '@/types/electron';

const api = window.electronAPI;

const stats = reactive<VaultStats>({ entities: 0, topics: 0, sources: 0, synthesis: 0, totalFiles: 0 });
const recentFiles = ref<FileInfo[]>([]);
const loading = ref(true);

const statsCards = [
  { label: '实体', value: stats.entities },
  { label: '主题', value: stats.topics },
  { label: '素材', value: stats.sources },
  { label: '综合分析', value: stats.synthesis },
];

onMounted(async () => {
  try {
    const s = await api.vault.getStats();
    Object.assign(stats, s);
    recentFiles.value = await api.vault.recentFiles(10);
  } finally {
    loading.value = false;
  }
});

function openFile(path: string) {
  api.vault.readFile(path).then(() => {});
}

function formatTime(mtime: number) {
  const diff = Date.now() - mtime;
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} 分钟前`;
  const hours = Math.floor(diff / 3600000);
  if (hours < 24) return `${hours} 小时前`;
  const days = Math.floor(diff / 86400000);
  return `${days} 天前`;
}
</script>
