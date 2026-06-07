<template>
  <a-config-provider :theme="themeConfig" :locale="zhCN">
    <a-layout style="height: 100vh; overflow: hidden">
      <a-layout-sider
        v-model:collapsed="collapsed"
        collapsible
        :theme="isDark ? 'dark' : 'light'"
        :width="220"
      >
        <div class="logo">
          <span v-if="!collapsed">📋 Wiki Dashboard</span>
          <span v-else>📋</span>
        </div>

        <!-- ═══ 全局菜单（始终显示） ═══ -->
        <a-menu v-model:selectedKeys="selectedKeys" mode="inline" :theme="isDark ? 'dark' : 'light'" @click="onMenuClick">
          <a-menu-item key="/"><AppstoreOutlined /><span>概览</span></a-menu-item>
          <a-menu-item key="/tasks"><CheckSquareOutlined /><span>任务</span></a-menu-item>
          <a-menu-item key="/capture"><EditOutlined /><span>速记</span></a-menu-item>
          <a-menu-item key="/projects"><FolderOutlined /><span>项目</span></a-menu-item>
          <a-menu-item key="/capabilities"><ThunderboltOutlined /><span>能力</span></a-menu-item>
          <a-menu-item key="/settings"><SettingOutlined /><span>设置</span></a-menu-item>
        </a-menu>

        <!-- ═══ 项目控制台（项目内模式时显示） ═══ -->
        <template v-if="projStore.projName && !collapsed">
          <div class="section-divider" />

          <!-- 返回 + 当前项目 -->
          <div class="proj-console-header">
            <a-button size="small" type="text" @click="exitProject" style="padding: 0 4px">
              <ArrowLeftOutlined />
            </a-button>
            <span class="proj-console-title">{{ projStore.projName }}</span>
          </div>

          <div class="proj-console-body">
            <!-- 子项目树 -->
            <div class="console-subsection">
              <div class="console-subsection-title">
                <span>🌳 子项目</span>
                <a-button size="small" type="text" style="font-size: 14px; padding: 0 2px; height: 20px" @click="showAddChild = true">
                  <PlusOutlined />
                </a-button>
              </div>
              <div class="console-sub-tree" v-if="currentSubTree.length > 0">
                <a-tree
                  :tree-data="currentSubTree"
                  :field-names="{ title: 'name', key: 'path', children: 'children' }"
                  default-expand-all
                  show-line
                  block-node
                  :selected-keys="[projStore.currentPath]"
                >
                  <template #title="{ name, path, fileCount }">
                    <div
                      class="sub-tree-node"
                      :class="{ active: path === projStore.currentPath }"
                      @click="enterProject(path)"
                    >
                      <FolderOutlined style="color: #faad14; font-size: 13px; flex-shrink: 0" />
                      <span class="sub-tree-name">{{ name }}</span>
                      <span v-if="fileCount > 0" class="sub-tree-count">{{ fileCount }}</span>
                    </div>
                  </template>
                </a-tree>
              </div>
              <div v-else class="console-empty">暂无子项目</div>
            </div>
          </div>

          <!-- 添加子项目弹窗 -->
          <a-modal
            v-model:open="showAddChild"
            title="添加子项目"
            @ok="addChildProject"
            @cancel="showAddChild = false"
            :confirm-loading="addChildLoading"
          >
            <a-input v-model:value="newChildName" placeholder="子项目名称" @pressEnter="addChildProject" />
          </a-modal>
        </template>

        <!-- ═══ 树形项目选择器（全局模式时显示） ═══ -->
        <template v-if="!projStore.projName && !collapsed">
          <div class="section-divider" />
          <div class="project-tree-panel">
            <div class="project-tree-header">
              <span>项目</span>
              <a-button size="small" type="text" style="font-size: 12px; padding: 0 4px; height: 20px" @click="refreshProjectTree">
                <ReloadOutlined :spin="treeRefreshing" />
              </a-button>
            </div>
            <div class="project-tree-body">
              <a-spin :spinning="!projStore.treeLoaded" size="small">
                <a-tree
                  v-if="projStore.treeData.length > 0"
                  :tree-data="projStore.treeData"
                  :field-names="{ title: 'name', key: 'path', children: 'children' }"
                  default-expand-all
                  show-line
                  block-node
                >
                  <template #title="{ name, path, fileCount }">
                    <div class="proj-tree-node" @click="enterProject(path)">
                      <FolderOutlined style="color: #faad14; font-size: 14px; flex-shrink: 0" />
                      <span class="proj-tree-name">{{ name }}</span>
                      <span v-if="fileCount > 0" class="proj-tree-count">{{ fileCount }}</span>
                    </div>
                  </template>
                </a-tree>
                <div v-else-if="projStore.treeLoaded" class="tree-empty">暂无项目</div>
              </a-spin>
            </div>
          </div>
        </template>

        <!-- 底部：Git 状态 + 暗色切换 -->
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
      <div v-if="consoleVisible" :style="{ position: 'fixed', bottom: 0, left: collapsed ? '80px' : '220px', right: 0, height: '240px', background: '#1e1e1e', borderTop: '1px solid #333', zIndex: 100, display: 'flex', flexDirection: 'column' }">
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
import { ref, watch, computed, provide, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { theme, message } from 'ant-design-vue';
import zhCN from 'ant-design-vue/es/locale/zh_CN';
import { useProjectStore } from '@/stores/project';
import {
  AppstoreOutlined, CheckSquareOutlined, EditOutlined,
  FolderOutlined, ThunderboltOutlined, SettingOutlined, BulbOutlined,
  ArrowLeftOutlined, PlusOutlined, ReloadOutlined,
} from '@ant-design/icons-vue';
import type { TreeNode } from '@/types/electron';

const router = useRouter();
const route = useRoute();
const collapsed = ref(false);
const projStore = useProjectStore();

projStore.loadProjects();
projStore.loadProjectTree();

const selectedKeys = ref<string[]>([route.path]);
// 暗色模式：优先读取 localStorage，否则跟随系统
const storedDark = localStorage.getItem('wiki-dashboard:dark');
const isDark = ref(storedDark !== null ? storedDark === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches);
const gitStatus = ref<any>(null);
const gitLoading = ref(false);

// 控制台
const consoleVisible = ref(false);
const consoleLines = ref<string[]>([]);
const cliRunning = ref(false);
const consoleEl = ref<HTMLElement>();

// 子项目添加
const showAddChild = ref(false);
const newChildName = ref('');
const addChildLoading = ref(false);
const treeRefreshing = ref(false);

function showConsole() { consoleVisible.value = true; }
function clearConsole() { consoleLines.value = []; }
function killCli() { (window as any).electronAPI?.cli?.kill(); }

provide('console', { showConsole, consoleLines, cliRunning });

// 监听 CLI 输出
window.addEventListener('message', (e) => {
  if (e.data.type === 'cli:output') {
    consoleLines.value.push(e.data.line);
    setTimeout(() => {
      if (consoleEl.value) consoleEl.value.scrollTop = consoleEl.value.scrollHeight;
    }, 50);
  }
  if (e.data.type === 'cli:done') {
    cliRunning.value = false;
    if (e.data.code === 0) consoleLines.value.push('── 执行完成 ──');
    else if (e.data.code === -1) consoleLines.value.push('── 已终止 ──');
    else consoleLines.value.push(`── 退出码: ${e.data.code} ──`);
  }
});

// 计算变更数
const changeCount = computed(() => {
  if (!gitStatus.value) return 0;
  const s = gitStatus.value;
  return (s.modified?.length || 0) + (s.added?.length || 0) + (s.deleted?.length || 0) + (s.untracked?.length || 0);
});

// 当前项目的子项目树（用于控制台）
const currentSubTree = computed(() => {
  if (!projStore.currentPath) return [];
  const node = projStore.findNode(projStore.treeData, projStore.currentPath);
  return node?.children || [];
});

// 全局 Git 状态
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

// 定时刷新 Git
setInterval(loadGitStatus, 30000);
loadGitStatus();

// 路由同步 store
watch(() => route.path, (val) => {
  selectedKeys.value = [val];
  // 如果是项目详情页，同步 store
  if (route.name === 'projectDetail') {
    const path = decodeURIComponent(route.params.path as string);
    if (projStore.currentPath !== path) {
      projStore.selectProject(path);
    }
  } else {
    // 离开项目详情页 → 清除 currentPath，回到全局模式
    projStore.clearProject();
  }
}, { immediate: true });

watch(isDark, (val) => {
  document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light');
  localStorage.setItem('wiki-dashboard:dark', String(val));
});

const themeConfig = computed(() => ({
  algorithm: isDark.value ? theme.darkAlgorithm : theme.defaultAlgorithm,
  token: {
    colorPrimary: '#cf7a4c',
    borderRadius: 4,
  },
}));

// ── 项目导航 ──
function enterProject(path: string) {
  projStore.selectProject(path);
  router.push(`/project/${encodeURIComponent(path)}`);
}

function exitProject() {
  const current = projStore.currentPath;
  const parts = current.split('/');
  // 顶级项目路径 3 段（PARA 管理/1. 项目/xxx），更深的是子项目
  if (parts.length > 3) {
    const parentPath = parts.slice(0, -1).join('/');
    projStore.selectProject(parentPath);
    router.push(`/project/${encodeURIComponent(parentPath)}`);
  } else {
    projStore.clearProject();
    router.push('/');
  }
}

// ── 菜单点击 ──
function onMenuClick({ key }: { key: string }) {
  router.push(key);
}

// ── 子项目添加 ──
async function addChildProject() {
  const name = newChildName.value.trim();
  if (!name) return;
  addChildLoading.value = true;
  try {
    const api = (window as any).electronAPI;
    const path = `${projStore.currentPath}/${name}`;
    await api.vault.createProject(path, `# ${name}\n\n## 目标\n\n## 任务\n\n## 记录\n`);
    newChildName.value = '';
    showAddChild.value = false;
    message.success(`子项目「${name}」已创建`);
    await projStore.refreshTree();
  } catch (e: any) {
    message.error(`创建失败：${e?.message || e}`);
  } finally {
    addChildLoading.value = false;
  }
}

async function refreshProjectTree() {
  treeRefreshing.value = true;
  await projStore.refreshTree();
  treeRefreshing.value = false;
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
  border-bottom: 1px solid rgba(0,0,0,0.06);
  margin-bottom: 8px;
}

.section-divider {
  height: 1px;
  background: rgba(0,0,0,0.06);
  margin: 4px 12px;
}

/* ═══ 项目控制台样式 ═══ */
.proj-console-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  margin-bottom: 4px;
}
.proj-console-title {
  font-weight: 600;
  font-size: 14px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.proj-console-body {
  padding: 0 12px;
  flex: 1;
  overflow-y: auto;
}
.console-section-label {
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  padding: 8px 0 4px 0;
}
.console-subsection {
  margin-top: 4px;
}
.console-subsection-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 13px;
  font-weight: 500;
  margin-bottom: 2px;
}
.console-sub-tree {
  max-height: 300px;
  overflow-y: auto;
}
.console-empty {
  padding: 8px 0;
  font-size: 12px;
  color: #999;
}

/* 子项目树节点 */
.sub-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border-radius: 4px;
  cursor: pointer;
  max-width: 160px;
  transition: background 0.12s;
}
.sub-tree-node:hover {
  background: rgba(0, 0, 0, 0.04);
}
.sub-tree-node.active {
  background: var(--primary-1, #fff2e8);
}
.sub-tree-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}
.sub-tree-count {
  font-size: 10px;
  color: #999;
  flex-shrink: 0;
}

/* ═══ 全局项目树面板 ═══ */
.project-tree-panel {
  margin-top: 4px;
  padding: 0 4px;
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.project-tree-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 11px;
  color: #999;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}
.project-tree-body {
  flex: 1;
  overflow-y: auto;
  padding: 0 4px 4px;
}
.proj-tree-node {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 4px;
  border-radius: 4px;
  cursor: pointer;
  max-width: 160px;
  transition: background 0.12s;
}
.proj-tree-node:hover {
  background: rgba(0, 0, 0, 0.04);
}
.proj-tree-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
}
.proj-tree-count {
  font-size: 10px;
  color: #999;
  flex-shrink: 0;
}
.tree-empty {
  padding: 12px 8px;
  font-size: 12px;
  color: #999;
  text-align: center;
}
</style>
