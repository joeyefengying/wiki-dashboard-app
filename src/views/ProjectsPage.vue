<template>
  <div>
    <h2 style="margin-bottom: 16px">项目树</h2>

    <!-- 创建项目 -->
    <a-space style="width: 100%; margin-bottom: 16px">
      <a-input
        v-model:value="newProjName"
        placeholder="项目名 或 vault内路径（导入文件夹）…"
        style="flex: 1"
        @pressEnter="createProject"
      />
      <a-button type="primary" @click="createProject">创建</a-button>
    </a-space>

    <!-- 项目树 -->
    <a-card size="small">
      <a-spin :spinning="loading">
        <a-tree
          v-if="treeData.length > 0"
          :tree-data="treeData"
          :field-names="{ title: 'name', key: 'path', children: 'children' }"
          default-expand-all
          show-line
          block-node
          draggable
          @drop="onDrop"
        >
          <template #title="{ name, fileCount, path }">
            <a-dropdown :trigger="['contextmenu']">
              <span style="display: inline-flex; align-items: center; gap: 8px; padding: 2px 0">
                <FolderOutlined style="color: #faad14" />
                <span>{{ name }}</span>
                <a-tag color="default" style="font-size: 10px">{{ fileCount }} 文件</a-tag>
              </span>
              <template #overlay>
                <a-menu @click="({ key }: { key: string }) => handleMenu(key, path)">
                  <a-menu-item key="open">📄 打开 README</a-menu-item>
                  <a-menu-item key="addChild">➕ 添加子项目</a-menu-item>
                  <a-menu-divider />
                  <a-menu-item key="archive" danger>🗃 归档</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </a-tree>
        <a-empty v-else description="暂无项目" />
      </a-spin>
    </a-card>

    <!-- 添加子项目弹窗 -->
    <a-modal
      v-model:open="childModalVisible"
      title="添加子项目"
      @ok="createChild"
      @cancel="childModalVisible = false"
    >
      <a-input v-model:value="childName" placeholder="子项目名称" />
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message, Modal } from 'ant-design-vue';
import { FolderOutlined } from '@ant-design/icons-vue';
import type { TreeNode } from '@/types/electron';

const api = window.electronAPI;

const treeData = ref<TreeNode[]>([]);
const loading = ref(true);
const newProjName = ref('');

// 子项目弹窗
const childModalVisible = ref(false);
const childName = ref('');
const childParentPath = ref('');

onMounted(async () => {
  await loadTree();
});

async function loadTree() {
  loading.value = true;
  try {
    treeData.value = await api.vault.buildProjectTree();
  } finally {
    loading.value = false;
  }
}

async function createProject() {
  const raw = newProjName.value.trim();
  if (!raw) return;

  let name = raw;
  let readme = `# ${name}\n\n## 目标\n\n\n\n## 任务\n\n\`\`\`tasks\nnot done\ndescription includes ${name}\n\`\`\`\n\n## 记录\n`;

  // 检查是否是已有目录 → 导入模式
  let entries: Array<{ name: string; path: string; isDir: boolean }> = [];
  try { entries = await api.vault.listDir(raw); } catch { /* ignore */ }

  if (entries.length > 0 && entries.some(e => e.isDir)) {
    name = raw.split('/').pop() || name;
    const files = entries.filter(e => !e.isDir && e.name.endsWith('.md'));
    const dirs = entries.filter(e => e.isDir);
    readme = `# ${name}\n\n> 来源：\`${raw}/\`（${entries.length} 条目 / ${dirs.length} 子目录）\n\n## 目标\n\n\n\n`;
    if (dirs.length > 0) {
      readme += `## 子模块\n\n`;
      for (const d of dirs.slice(0, 12)) readme += `- **${d.name}**\n`;
      readme += `\n`;
    }
    if (files.length > 0) {
      readme += `## 关键文档\n\n`;
      for (const f of files.slice(0, 10)) readme += `- [[${f.path}|${f.name.replace('.md', '')}]]\n`;
      readme += `\n`;
    }
    readme += `## 任务\n\n\`\`\`tasks\nnot done\ndescription includes ${name}\n\`\`\`\n\n## 记录\n`;
  }

  try {
    await api.vault.createProject(`PARA 管理/1. 项目/${name}`, readme);
    newProjName.value = '';
    message.success(`项目「${name}」已创建`);
    await loadTree();
  } catch (e: any) {
    message.error(`创建失败：${e?.message || e}`);
  }
}

function handleMenu(key: string, path: string) {
  switch (key) {
    case 'open':
      api.vault.readFile(path + '/README.md');
      break;
    case 'addChild':
      childParentPath.value = path;
      childName.value = '';
      childModalVisible.value = true;
      break;
    case 'archive':
      Modal.confirm({
        title: '确认归档',
        content: `将「${path.split('/').pop()}」归档到存档目录？`,
        onOk: async () => {
          const name = path.split('/').pop()!;
          await api.vault.moveProject(path, `PARA 管理/4. 存档/${name}`);
          message.success('已归档');
          await loadTree();
        },
      });
      break;
  }
}

async function createChild() {
  const name = childName.value.trim();
  if (!name) return;
  const readme = `# ${name}\n\n## 目标\n\n\n\n## 任务\n\n\`\`\`tasks\nnot done\ndescription includes ${name}\n\`\`\`\n\n## 记录\n`;
  await api.vault.createProject(`${childParentPath.value}/${name}`, readme);
  childModalVisible.value = false;
  message.success(`子项目「${name}」已创建`);
  await loadTree();
}

function onDrop(info: any) {
  // 拖拽排序占位（VaultService 暂不支持拖拽，后续实现）
  message.info('拖拽排序功能开发中');
}
</script>
