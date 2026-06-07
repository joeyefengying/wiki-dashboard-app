<template>
  <div>
    <h2 style="margin-bottom: 16px">项目树</h2>

    <!-- 创建项目（仅活跃视图） -->
    <a-space v-if="viewMode === 'active'" style="width: 100%; margin-bottom: 16px">
      <a-input
        v-model:value="newProjName"
        placeholder="项目名 或 vault内路径（导入文件夹）…"
        style="flex: 1"
        @pressEnter="createProject"
      />
      <a-button type="primary" @click="createProject">创建</a-button>
    </a-space>

    <!-- 活跃 / 归档切换 -->
    <div style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px">
      <a-radio-group v-model:value="viewMode" size="small" button-style="solid">
        <a-radio-button value="active">活跃项目</a-radio-button>
        <a-radio-button value="archived">归档项目</a-radio-button>
      </a-radio-group>
      <span v-if="viewMode === 'archived' && treeData.length > 0" style="font-size: 12px; color: #999">
        {{ treeData.length }} 个归档
      </span>
    </div>

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
          @select="onTreeSelect"
          @drop="onDrop"
        >
          <template #title="{ name, fileCount, path }">
            <a-dropdown :trigger="['contextmenu']">
              <div style="display: flex; align-items: center; gap: 8px; width: 100%">
                <span style="display: inline-flex; align-items: center; gap: 6px; flex: 1">
                  <FolderOutlined :style="{ color: viewMode === 'archived' ? '#bbb' : '#faad14' }" />
                  <span :style="{ color: viewMode === 'archived' ? '#999' : '' }">{{ name }}</span>
                  <a-tag v-if="viewMode === 'active'" color="default" style="font-size: 10px">{{ fileCount }} 文件</a-tag>
                </span>
                <a-space :size="2" style="flex-shrink: 0" @click.stop>
                  <a-button size="small" type="link" @click.stop="handleMenu('open', path)"><FolderOpenOutlined /></a-button>
                  <a-button v-if="viewMode === 'active'" size="small" type="link" @click.stop="handleMenu('addChild', path)"><PlusOutlined /></a-button>
                  <a-button size="small" type="link" danger @click.stop="handleMenu('delete', path)"><DeleteOutlined /></a-button>
                  <a-button
                    v-if="viewMode === 'active'"
                    size="small" type="link"
                    @click.stop="handleMenu('archive', path)"
                  ><InboxOutlined /></a-button>
                  <a-button
                    v-else
                    size="small" type="link"
                    style="color: #52c41a"
                    @click.stop="handleMenu('restore', path)"
                  ><UndoOutlined /></a-button>
                </a-space>
              </div>
              <template #overlay>
                <a-menu @click="({ key }: { key: string }) => handleMenu(key, path)">
                  <a-menu-item key="open">📄 打开 README</a-menu-item>
                  <a-menu-item v-if="viewMode === 'active'" key="addChild">➕ 添加子项目</a-menu-item>
                  <a-menu-divider />
                  <a-menu-item v-if="viewMode === 'active'" key="archive">🗃 归档</a-menu-item>
                  <a-menu-item v-else key="restore">↩ 恢复</a-menu-item>
                  <a-menu-item key="delete" danger>🗑 删除</a-menu-item>
                </a-menu>
              </template>
            </a-dropdown>
          </template>
        </a-tree>
        <a-empty v-else :description="viewMode === 'archived' ? '暂无归档项目' : '暂无项目'" />
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

    <FilePreview v-model:visible="previewVisible" :file-path="previewPath" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { useRouter } from 'vue-router';
import { message, Modal } from 'ant-design-vue';
import { FolderOutlined, FolderOpenOutlined, PlusOutlined, DeleteOutlined, InboxOutlined, UndoOutlined } from '@ant-design/icons-vue';
import FilePreview from '@/components/file-preview/index.vue';
import type { TreeNode } from '@/types/electron';

const api = window.electronAPI;
const router = useRouter();

const treeData = ref<TreeNode[]>([]);
const loading = ref(true);
const newProjName = ref('');

// 视图切换
const viewMode = ref<'active' | 'archived'>('active');

// 子项目弹窗
const childModalVisible = ref(false);
const childName = ref('');
const childParentPath = ref('');

// 文件预览
const previewVisible = ref(false);
const previewPath = ref('');

onMounted(async () => {
  await loadTree();
});

watch(viewMode, () => loadTree());

async function loadTree() {
  loading.value = true;
  try {
    const dir = viewMode.value === 'archived'
      ? 'PARA 管理/4. 存档'
      : undefined; // 默认活跃目录
    treeData.value = await api.vault.buildProjectTree(dir);
  } finally {
    loading.value = false;
  }
}

async function createProject() {
  const raw = newProjName.value.trim();
  console.log('[createProject] raw:', raw);
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
    console.log('[createProject] creating:', `PARA 管理/1. 项目/${name}`);
    await api.vault.createProject(`PARA 管理/1. 项目/${name}`, readme);
    console.log('[createProject] success');
    newProjName.value = '';
    message.success(`项目「${name}」已创建`);
    await loadTree();
  } catch (e: any) {
    console.error('[createProject] error:', e);
    message.error(`创建失败：${e?.message || e}`);
  }
}

function handleMenu(key: string, path: string) {
  switch (key) {
    case 'open':
      previewPath.value = path + '/README.md';
      previewVisible.value = true;
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
    case 'restore':
      Modal.confirm({
        title: '确认恢复',
        content: `将「${path.split('/').pop()}」恢复到活跃项目？`,
        onOk: async () => {
          const name = path.split('/').pop()!;
          await api.vault.moveProject(path, `PARA 管理/1. 项目/${name}`);
          message.success('已恢复');
          await loadTree();
        },
      });
      break;
    case 'delete':
      Modal.confirm({
        title: '确认删除',
        content: `永久删除「${path.split('/').pop()}」及其所有子文件？此操作不可撤销。`,
        okText: '删除',
        okType: 'danger',
        cancelText: '取消',
        onOk: async () => {
          await api.vault.deleteProject(path);
          message.success('已删除');
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

function onTreeSelect(selectedKeys: string[], info: any) {
  if (selectedKeys.length > 0) {
    const path = selectedKeys[0];
    router.push(`/project/${encodeURIComponent(path)}`);
  }
}

async function onDrop(info: any) {
  const dragPath: string = info.dragNode?.key || info.dragNodesKeys?.[0];
  const targetPath: string = info.node?.key;
  if (!dragPath || !targetPath || dragPath === targetPath) return;

  // 防止循环：不能拖到自己的子目录
  if (targetPath.startsWith(dragPath + '/')) {
    message.warning('不能将项目移动到自己的子目录中');
    return;
  }

  const name = dragPath.split('/').pop()!;
  let newPath: string;

  if (info.dropToGap) {
    // 同级排列：移到目标同级目录
    const parentPath = targetPath.split('/').slice(0, -1).join('/');
    newPath = parentPath ? `${parentPath}/${name}` : name;
  } else {
    // 放入内部：成为目标项目的子项目
    newPath = `${targetPath}/${name}`;
  }

  if (dragPath === newPath) return;

  try {
    await api.vault.moveProject(dragPath, newPath);
    message.success(`「${name}」已移动`);
    await loadTree();
  } catch (e: any) {
    message.error(`移动失败：${e?.message || e}`);
  }
}
</script>
