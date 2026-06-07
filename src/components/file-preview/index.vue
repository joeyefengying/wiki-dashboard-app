<template>
  <a-drawer
    :title="title"
    :open="visible"
    :width="720"
    @close="close"
    placement="right"
  >
    <template #extra>
      <a-space>
        <a-button size="small" @click="openInObsidian">Obsidian 中打开</a-button>
        <a-button size="small" @click="openExternal">外部程序打开</a-button>
      </a-space>
    </template>
    <a-spin :spinning="loading">
      <div v-if="error" style="color: #ff4d4f">{{ error }}</div>
      <div v-else class="markdown-preview" v-html="html" />
    </a-spin>
  </a-drawer>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { marked } from 'marked';

const props = defineProps<{
  visible: boolean;
  filePath: string;
}>();

const emit = defineEmits<{
  (e: 'update:visible', v: boolean): void;
}>();

const api = window.electronAPI;

const title = ref('');
const html = ref('');
const loading = ref(false);
const error = ref('');

watch(() => props.visible, async (val) => {
  if (!val || !props.filePath) return;
  loading.value = true;
  error.value = '';
  try {
    title.value = props.filePath.split('/').pop() || props.filePath;
    const content = await api.vault.readFile(props.filePath);
    html.value = await marked.parse(content);
  } catch (e: any) {
    error.value = `无法读取：${e?.message || e}`;
  } finally {
    loading.value = false;
  }
});

function close() {
  emit('update:visible', false);
}

function openExternal() {
  api.vault.openFile(props.filePath);
}

async function openInObsidian() {
  const vault = 'obsidian-wiki';
  const file = props.filePath;
  // Obsidian URI: vault 名和 file 路径都需要编码
  const uri = `obsidian://open?vault=${encodeURIComponent(vault)}&file=${encodeURIComponent(file)}`;
  await api.vault.openExternal(uri);
}
</script>

<style scoped>
.markdown-preview {
  font-size: 14px;
  line-height: 1.8;
}
.markdown-preview :deep(h1) { font-size: 1.6em; margin: 16px 0 8px; }
.markdown-preview :deep(h2) { font-size: 1.3em; margin: 14px 0 6px; }
.markdown-preview :deep(h3) { font-size: 1.1em; margin: 12px 0 4px; }
.markdown-preview :deep(p) { margin: 8px 0; }
.markdown-preview :deep(code) { background: #f5f5f5; padding: 2px 6px; border-radius: 3px; font-size: 0.9em; }
.markdown-preview :deep(pre) { background: #f5f5f5; padding: 12px; border-radius: 4px; overflow-x: auto; }
.markdown-preview :deep(blockquote) { border-left: 3px solid #ddd; margin: 8px 0; padding: 4px 12px; color: #666; }
.markdown-preview :deep(a) { color: #1677ff; }
.markdown-preview :deep(table) { border-collapse: collapse; width: 100%; }
.markdown-preview :deep(th), .markdown-preview :deep(td) { border: 1px solid #ddd; padding: 6px 10px; text-align: left; }
</style>
