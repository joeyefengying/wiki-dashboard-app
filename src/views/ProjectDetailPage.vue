<template>
  <div>
    <a-page-header
      :title="projName"
      @back="router.back()"
    >
      <template #tags>
        <a-tag>{{ fileCount }} 文件</a-tag>
        <a-tag color="blue">{{ tasks.length }} 待办</a-tag>
      </template>
      <template #extra>
        <a-space>
          <a-button size="small" @click="openReadme">📄 README</a-button>
          <a-button size="small" @click="showAddTask = !showAddTask">+ 添加任务</a-button>
        </a-space>
      </template>
    </a-page-header>

    <!-- 添加任务 -->
    <a-card v-if="showAddTask" size="small" style="margin-bottom: 12px">
      <a-space>
        <a-input v-model:value="newTaskText" placeholder="任务内容" style="width: 300px" @pressEnter="addTask" />
        <a-select v-model:value="newTaskPrio" style="width: 100px" placeholder="优先级">
          <a-select-option value="">无</a-select-option>
          <a-select-option value="⏫">⏫ 高</a-select-option>
          <a-select-option value="🔼">🔼 中</a-select-option>
          <a-select-option value="🔽">🔽 低</a-select-option>
        </a-select>
        <a-button type="primary" size="small" @click="addTask">添加</a-button>
      </a-space>
    </a-card>

    <!-- 两栏 -->
    <a-row :gutter="16">
      <!-- 左：README 预览 -->
      <a-col :span="14">
        <a-card title="README" size="small">
          <div v-if="readmeContent" class="markdown-preview" v-html="readmeHtml" />
          <a-empty v-else description="暂无 README" />
        </a-card>

        <!-- 子项目 -->
        <a-card title="子项目" size="small" style="margin-top: 12px" v-if="subProjects.length > 0">
          <a-tree :tree-data="subProjects" :field-names="{ title: 'name', key: 'path', children: 'children' }" default-expand-all show-line block-node>
            <template #title="{ name, path }">
              <a @click="router.push(`/project/${encodeURIComponent(path)}`)">{{ name }}</a>
            </template>
          </a-tree>
        </a-card>
      </a-col>

      <!-- 右：任务列表 -->
      <a-col :span="10">
        <a-card title="关联任务" size="small">
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
          <a-empty v-if="tasks.length === 0" description="暂无关联任务" />
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { marked } from 'marked';
import { message } from 'ant-design-vue';
import type { ParsedTask, TreeNode } from '@/types/electron';

const router = useRouter();
const route = useRoute();
const api = window.electronAPI;

const projPath = computed(() => decodeURIComponent(route.params.path as string));
const projName = computed(() => projPath.value.split('/').pop() || '');

const readmeContent = ref('');
const readmeHtml = ref('');
const fileCount = ref(0);
const tasks = ref<ParsedTask[]>([]);
const subProjects = ref<TreeNode[]>([]);

const showAddTask = ref(false);
const newTaskText = ref('');
const newTaskPrio = ref('');

const taskColumns = [
  { title: '', dataIndex: 'done', key: 'done', width: 40 },
  { title: '任务', dataIndex: 'text', key: 'text', ellipsis: true },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 60 },
  { title: '来源', dataIndex: 'file', key: 'file', width: 100, ellipsis: true },
];

onMounted(async () => {
  await loadProject();
});

async function loadProject() {
  const p = projPath.value;
  // 读 README
  try {
    const md = await api.vault.readFile(p + '/README.md');
    readmeContent.value = md;
    readmeHtml.value = await marked.parse(md);
  } catch { /* no README */ }

  // 统计
  const entries = await api.vault.listDir(p);
  fileCount.value = entries.length;

  // 搜索关联任务
  const allTasks = await api.vault.getAllOpenTasks();
  const name = projName.value;
  console.log('[ProjectDetail] allOpenTasks:', allTasks.length, 'projName:', name);
  // 也检查 text 原始内容是否包含项目关联标记 🗂
  tasks.value = allTasks
    .filter(t => {
      const match = t.text.includes(name) || t.file.includes(name) || (t as any).raw?.includes(name);
      return match;
    })
    .map(t => {
      const pm = t.text.match(/^(⏫|🔼|🔽)/);
      const dm = t.text.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
      return {
        text: t.text.replace(/- \[ \] /, '').trim(),
        done: false,
        priority: pm ? pm[1] : '',
        due: dm ? dm[1] : '',
        raw: (t as any).raw || '',
        file: t.file,
      } as any;
    });

  // 子项目树
  const allDirs = await api.vault.listDir(p);
  const dirs = allDirs.filter(e => e.isDir);
  subProjects.value = dirs.map(d => ({ name: d.name, path: d.path, children: [], fileCount: 0, isDir: true }));
}

function openReadme() {
  api.vault.openFile(projPath.value + '/README.md');
}

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
  showAddTask.value = false;
  message.success('已添加');
  await loadProject();
}

async function toggleTask(task: any) {
  if (!task.file) return;
  const content = await api.vault.readFile(task.file);
  const toggled = task.done
    ? task.raw.replace(/- \[x\]/, '- [ ]')
    : task.raw.replace(/- \[ \]/, '- [x]');
  await api.vault.writeFile(task.file, content.replace(task.raw, toggled));
  await loadProject();
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
