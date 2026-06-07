<template>
  <div>
    <h2 style="margin-bottom: 16px">项目树</h2>
    <a-card>
      <a-tree
        :tree-data="treeData"
        :field-names="{ title: 'name', key: 'path', children: 'children' }"
        default-expand-all
        show-line
        block-node
      >
        <template #title="{ name, fileCount, path }">
          <span style="display: inline-flex; align-items: center; gap: 8px">
            <FolderOutlined style="color: #faad14" />
            <span>{{ name }}</span>
            <a-tag color="default" size="small">{{ fileCount }} 文件</a-tag>
          </span>
        </template>
      </a-tree>
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { FolderOutlined } from '@ant-design/icons-vue';
import type { TreeNode } from '@/types/electron';

const treeData = ref<TreeNode[]>([]);

onMounted(async () => {
  treeData.value = await window.electronAPI.vault.buildProjectTree();
});
</script>
