<template>
  <div>
    <h2 style="margin-bottom: 16px">插件能力</h2>
    <!-- 内置能力（Wiki Dashboard 自身封装） -->
    <a-card title="🚀 内置能力" size="small" style="margin-bottom: 16px">
      <a-list :data-source="builtinCapabilities" size="small">
        <template #renderItem="{ item }">
          <a-list-item>
            <a-list-item-meta>
              <template #title>
                <span style="font-weight: 500">{{ item.name }}</span>
                <a-tag :color="item.status === 'ready' ? 'green' : 'orange'" style="margin-left: 8px; font-size: 10px">
                  {{ item.status === 'ready' ? '已就绪' : '规划中' }}
                </a-tag>
              </template>
              <template #description>
                <div>{{ item.desc }}</div>
                <div style="margin-top: 2px; font-size: 11px; color: #999">
                  入口：{{ item.entry }}
                </div>
              </template>
            </a-list-item-meta>
          </a-list-item>
        </template>
      </a-list>
    </a-card>

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

// 内置能力（不依赖 Obsidian 插件扫描，Wiki Dashboard 自身封装）
const builtinCapabilities = [
  {
    name: 'llm-wiki 快捷消化',
    desc: '粘贴 URL → 一键调用 llm-wiki 将文章消化到当前项目，结果写入 Vault。支持后台执行并实时查看控制台输出。',
    entry: '概览页「快速消化」面板 / 项目详情页「消化到此项目」按钮',
    status: 'ready',
  },
  {
    name: 'interview-workflow 面试工作流',
    desc: '完整面试流程：screening（简历筛选→自动 pipeline）→ preparation（面试计划+准备文档）→ summary（会议记录合并）→ report（汇总报告）。已作为 Claude Skill 可用。',
    entry: 'Claude CLI 命令 /interview-workflow screening|preparation|summary|report，或直接说「筛选简历 <路径>」',
    status: 'ready',
  },
  {
    name: 'Git 自动同步',
    desc: '侧边栏实时显示 Vault Git 仓库状态，一键 pull → commit → push，无需离开应用或打开终端。',
    entry: '侧边栏底部 Git 面板',
    status: 'ready',
  },
  {
    name: 'Claude CLI 控制台',
    desc: '底部嵌入式终端，实时查看 Claude CLI 执行输出，支持终止任务。消化、分析等长任务不再黑盒。',
    entry: '侧边栏底部控制台按钮 / Ctrl+`',
    status: 'ready',
  },
  {
    name: 'PARA 项目树管理',
    desc: '树形管理活跃项目与归档项目，拖拽排序，右键归档/恢复/删除，面包屑多级导航。',
    entry: '侧边栏项目树 / 项目页面「项目树」',
    status: 'ready',
  },
];

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

  // 工作流与 AI
  "interview-workflow":           { cat: "自动化", trigger: "命令面板 → 启动面试流程" },
  "llm-wiki":                     { cat: "AI 助手", trigger: "Wiki Dashboard 快捷消化面板" },
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
