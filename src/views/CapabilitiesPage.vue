<template>
  <div>
    <h2 style="margin-bottom: 16px">插件能力</h2>
    <a-alert
      message="已安装并启用的 Obsidian 插件能力一览。忘记某个功能怎么用时来这里查。"
      type="info"
      show-icon
      style="margin-bottom: 16px"
    />

    <a-spin :spinning="loading">
      <a-collapse v-if="grouped.length > 0" accordion>
        <a-collapse-panel v-for="g in grouped" :key="g.cat" :header="`${g.cat}（${g.items.length}）`">
          <a-list :data-source="g.items" size="small">
            <template #renderItem="{ item }">
              <a-list-item>
                <a-list-item-meta>
                  <template #title>{{ item.desc }}</template>
                  <template #description>
                    <a-tag>{{ item.name }}</a-tag>
                    <span style="color: #999; font-size: 12px; margin-left: 8px">{{ item.trigger }}</span>
                  </template>
                </a-list-item-meta>
              </a-list-item>
            </template>
          </a-list>
        </a-collapse-panel>
      </a-collapse>
      <a-empty v-else description="未读取到插件信息" />
    </a-spin>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';

const api = window.electronAPI;
const loading = ref(true);
const plugins = ref<Array<{ id: string; name: string; desc: string }>>([]);

// 插件能力映射（从 Obsidian 插件版搬运）
const CAPABILITIES: Record<string, { cat: string; trigger: string }> = {
  // 社区插件
  "dataview":                     { cat: "查询", trigger: "```dataview 代码块" },
  "omnisearch":                   { cat: "搜索", trigger: "Ctrl+Shift+F" },
  "templater-obsidian":           { cat: "模板", trigger: "Alt+Ctrl+`" },
  "quickadd":                     { cat: "自动化", trigger: "命令面板" },
  "obsidian-tasks-plugin":        { cat: "任务", trigger: "```tasks 代码块" },
  "periodic-para":                { cat: "周期笔记", trigger: "左侧栏日历" },
  "obsidian-excalidraw-plugin":   { cat: "可视化", trigger: "命令面板" },
  "obsidian-git":                 { cat: "系统", trigger: "Ctrl+P → 备份" },
  "obsidian-outliner":            { cat: "笔记编辑", trigger: "编辑器中自动" },
  "editing-toolbar":              { cat: "笔记编辑", trigger: "编辑区顶部" },
  "obsidian-icon-folder":         { cat: "美化", trigger: "右键文件夹" },
  "obsidian-style-settings":      { cat: "美化", trigger: "设置 → 样式设置" },
  "tag-wrangler":                 { cat: "笔记编辑", trigger: "右键标签" },
  "note-refactor-obsidian":       { cat: "笔记编辑", trigger: "选中文本 → 命令" },
  "recent-files-obsidian":        { cat: "导航", trigger: "Ctrl+E" },
  "darlal-switcher-plus":         { cat: "搜索", trigger: "Ctrl+O" },
  "folder-note-plugin":           { cat: "笔记编辑", trigger: "点击文件夹" },
  "obsidian-markmind":            { cat: "可视化", trigger: "命令面板" },
  "notebook-navigator":           { cat: "导航", trigger: "Ctrl+N" },
  "obsidian-timelines":           { cat: "可视化", trigger: "```timeline" },
  "obsidian-admonition":          { cat: "笔记编辑", trigger: "```ad-" },
  "url-into-selection":           { cat: "笔记编辑", trigger: "Ctrl+V" },
  "highlightr-plugin":            { cat: "笔记编辑", trigger: "选中 → 右键" },
  "better-word-count":            { cat: "笔记编辑", trigger: "右下角" },
  "obsidian-pangu":               { cat: "美化", trigger: "保存时自动" },
  "table-editor-obsidian":        { cat: "笔记编辑", trigger: "编辑表格" },
  "table-extended":               { cat: "笔记编辑", trigger: "编辑表格" },
  "obsidian-emoji-toolbar":       { cat: "笔记编辑", trigger: "编辑器中" },
  "fuzzy-chinese-pinyin":         { cat: "搜索", trigger: "Ctrl+O" },
  "obsidian-image-toolkit":       { cat: "美化", trigger: "点击图片" },
  "image-converter":              { cat: "美化", trigger: "粘贴图片时" },
  "obsidian-copy-block-link":     { cat: "笔记编辑", trigger: "右键段落" },
  "remember-cursor-position":     { cat: "笔记编辑", trigger: "自动" },
  "better-fn":                    { cat: "笔记编辑", trigger: "编辑器中" },
  "nldates-obsidian":             { cat: "笔记编辑", trigger: "@today" },
  "open-in-terminal":             { cat: "系统", trigger: "右键文件夹" },
  "terminal":                     { cat: "系统", trigger: "命令面板" },
  "markdown-prettifier":          { cat: "美化", trigger: "命令面板" },
  "obsidian42-brat":              { cat: "系统", trigger: "设置" },
  "claude-sidebar":               { cat: "AI 助手", trigger: "命令面板" },
  "claude-code-integration":      { cat: "AI 助手", trigger: "命令面板" },
  "better-search-views":          { cat: "搜索", trigger: "搜索时自动" },
  "wiki-dashboard":               { cat: "系统", trigger: "Ctrl+P → 仪表盘" },
  "cm-editor-syntax-highlight-obsidian": { cat: "美化", trigger: "自动" },
  "obsidian-image-auto-upload-plugin":   { cat: "美化", trigger: "粘贴图片时" },
  "mrj-text-expand":              { cat: "笔记编辑", trigger: "编辑器中" },
};

const CAT_ORDER = ["导航", "搜索", "笔记编辑", "任务", "周期笔记", "模板", "查询", "自动化", "可视化", "AI 助手", "美化", "系统"];

onMounted(async () => {
  try {
    plugins.value = await api.vault.getEnabledPlugins();
  } finally {
    loading.value = false;
  }
});

const grouped = computed(() => {
  const map: Record<string, Array<{ name: string; desc: string; trigger: string }>> = {};
  for (const p of plugins.value) {
    const cap = CAPABILITIES[p.id];
    if (!cap) continue;
    if (!map[cap.cat]) map[cap.cat] = [];
    map[cap.cat].push({ name: p.name, desc: p.desc, trigger: cap.trigger });
  }
  return CAT_ORDER
    .filter(cat => map[cat]?.length > 0)
    .map(cat => ({ cat, items: map[cat] }));
});
</script>
