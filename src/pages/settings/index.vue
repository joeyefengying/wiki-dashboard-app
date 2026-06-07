<template>
  <div>
    <h2 style="margin-bottom: 16px">设置</h2>

    <!-- 外观 -->
    <a-card title="外观" size="small" style="margin-bottom: 16px">
      <a-list size="small">
        <a-list-item>
          <template #actions>
            <a-switch v-model:checked="darkMode" @change="toggleDark" />
          </template>
          <a-list-item-meta title="暗色模式" description="切换深色 / 浅色主题" />
        </a-list-item>
      </a-list>
    </a-card>

    <!-- Vault -->
    <a-card title="Vault 信息" size="small" style="margin-bottom: 16px">
      <a-descriptions :column="1" size="small" bordered>
        <a-descriptions-item label="Vault 根路径">
          <a-typography-text copyable code>{{ vaultRoot }}</a-typography-text>
        </a-descriptions-item>
        <a-descriptions-item label="项目目录">
          <code>PARA 管理/1. 项目</code>
        </a-descriptions-item>
        <a-descriptions-item label="存档目录">
          <code>PARA 管理/4. 存档</code>
        </a-descriptions-item>
        <a-descriptions-item label="日报目录">
          <code>周期笔记/</code>
        </a-descriptions-item>
      </a-descriptions>
    </a-card>

    <!-- 快捷操作 -->
    <a-card title="快捷操作" size="small" style="margin-bottom: 16px">
      <a-space direction="vertical" style="width: 100%">
        <a-button block @click="openVaultFolder">
          <FolderOpenOutlined /> 在文件管理器中打开 Vault
        </a-button>
        <a-button block @click="openObsidian">
          <AppstoreOutlined /> 在 Obsidian 中打开
        </a-button>
      </a-space>
    </a-card>

    <!-- 关于 -->
    <a-card title="关于" size="small">
      <a-descriptions :column="1" size="small">
        <a-descriptions-item label="版本">1.1.0</a-descriptions-item>
        <a-descriptions-item label="技术栈">Electron 42 + Vue 3.5 + Ant Design Vue 4</a-descriptions-item>
        <a-descriptions-item label="Vault 引擎">文件系统直读（Node.js fs）</a-descriptions-item>
        <a-descriptions-item label="CLI 集成">Claude CLI 子进程</a-descriptions-item>
      </a-descriptions>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';
import { FolderOpenOutlined, AppstoreOutlined } from '@ant-design/icons-vue';

const api = window.electronAPI;
const vaultRoot = ref('E:/project/obsidian-wiki');
const darkMode = ref(false);

onMounted(() => {
  darkMode.value = localStorage.getItem('wiki-dashboard:dark') === 'true';
});

function toggleDark(val: boolean) {
  document.documentElement.setAttribute('data-theme', val ? 'dark' : 'light');
  localStorage.setItem('wiki-dashboard:dark', String(val));
}

async function openVaultFolder() {
  try {
    await api.vault.openFile('');
    message.success('已在文件管理器中打开');
  } catch {
    message.error('无法打开');
  }
}

async function openObsidian() {
  try {
    await api.vault.openExternal('obsidian://open?vault=obsidian-wiki');
    message.success('已尝试打开 Obsidian');
  } catch {
    message.error('无法打开 Obsidian');
  }
}
</script>
