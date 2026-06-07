<template>
  <div>
    <h2 style="margin-bottom: 16px">任务管理</h2>

    <!-- 日报标题行 -->
    <a-space style="margin-bottom: 12px">
      <span style="font-weight: 600">📋 日报</span>
      <a-tag>{{ todayStr }}</a-tag>
    </a-space>

    <!-- 项目标签行 -->
    <div style="margin-bottom: 12px; display: flex; flex-wrap: wrap; gap: 6px; align-items: center">
      <span style="font-size: 12px; color: #999; margin-right: 4px">关联项目：</span>
      <a-button
        :type="!selectedProject ? 'primary' : 'default'"
        size="small"
        @click="selectProject('')"
      >全部</a-button>
      <a-button
        v-for="p in projects"
        :key="p.path"
        :type="selectedProject === p.path ? 'primary' : 'default'"
        size="small"
        @click="selectProject(p.path)"
      >{{ p.name }}</a-button>
    </div>

    <!-- 添加任务行 -->
    <a-space style="width: 100%; margin-bottom: 16px">
      <a-input
        v-model:value="newTaskText"
        placeholder="添加任务到日常记录…"
        style="flex: 1; min-width: 300px"
        @pressEnter="addTask"
      />
      <a-select v-model:value="newTaskPrio" style="width: 100px" placeholder="优先级">
        <a-select-option value="">无</a-select-option>
        <a-select-option value="⏫">⏫ 高</a-select-option>
        <a-select-option value="🔼">🔼 中</a-select-option>
        <a-select-option value="🔽">🔽 低</a-select-option>
      </a-select>
      <a-date-picker v-model:value="newTaskDue" style="width: 140px" placeholder="截止日" />
      <a-button type="primary" @click="addTask">添加</a-button>
    </a-space>

    <!-- 进度条 -->
    <a-row v-if="tasks.length > 0" style="margin-bottom: 12px">
      <a-col :span="24">
        <a-progress
          :percent="donePercent"
          :format="() => `${doneCount}/${totalCount}`"
          :stroke-color="'#1677ff'"
        />
      </a-col>
    </a-row>

    <!-- 任务表格 -->
    <a-card title="日报任务" size="small" style="margin-bottom: 16px">
      <a-table
        :columns="taskColumns"
        :data-source="tasks"
        :pagination="false"
        size="small"
        row-key="raw"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'done'">
            <a-checkbox :checked="record.done" @change="toggleDone(record)" />
          </template>
          <template v-else-if="column.key === 'text'">
            <span :style="{ textDecoration: record.done ? 'line-through' : 'none', color: record.done ? '#999' : 'inherit' }">
              {{ record.text }}
            </span>
          </template>
        </template>
      </a-table>
    </a-card>

    <!-- 全部未完成 -->
    <a-card title="全部未完成" size="small">
      <a-table
        :columns="allColumns"
        :data-source="allOpenTasks"
        :pagination="false"
        size="small"
        row-key="file"
      />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { message } from 'ant-design-vue';
import type { ParsedTask, FileInfo } from '@/types/electron';
import dayjs from 'dayjs';

const api = window.electronAPI;

// 项目
const projects = ref<FileInfo[]>([]);
const selectedProject = ref('');

// 日期
const dailyPath = ref('');
const todayStr = ref('');

// 添加
const newTaskText = ref('');
const newTaskPrio = ref('');
const newTaskDue = ref<any>(null);

// 任务
const tasks = ref<ParsedTask[]>([]);
const allOpenTasks = ref<Array<{ text: string; file: string; priority: string; due: string }>>([]);

const doneCount = computed(() => tasks.value.filter(t => t.done).length);
const totalCount = computed(() => tasks.value.length);
const donePercent = computed(() => totalCount.value === 0 ? 0 : Math.round((doneCount.value / totalCount.value) * 100));

const taskColumns = [
  { title: '', dataIndex: 'done', key: 'done', width: 40 },
  { title: '任务', dataIndex: 'text', key: 'text', ellipsis: true },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 80 },
  { title: '截止日', dataIndex: 'due', key: 'due', width: 120 },
];

const allColumns = [
  { title: '任务', dataIndex: 'text', key: 'text', ellipsis: true },
  { title: '文件', dataIndex: 'file', key: 'file', width: 160, ellipsis: true },
];

onMounted(async () => {
  dailyPath.value = await api.vault.getDailyPath();
  const now = new Date();
  todayStr.value = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  await loadProjects();
  await loadTasks();
  await loadAllOpen();
});

async function loadProjects() {
  projects.value = await api.vault.getActiveProjects();
  if (projects.value.length > 0 && !selectedProject.value) {
    selectedProject.value = projects.value[0].path;
  }
}

async function loadTasks() {
  await api.vault.ensureDailyFile();
  tasks.value = await api.vault.getTasks(dailyPath.value);
}

async function loadAllOpen() {
  const results = await api.vault.getAllOpenTasks();
  allOpenTasks.value = results.slice(0, 20).map(r => ({
    text: r.text,
    file: r.file.split('/').pop()?.replace('.md', '') || r.file,
    priority: '',
    due: '',
  }));
}

async function selectProject(path: string) {
  selectedProject.value = path;
  await loadAllOpen();
}

async function addTask() {
  const text = newTaskText.value.trim();
  if (!text) return;
  let line = `- [ ] ${text}`;
  if (newTaskPrio.value) line += ` ${newTaskPrio.value}`;
  if (newTaskDue.value) line += ` 📅 ${dayjs(newTaskDue.value).format('YYYY-MM-DD')}`;
  if (selectedProject.value) {
    const pname = selectedProject.value.split('/').pop();
    line += ` 🗂 [[${selectedProject.value}/README|${pname}]]`;
  }
  await api.vault.ensureDailyFile();
  await api.vault.appendToSection(dailyPath.value, '日常记录', line);
  newTaskText.value = '';
  newTaskPrio.value = '';
  newTaskDue.value = null;
  message.success('已添加');
  await loadTasks();
}

async function toggleDone(task: ParsedTask) {
  await api.vault.toggleTask(dailyPath.value, task.raw, task.done);
  await loadTasks();
}
</script>
