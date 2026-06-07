<template>
  <div>
    <a-page-header :title="projName" @back="router.back()" style="padding: 0 0 8px 0">
      <template #tags>
        <a-tag>{{ fileCount }} 文件</a-tag>
        <a-tag color="blue">{{ tasks.length }} 待办</a-tag>
      </template>
    </a-page-header>

    <a-tabs v-model:activeKey="activeTab">
      <!-- Tab 1: 任务 -->
      <a-tab-pane key="tasks" tab="任务">
        <a-space style="margin-bottom: 12px">
          <a-input v-model:value="newTaskText" placeholder="任务内容" style="width: 280px" @pressEnter="addTask" />
          <a-select v-model:value="newTaskPrio" style="width: 100px" placeholder="优先级">
            <a-select-option value="">无</a-select-option>
            <a-select-option value="⏫">⏫ 高</a-select-option>
            <a-select-option value="🔼">🔼 中</a-select-option>
            <a-select-option value="🔽">🔽 低</a-select-option>
          </a-select>
          <a-button type="primary" size="small" @click="addTask">添加</a-button>
        </a-space>

        <a-table
          :columns="taskColumns"
          :data-source="tasks"
          :pagination="false"
          size="small"
          row-key="raw"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'done'">
              <a-checkbox :checked="record.done" @change="toggleTask(record)" />
            </template>
            <template v-else-if="column.key === 'text'">
              <span :style="{ textDecoration: record.done ? 'line-through' : 'none' }">{{ record.text }}</span>
            </template>
          </template>
        </a-table>
        <a-empty v-if="tasks.length === 0" description="暂无任务" />
      </a-tab-pane>

      <!-- Tab 2: 速记 -->
      <a-tab-pane key="capture" tab="速记">
        <div style="margin-bottom: 8px; display: flex; gap: 6px">
          <a-button size="small" @click="insertTpl('')">💡 想法</a-button>
          <a-button size="small" @click="insertTpl('- [ ] ')">✅ 待办</a-button>
          <a-button size="small" @click="insertTpl('> [!important]\n> ')">📌 重点</a-button>
          <a-button size="small" @click="insertTpl('- [ ] 阅读：')">🔗 链接</a-button>
        </div>
        <a-textarea v-model:value="captureContent" :rows="6" placeholder="Ctrl+Enter 保存…" @keydown="onCaptureKey" />
        <div style="margin-top: 8px; display: flex; gap: 8px; align-items: center">
          <a-input v-model:value="captureTags" placeholder="标签（可选）" style="flex: 1" size="small" />
          <a-button type="primary" size="small" @click="saveCapture" :loading="captureSaving">保存</a-button>
        </div>
      </a-tab-pane>

      <!-- Tab 3: 子项目 -->
      <a-tab-pane key="sub" tab="子项目">
        <a-space style="margin-bottom: 8px">
          <a-input v-model:value="newChildName" placeholder="子项目名称" size="small" style="width: 200px" @pressEnter="addChild" />
          <a-button size="small" type="primary" @click="addChild">+ 添加</a-button>
        </a-space>
        <a-tree
          v-if="subProjects.length > 0"
          :tree-data="subProjects"
          :field-names="{ title: 'name', key: 'path', children: 'children' }"
          default-expand-all show-line block-node
        >
          <template #title="{ name, path }">
            <div style="display: flex; align-items: center; gap: 8px; width: 100%">
              <a @click="router.push(`/project/${encodeURIComponent(path)}`)" style="flex: 1">{{ name }}</a>
              <a-space :size="2" style="flex-shrink: 0" @click.stop>
                <a-button size="small" type="link" @click.stop="router.push(`/project/${encodeURIComponent(path)}`)"><FolderOpenOutlined /></a-button>
                <a-button size="small" type="link" danger @click.stop="deleteChild(path)"><DeleteOutlined /></a-button>
              </a-space>
            </div>
          </template>
        </a-tree>
        <a-empty v-else description="暂无子项目" />
      </a-tab-pane>

      <!-- Tab 4: 文件 -->
      <a-tab-pane key="files" tab="文件">
        <a-list :data-source="files" size="small">
          <template #renderItem="{ item }">
            <a-list-item>
              <a @click="previewPath = item.path; previewVisible = true">{{ item.name }}</a>
            </a-list-item>
          </template>
        </a-list>
        <a-empty v-if="files.length === 0" description="暂无文件" />
      </a-tab-pane>

      <!-- Tab 5: 介绍 -->
      <a-tab-pane key="readme" tab="介绍">
        <div v-if="readmeContent" class="markdown-preview" v-html="readmeHtml" />
        <a-empty v-else description="暂无 README" />
      </a-tab-pane>
    </a-tabs>

    <FilePreview v-model:visible="previewVisible" :file-path="previewPath" />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { marked } from 'marked';
import { message } from 'ant-design-vue';
import { FolderOpenOutlined, DeleteOutlined } from '@ant-design/icons-vue';
import FilePreview from '@/components/FilePreview.vue';
import type { FileInfo } from '@/types/electron';

