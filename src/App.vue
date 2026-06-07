<template>
  <a-layout style="height: 100vh; overflow: hidden">
    <a-layout-sider
      v-model:collapsed="collapsed"
      collapsible
      theme="light"
      :width="200"
    >
      <div class="logo">
        <span v-if="!collapsed">📋 Wiki Dashboard</span>
        <span v-else>📋</span>
      </div>
      <a-menu
        v-model:selectedKeys="selectedKeys"
        mode="inline"
        @click="onMenuClick"
      >
        <a-menu-item key="/">
          <AppstoreOutlined />
          <span>概览</span>
        </a-menu-item>
        <a-menu-item key="/tasks">
          <CheckSquareOutlined />
          <span>任务</span>
        </a-menu-item>
        <a-menu-item key="/capture">
          <EditOutlined />
          <span>速记</span>
        </a-menu-item>
        <a-menu-item key="/projects">
          <FolderOutlined />
          <span>项目</span>
        </a-menu-item>
        <a-menu-item key="/capabilities">
          <ThunderboltOutlined />
          <span>能力</span>
        </a-menu-item>
        <a-menu-item key="/settings">
          <SettingOutlined />
          <span>设置</span>
        </a-menu-item>
      </a-menu>
    </a-layout-sider>
    <a-layout>
      <a-layout-content style="padding: 24px; overflow-y: auto; background: var(--bg-color, #f5f5f5)">
        <router-view />
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import {
  AppstoreOutlined, CheckSquareOutlined, EditOutlined,
  FolderOutlined, ThunderboltOutlined, SettingOutlined,
} from '@ant-design/icons-vue';

const router = useRouter();
const route = useRoute();
const collapsed = ref(false);
const selectedKeys = ref<string[]>([route.path]);

watch(() => route.path, (val) => {
  selectedKeys.value = [val];
});

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
