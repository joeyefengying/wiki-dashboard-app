<template>
  <div class="project-breadcrumb">
    <a-breadcrumb>
      <a-breadcrumb-item v-for="(item, index) in segments" :key="item.path">
        <a-dropdown :trigger="['click']" placement="bottomLeft" @visibleChange="(v: boolean) => v && prefetchSiblings(item)">
          <span class="crumb-link" :class="{ 'crumb-current': index === segments.length - 1 }">
            <FolderOutlined v-if="index === 0" style="color: #faad14; font-size: 13px; margin-right: 4px" />
            {{ item.name }}
            <CaretDownFilled style="font-size: 10px; margin-left: 2px; color: #999" />
          </span>
          <template #overlay>
            <div class="sibling-dropdown">
              <div class="sibling-header">{{ item.path === projectPath ? '同级项目' : `「${item.name}」的子项目` }}</div>
              <div v-if="loadingPaths.has(item.path)" class="sibling-empty">加载中…</div>
              <template v-else>
                <div
                  v-for="sib in siblingsCache[item.path] || []"
                  :key="sib.path"
                  class="sibling-item"
                  :class="{ active: sib.path === projectPath }"
                  @click="navigateTo(sib.path)"
                >
                  <FolderOutlined style="color: #faad14; font-size: 14px; flex-shrink: 0" />
                  <span class="sibling-name">{{ sib.name }}</span>
                  <span v-if="sib.fileCount > 0" class="sibling-count">{{ sib.fileCount }}</span>
                </div>
                <div v-if="(siblingsCache[item.path] || []).length === 0 && !loadingPaths.has(item.path)" class="sibling-empty">暂无子项目</div>
              </template>
            </div>
          </template>
        </a-dropdown>
      </a-breadcrumb-item>
    </a-breadcrumb>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { FolderOutlined, CaretDownFilled } from '@ant-design/icons-vue';
import { useProjectStore } from '@/stores/project';
import type { TreeNode } from '@/types/electron';

const props = defineProps<{ projectPath: string }>();
const router = useRouter();
const store = useProjectStore();
const api = window.electronAPI;

onMounted(() => { store.loadProjectTree(); });

// 面包屑路径段
const segments = computed(() => {
  if (!props.projectPath) return [];
  const parts = props.projectPath.split('/');
  const result: { name: string; path: string }[] = [];
  let accumulated = '';
  for (const part of parts) {
    accumulated = accumulated ? `${accumulated}/${part}` : part;
    result.push({ name: part, path: accumulated });
  }
  return result;
});

// 响应式缓存
const siblingsCache = reactive<Record<string, TreeNode[]>>({});
const loadingPaths = reactive(new Set<string>());

// 同步读取缓存
function getSiblingsFor(item: { name: string; path: string }): TreeNode[] {
  return siblingsCache[item.path] || [];
}

// 异步加载（打开下拉时或预取时调用）
async function prefetchSiblings(item: { name: string; path: string }) {
  if (siblingsCache[item.path] || loadingPaths.has(item.path)) return;

  loadingPaths.add(item.path);
  const parentPath = item.path.split('/').slice(0, -1).join('/');

  try {
    if (!parentPath) {
      // 顶级：直接从 store 取
      siblingsCache[item.path] = store.treeData;
    } else {
      // 先在活跃树中查找
      const parent = store.findNode(store.treeData, parentPath);
      if (parent) {
        siblingsCache[item.path] = parent.children || [];
      } else {
        // 不在活跃树中（如存档目录），动态加载直接子目录
        const entries = await api.vault.listDir(parentPath);
        siblingsCache[item.path] = entries
          .filter(e => e.isDir)
          .map(e => ({
            name: e.name,
            path: e.path,
            children: [],
            fileCount: 0,
            isDir: true,
          }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
    }
  } catch {
    siblingsCache[item.path] = [];
  } finally {
    loadingPaths.delete(item.path);
  }
}

function navigateTo(path: string) {
  store.selectProject(path);
  router.push(`/project/${encodeURIComponent(path)}`);
}

// 路径改变 → 清空缓存 + 预加载首段
watch(() => props.projectPath, () => {
  Object.keys(siblingsCache).forEach(k => delete siblingsCache[k]);
  // 预加载面包屑首段（顶级目录）
  if (segments.value.length > 0) {
    prefetchSiblings(segments.value[0]);
  }
}, { immediate: true });
</script>

<style scoped>
.project-breadcrumb {
  margin-bottom: 0;
}
.crumb-link {
  cursor: pointer;
  padding: 2px 6px;
  border-radius: 4px;
  transition: background 0.15s;
  display: inline-flex;
  align-items: center;
  font-size: 13px;
  user-select: none;
}
.crumb-link:hover {
  background: rgba(0, 0, 0, 0.06);
}
.crumb-current {
  font-weight: 600;
  color: var(--primary-color, #cf7a4c);
}

.sibling-dropdown {
  max-height: 320px;
  overflow-y: auto;
  min-width: 200px;
  background: var(--component-background, #fff);
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
}
.sibling-header {
  padding: 6px 12px;
  font-size: 11px;
  color: #999;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);
  margin-bottom: 2px;
}
.sibling-item {
  padding: 7px 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  transition: background 0.12s;
}
.sibling-item:hover {
  background: rgba(0, 0, 0, 0.04);
}
.sibling-item.active {
  background: var(--primary-1, #fff2e8);
  color: var(--primary-color, #cf7a4c);
  font-weight: 600;
}
.sibling-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.sibling-count {
  color: #999;
  font-size: 11px;
  flex-shrink: 0;
}
.sibling-empty {
  padding: 8px 12px;
  color: #999;
  font-size: 12px;
  text-align: center;
}
</style>
