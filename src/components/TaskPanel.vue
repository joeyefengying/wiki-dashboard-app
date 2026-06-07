<template>
  <div>
    <!-- 全局模式标题 -->
    <div v-if="!projPath" style="margin-bottom: 12px">
      <span style="font-weight: 600">📋 全部任务</span>
    </div>

    <!-- 优先级筛选 -->
    <a-radio-group v-model:value="taskFilter" button-style="solid" size="small" style="margin-bottom: 8px">
      <a-radio-button value="">全部</a-radio-button>
      <a-radio-button value="⏫">⏫ 高</a-radio-button>
      <a-radio-button value="🔼">🔼 中</a-radio-button>
      <a-radio-button value="🔽">🔽 低</a-radio-button>
    </a-radio-group>

    <!-- 添加行（项目模式显示关联提示） -->
    <a-space style="margin-bottom: 12px" align="center">
      <a-input size="small" v-model:value="newTaskText" :placeholder="projPath ? `添加任务到「${projName}」…` : '添加任务…'" style="width: 280px" @pressEnter="addTask" />
      <a-button type="primary" size="small" @click="addTask">添加</a-button>
    </a-space>

    <!-- 未完成任务表格 -->
    <a-table :columns="columns" :data-source="openTasks" :pagination="false" size="small" row-key="raw">
      <template #bodyCell="{ column, record }">
        <template v-if="column.key === 'done'">
          <a-checkbox :checked="record.done" @change="toggleTask(record)" />
        </template>
        <template v-else-if="column.key === 'text'">
          <span :style="{ textDecoration: record.done ? 'line-through' : 'none' }">{{ record.text }}</span>
        </template>
        <template v-else-if="column.key === 'file'">
          <a-tooltip :title="record.file">
            <a @click="emit('preview', record.file)" style="font-size: 12px">{{ record.file }}</a>
          </a-tooltip>
        </template>
      </template>
    </a-table>

    <!-- 已完成折叠 -->
    <a-collapse v-show="doneTasks.length > 0" style="margin-top: 8px" :bordered="false">
      <a-collapse-panel :header="`已完成（${doneTasks.length}）`" key="done">
        <a-table :columns="columns" :data-source="doneTasks" :pagination="false" size="small" row-key="raw">
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'done'">
              <a-checkbox :checked="true" @change="toggleTask(record)" />
            </template>
            <template v-else-if="column.key === 'text'">
              <span style="text-decoration: line-through; color: #999">{{ record.text }}</span>
            </template>
          </template>
        </a-table>
      </a-collapse-panel>
    </a-collapse>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue';
import { message } from 'ant-design-vue';

const props = defineProps<{ projPath?: string }>();
const emit = defineEmits<{ (e: 'preview', path: string): void }>();

const api = window.electronAPI;
const projName = computed(() => props.projPath?.split('/').pop() || '');

const newTaskText = ref('');
const taskFilter = ref('');
const tasks = ref<any[]>([]);

const openTasks = computed(() => filteredTasks.value.filter(t => !t.done));
const doneTasks = computed(() => tasks.value.filter(t => t.done));

const filteredTasks = computed(() => {
  if (!taskFilter.value) return tasks.value;
  return tasks.value.filter(t => t.raw?.includes(taskFilter.value) || t.text.includes(taskFilter.value));
});

const columns = [
  { title: '', dataIndex: 'done', key: 'done', width: 40 },
  { title: '任务', dataIndex: 'text', key: 'text', ellipsis: true },
  { title: '优先级', dataIndex: 'priority', key: 'priority', width: 60 },
  { title: '来源', dataIndex: 'file', key: 'file', width: 120, ellipsis: true },
];

onMounted(() => loadAll());
watch(() => props.projPath, () => loadAll());

async function loadAll() {
  const allTasks = await api.vault.getAllTasks();
  const name = projName.value;

  if (props.projPath) {
    // 项目模式：过滤关联任务
    tasks.value = allTasks
      .filter(t => {
        const raw = (t as any).raw || '';
        const text = t.text || '';
        const file = t.file || '';
        if (raw.includes('🗂') && (raw.includes(name) || text.includes(name))) return true;
        if (file.startsWith(props.projPath! + '/')) return true;
        if (file.startsWith('周期笔记/') && (raw.includes(name) || text.includes(name))) return true;
        return false;
      })
      .map(mapTask);
  } else {
    // 全局模式：显示所有
    tasks.value = allTasks.map(mapTask);
  }
}

function mapTask(t: any) {
  const raw = t.raw || '';
  const pm = raw.match(/⏫|🔼|🔽/);
  return {
    text: t.text.replace(/- \[[ x]\] /, '').trim(),
    done: t.done || false,
    priority: pm ? pm[0] : '',
    raw,
    file: t.file,
  };
}

async function addTask() {
  const text = newTaskText.value.trim();
  if (!text) return;
  let line = `- [ ] ${text}`;
  if (taskFilter.value) line += ` ${taskFilter.value}`;
  if (props.projPath) line += ` 🗂 [[${props.projPath}/README|${projName.value}]]`;

  const dailyPath = await api.vault.ensureDailyFile();
  await api.vault.appendToSection(dailyPath, '日常记录', line);
  newTaskText.value = '';
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
  task.done = !task.done;
  task.raw = toggled;
  tasks.value = [...tasks.value];
}
</script>
