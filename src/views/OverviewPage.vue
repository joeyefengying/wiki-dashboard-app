<template>
  <div>
    <h2 style="margin-bottom: 16px">概览</h2>
    <!-- 统计卡片 -->
    <a-row :gutter="16">
      <a-col :span="6">
        <a-card><a-statistic title="实体" :value="stats.entities" /></a-card>
      </a-col>
      <a-col :span="6">
        <a-card><a-statistic title="主题" :value="stats.topics" /></a-card>
      </a-col>
      <a-col :span="6">
        <a-card><a-statistic title="素材" :value="stats.sources" /></a-card>
      </a-col>
      <a-col :span="6">
        <a-card><a-statistic title="综合分析" :value="stats.synthesis" /></a-card>
      </a-col>
    </a-row>

    <!-- 快速消化 -->
    <a-card title="⚡ 快速消化" style="margin-top: 16px">
      <a-space direction="vertical" style="width: 100%">
        <a-input v-model:value="digestUrl" placeholder="粘贴 URL 或文件路径…" @pressEnter="digest('url')" />
        <a-space>
          <a-button type="primary" @click="digest('url')">消化外链</a-button>
          <a-button @click="digest('local')">原地消化</a-button>
          <a-button @click="digest('ai')">AI 资讯</a-button>
          <a-button type="primary" danger @click="digest('exec')" :loading="execLoading">▶ 直接执行</a-button>
        </a-space>
        <div v-if="execResult" style="margin-top: 8px; padding: 8px; background: #f5f5f5; border-radius: 4px; max-height: 200px; overflow-y: auto; font-size: 12px; white-space: pre-wrap">
          {{ execResult }}
        </div>
        <span style="font-size: 12px; color: #999">前三个按钮复制命令，▶ 直接调用 claude CLI 执行</span>
      </a-space>
    </a-card>

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

    <FilePreview v-model:visible="previewVisible" :file-path="previewPath" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, inject } from 'vue';
import { message } from 'ant-design-vue';
import FilePreview from '@/components/FilePreview.vue';
import type { VaultStats, FileInfo } from '@/types/electron';

const api = window.electronAPI;

const stats = reactive<VaultStats>({ entities: 0, topics: 0, sources: 0, synthesis: 0, totalFiles: 0 });
const recentFiles = ref<FileInfo[]>([]);
const digestUrl = ref('');
const loading = ref(true);
const previewVisible = ref(false);
const previewPath = ref('');
const execLoading = ref(false);
const execResult = ref('');
const consoleApi = inject<any>('console', {});

onMounted(async () => {
  try {
    const s = await api.vault.getStats();
    Object.assign(stats, s);
    recentFiles.value = await api.vault.recentFiles(10);
  } finally {
    loading.value = false;
  }
});

async function digest(type: string) {
  let cmd = '';
  if (type === 'url') {
    const url = digestUrl.value.trim();
    if (!url) { message.warning('请先输入 URL'); return; }
    cmd = `/llm-wiki 消化 ${url}`;
  } else if (type === 'local') {
    const path = digestUrl.value.trim();
    if (!path) { message.warning('请先输入路径'); return; }
    cmd = `/llm-wiki 原地消化 ${path}`;
  } else if (type === 'ai') {
    cmd = '看一下今天 AI 圈有什么';
  }

  if (type === 'exec') {
    // 直接执行模式 → 打开底部控制台
    let input = digestUrl.value.trim();
    if (!input) { message.warning('请先输入 URL'); return; }
    // 如果用户粘贴了完整命令，直接使用；否则拼接
    const prompt = input.startsWith('/llm-wiki') ? input : `/llm-wiki 消化 ${input}`;
    if (consoleApi) {
      consoleApi.showConsole?.();
      consoleApi.consoleLines.value = [];
      consoleApi.cliRunning.value = true;
    }
    (window as any).electronAPI?.cli?.exec(prompt);
    execLoading.value = true;
    setTimeout(() => { execLoading.value = false; }, 1000);
    return;
  }

  await navigator.clipboard.writeText(cmd);
  message.success('命令已复制到剪贴板');
}

function openFile(path: string) {
  previewPath.value = path;
  previewVisible.value = true;
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
