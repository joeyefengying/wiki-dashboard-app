<template>
  <a-config-provider :theme="themeConfig" :locale="zhCN">
    <a-layout style="height: 100vh; overflow: hidden">
      <a-layout-sider
        v-model:collapsed="collapsed"
        collapsible
        :theme="isDark ? 'dark' : 'light'"
        :width="200"
      >
        <div class="logo">
          <span v-if="!collapsed">📋 Wiki Dashboard</span>
          <span v-else>📋</span>
        </div>
        <a-menu
          v-model:selectedKeys="selectedKeys"
          mode="inline"
          :theme="isDark ? 'dark' : 'light'"
          @click="onMenuClick"
        >
          <a-menu-item key="/"><AppstoreOutlined /><span>概览</span></a-menu-item>
          <a-menu-item key="/tasks"><CheckSquareOutlined /><span>任务</span></a-menu-item>
          <a-menu-item key="/capture"><EditOutlined /><span>速记</span></a-menu-item>
          <a-menu-item key="/projects"><FolderOutlined /><span>项目</span></a-menu-item>
          <a-menu-item key="/capabilities"><ThunderboltOutlined /><span>能力</span></a-menu-item>
          <a-menu-item key="/settings"><SettingOutlined /><span>设置</span></a-menu-item>
        </a-menu>
        <div style="position: absolute; bottom: 8px; width: 100%; padding: 0 12px">
          <div v-if="gitStatus" style="margin-bottom: 8px; display: flex; align-items: center; gap: 4px">
            <a-badge
              :count="changeCount"
              :number-style="{ backgroundColor: gitStatus.hasChanges ? '#cf7a4c' : '#52c41a', fontSize: '10px' }"
              size="small"
            >
              <a-button size="small" type="text" @click="gitSync" :loading="gitLoading" style="font-size: 11px">
                {{ gitStatus.current }}
              </a-button>
            </a-badge>
          </div>
          <div style="text-align: center">
            <a-button size="small" shape="circle" @click="isDark = !isDark">
              <template #icon><BulbOutlined /></template>
            </a-button>
          </div>
        </div>
      </a-layout-sider>
      <a-layout :style="{ background: isDark ? '#141414' : '#f5f5f5' }">
        <a-layout-content style="padding: 24px; overflow-y: auto" :style="{ paddingBottom: consoleVisible ? '260px' : '24px' }">
          <router-view />
        </a-layout-content>
      </a-layout>

      <!-- 底部控制台 -->
      <div v-if="consoleVisible" :style="{ position: 'fixed', bottom: 0, left: collapsed ? '80px' : '200px', right: 0, height: '240px', background: '#1e1e1e', borderTop: '1px solid #333', zIndex: 100, display: 'flex', flexDirection: 'column' }">
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 4px 12px; background: #2d2d2d">
          <span style="color: #ccc; font-size: 12px">控制台</span>
          <a-space :size="4">
            <a-button size="small" type="text" style="color: #ccc" @click="clearConsole">清空</a-button>
            <a-button size="small" type="text" style="color: #ff4d4f" @click="killCli">终止</a-button>
            <a-button size="small" type="text" style="color: #ccc" @click="consoleVisible = false">关闭</a-button>
          </a-space>
        </div>
        <div ref="consoleEl" style="flex: 1; overflow-y: auto; padding: 8px 12px; font-family: 'Cascadia Code', 'Consolas', monospace; font-size: 12px; line-height: 1.6; color: #d4d4d4; white-space: pre-wrap">{{ consoleLines.join('\n') }}</div>
        <div v-if="cliRunning" style="padding: 4px 12px; color: #cf7a4c; font-size: 11px">⏳ 执行中…</div>
      </div>
    </a-layout>
  </a-config-provider>
</template>

<script setup lang="ts">
import { ref, watch, computed, provide } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { theme, message } from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import {
  AppstoreOutlined, CheckSquareOutlined, EditOutlined,
  FolderOutlined, ThunderboltOutlined, SettingOutlined, BulbOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();
const route = useRoute();
const collapsed = ref(false);
const selectedKeys = ref<string[]>([route.path]);
const isDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches);
const gitStatus = ref<any>(null);
const gitLoading = ref(false);

// 控制台
const consoleVisible = ref(false);
const consoleLines = ref<string[]>([]);
const cliRunning = ref(false);
const consoleEl = ref<HTMLElement>();

function showConsole() { consoleVisible.value = true; }
function clearConsole() { consoleLines.value = []; }
function killCli() { (window as any).electronAPI?.cli?.kill(); }

provide('console', { showConsole, consoleLines, cliRunning });

// 监听 CLI 输出
(window as any).electronAPI?.cli?.onOutput((line: string) => {
  consoleLines.value.push(line);
  // 自动滚动到底部
  setTimeout(() => {
    if (consoleEl.value) consoleEl.value.scrollTop = consoleEl.value.scrollHeight;
  }, 50);
});
(window as any).electronAPI?.cli?.onDone((code: number | null) => {
  cliRunning.value = false;
  if (code === 0) consoleLines.value.push('── 执行完成 ──');
  else if (code === -1) consoleLines.value.push('── 已终止 ──');
  else consoleLines.value.push(`── 退出码: ${code} ──`);
});

// 计算变更数
const changeCount = computed(() => {
  if (!gitStatus.value) return 0;
  const s = gitStatus.value;
  return (s.modified?.length || 0) + (s.added?.length || 0) + (s.deleted?.length || 0) + (s.untracked?.length || 0);
});

// 加载 Git 状态
async function loadGitStatus() {
  try {
    gitStatus.value = await (window as any).electronAPI?.git?.status();
  } catch { /* git repo not available */ }
}

async function gitSync() {
  gitLoading.value = true;
  try {
    const result = await (window as any).electronAPI?.git?.sync();
    message.success(result);
    await loadGitStatus();
  } catch (e: any) {
    message.error(`同步失败：${e?.message || e}`);
  } finally {
    gitLoading.value = false;
  }
}

// 定时刷新
setInterval(loadGitStatus, 30000);
loadGitStatus();

watch(() => route.path, (val) => { selectedKeys.value = [val]; });
watch(isDark, (val) => {
  document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light');
});

const themeConfig = computed(() => ({
  algorithm: isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: '#cf7a4c',
    borderRadius: 4,
  },
}));

function onMenuClick({ key }: { key: string }) {
  router.push(key);
}
</script>

<style scoped>
.logo {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 8px;
}
</style>