const router = useRouter();
const route = useRoute();
const api = window.electronAPI;

const projPath = computed(() => decodeURIComponent(route.params.path as string));
const projName = computed(() => projPath.value.split('/').pop() || '');

const activeTab = ref('tasks');

// 任务
const newTaskText = ref('');
const newTaskPrio = ref('');
const tasks = ref<any[]>([]);

// 速记
const captureContent = ref('');
const captureTags = ref('');
const captureSaving = ref(false);

// 子项目
const subProjects = ref<any[]>([]);

// 文件
const files = ref<FileInfo[]>([]);

// 介绍
const readmeContent = ref('');
const readmeHtml = ref('');

const fileCount = ref(0);
const previewVisible = ref(false);
const previewPath = ref('');
const newChildName = ref('');

const taskColumns = [
  { title: '', dataIndex: 'done', key: 'done', width: 40 },
  { title: '任务', dataIndex: 'text', key: 'text', ellipsis: true },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 60 },
  { title: '来源', dataIndex: 'file', key: 'file', width: 100, ellipsis: true },
];

onMounted(async () => { await loadAll(); });

async function loadAll() {
  const p = projPath.value;
  const name = projName.value;

  // 介绍
  try {
    const md = await api.vault.readFile(p + '/README.md');
    readmeContent.value = md;
    readmeHtml.value = await marked.parse(md);
  } catch { /* no README */ }

  // 文件
  files.value = await api.vault.listDir(p);
  fileCount.value = files.value.length;

  // 任务
  const allTasks = await api.vault.getAllOpenTasks();
  tasks.value = allTasks
    .filter(t => t.text.includes(name) || t.file.includes(name) || (t as any).raw?.includes(name))
    .map(t => ({
      text: t.text.replace(/- \[ \] /, '').trim(),
      done: false,
      priority: '',
      raw: (t as any).raw || '',
      file: t.file,
    }));

  // 子项目
  const dirs = files.value.filter(e => e.isDir);
  subProjects.value = dirs.map(d => ({ name: d.name, path: d.path, children: [], fileCount: 0, isDir: true }));
}

// ── 任务操作 ──

async function addTask() {
  const text = newTaskText.value.trim();
  if (!text) return;
  let line = `- [ ] ${text}`;
  if (newTaskPrio.value) line += ` ${newTaskPrio.value}`;
  line += ` 🗂 [[${projPath.value}/README|${projName.value}]]`;
  const dailyPath = await api.vault.ensureDailyFile();
  await api.vault.appendToSection(dailyPath, '日常记录', line);
  newTaskText.value = '';
  newTaskPrio.value = '';
  message.success('已添加');
  await loadAll();
}

async function toggleTask(task: any) {
  if (!task.file || !task.raw) return;
  const content = await api.vault.readFile(task.file);
  const toggled = task.done
    ? task.raw.replace(/- \[x\]/, '- [ ]')
    : task.raw.replace(/- \[ \]/, '- [x]');
  await api.vault.writeFile(task.file, content.replace(task.raw, toggled));
  await loadAll();
}

// ── 速记 ──

function insertTpl(tpl: string) {
  captureContent.value += (captureContent.value ? '\n' : '') + tpl;
}

async function saveCapture() {
  if (!captureContent.value.trim()) return;
  captureSaving.value = true;
  try {
    let text = captureContent.value.trim();
    if (captureTags.value.trim()) {
      text += ' ' + captureTags.value.trim().split(/[,，]/).map(t => t.trim()).filter(Boolean).map(t => `#${t}`).join(' ');
    }
    text += `\n🗂 [[${projPath.value}/README|${projName.value}]]`;
    const dailyPath = await api.vault.ensureDailyFile();
    await api.vault.appendToSection(dailyPath, '日常记录', `\n${text}\n`);
    captureContent.value = '';
    captureTags.value = '';
    message.success('已保存');
  } finally {
    captureSaving.value = false;
  }
}

// ── 子项目操作 ──

async function addChild() {
  const name = newChildName.value.trim();
  if (!name) return;
  const path = `${projPath.value}/${name}`;
  await api.vault.createProject(path, `# ${name}\n\n## 目标\n\n## 任务\n\n## 记录\n`);
  newChildName.value = '';
  message.success(`子项目「${name}」已创建`);
  await loadAll();
}

async function deleteChild(path: string) {
  const name = path.split('/').pop();
  if (!confirm(`确认删除「${name}」？`)) return;
  await api.vault.deleteProject(path);
  message.success('已删除');
  await loadAll();
}

function onCaptureKey(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    saveCapture();
  }
}
</script>

<style scoped>
.markdown-preview { font-size: 13px; line-height: 1.7; }
.markdown-preview :deep(h1) { font-size: 1.4em; }
.markdown-preview :deep(h2) { font-size: 1.15em; margin: 12px 0 6px; }
.markdown-preview :deep(p) { margin: 6px 0; }
.markdown-preview :deep(code) { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; }
.markdown-preview :deep(pre) { background: #f5f5f5; padding: 10px; border-radius: 4px; overflow-x: auto; }
</style>
