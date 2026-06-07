<template>
  <div>
    <h2 style="margin-bottom: 16px">速记</h2>

    <!-- 模板按钮 -->
    <div style="margin-bottom: 12px; display: flex; gap: 8px; align-items: center">
      <span style="font-size: 12px; color: #999">插入模板：</span>
      <a-button size="small" @click="insertTemplate('')">💡 想法</a-button>
      <a-button size="small" @click="insertTemplate('- [ ] ')">✅ 待办</a-button>
      <a-button size="small" @click="insertTemplate('> [!important]\n> ')">📌 重点</a-button>
      <a-button size="small" @click="insertTemplate('- [ ] 阅读：')">🔗 链接</a-button>
    </div>

    <!-- 编辑区 -->
    <a-textarea
      v-model:value="content"
      :rows="10"
      placeholder="在这里写内容，Ctrl+Enter 保存到日报…"
      @keydown="onKeydown"
    />

    <!-- 底部操作行 -->
    <div style="margin-top: 12px; display: flex; gap: 8px; align-items: center">
      <a-input v-model:value="tags" placeholder="标签（可选，逗号分隔）" style="flex: 1" />
      <a-button type="primary" @click="save" :loading="saving">保存到日报</a-button>
    </div>

    <!-- 日报预览 -->
    <a-card title="日报预览" size="small" style="margin-top: 16px">
      <a-list :data-source="preview" size="small" v-if="preview.length > 0">
        <template #renderItem="{ item }">
          <a-list-item>{{ item }}</a-list-item>
        </template>
      </a-list>
      <a-empty v-else description="暂无记录" />
    </a-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { message } from 'ant-design-vue';

const api = window.electronAPI;

const content = ref('');
const tags = ref('');
const saving = ref(false);
const preview = ref<string[]>([]);
const dailyPath = ref('');

onMounted(async () => {
  dailyPath.value = await api.vault.getDailyPath();
  await loadPreview();
});

async function loadPreview() {
  try {
    const text = await api.vault.readFile(dailyPath.value);
    const lines = text.split('\n').reverse();
    const items: string[] = [];
    let count = 0;
    for (const line of lines) {
      const t = line.trim();
      if (t && !t.startsWith('#') && !t.startsWith('>') && !t.startsWith('```') && !t.startsWith('%%')) {
        items.push(t.length > 80 ? t.slice(0, 80) + '…' : t);
        count++;
        if (count >= 8) break;
      }
    }
    preview.value = items;
  } catch {
    preview.value = [];
  }
}

function insertTemplate(tpl: string) {
  if (!tpl) { content.value = ''; return; }
  content.value += (content.value ? '\n' : '') + tpl;
}

async function save() {
  if (!content.value.trim()) return;
  saving.value = true;
  try {
    let text = content.value.trim();
    const tagStr = tags.value.trim();
    if (tagStr) {
      text += ' ' + tagStr.split(/[,，]/).map(t => t.trim()).filter(Boolean).map(t => `#${t}`).join(' ');
    }
    const now = new Date();
    const stamp = `> ${now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`;
    const entry = `\n${stamp}\n${text}\n`;
    await api.vault.ensureDailyFile();
    await api.vault.appendToSection(dailyPath.value, '日常记录', entry);
    content.value = '';
    tags.value = '';
    message.success('已保存');
    await loadPreview();
  } finally {
    saving.value = false;
  }
}

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    save();
  }
}
</script>
