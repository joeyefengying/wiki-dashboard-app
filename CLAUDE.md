# CLAUDE.md

> Wiki Dashboard 项目指令 —— 给后续 AI 会话的上下文和约定。

## 项目标识

- **名称**：Wiki Dashboard
- **定位**：Obsidian vault 的 GUI 操作面板
- **仓库路径**：`E:\project\wiki-dashboard-app`
- **运行方式**：`npm run dev`（Vite + Electron 开发模式）
- **Vault 路径**：由 `VaultService` 自动检测（读取 Obsidian 配置或环境变量）

## 技术约束

### 必须遵守
- **不要引入新的状态管理方案**。所有全局状态用 Pinia（`src/stores/`），页面局部状态用 `ref`/`reactive`
- **IPC 通信通过 preload**。渲染进程不直接调用 Node API，所有文件/Git/CLI 操作通过 `window.electronAPI`
- **路由用 Hash 模式**。Electron 环境不支持 HTML5 History
- **Ant Design Vue 4 的组件**。不用其他 UI 库，样式用 scoped CSS 补充
- **TypeScript 严格模式**。新代码必须有类型，`any` 仅在明确的边界处使用

### 项目级约定
- 组件文件用 PascalCase（`TaskPanel.vue`），视图文件用 PascalCase + Page 后缀（`OverviewPage.vue`）
- 侧边栏逻辑全部在 `App.vue` 中，不要分散到各个页面
- 项目路径是 `/` 分割的 vault 相对路径，路由参数需要 `encodeURIComponent` / `decodeURIComponent`
- `projStore.currentPath` 是当前选中的项目路径，App.vue 通过 `watch route` 自动同步

## 当前架构状态

### 已完成（v1.0）
- 侧边栏：全局菜单（始终可见）+ 条件区域（项目控制台 / 项目树选择器）
- 面包屑导航：`ProjectBreadcrumb.vue`，每段可点击展开同级下拉
- 项目树：全局 + 项目内两套树，节点点击进入详情
- 项目详情：5 Tab（任务/速记/子项目/文件/介绍）
- 任务面板：`TaskPanel.vue` 全局/项目复用，`showSubFilter` prop 控制子项目下拉
- 速记：模板按钮 + 日报追加
- 能力索引：`CapabilitiesPage.vue`，静态 CAPABILITIES 映射
- 底部控制台：Claude CLI 输出
- Git 面板：侧边栏底部

### Store 结构（`src/stores/project.ts`）
```ts
// 核心状态
currentPath: string        // 当前选中的项目路径
treeData: TreeNode[]       // 完整项目树（buildProjectTree）
projects: ProjectInfo[]    // 顶级项目列表

// 计算属性
projName: computed         // 路径末段（支持子项目）
breadcrumb: computed       // 路径段数组 [{name, path}]

// 方法
loadProjects()             // 加载顶级项目列表
loadProjectTree()          // 加载完整树
selectProject(path)        // 设置 currentPath
clearProject()             // 清除 currentPath
findNode(nodes, path)      // 树节点查找
getSiblings(path)          // 获取同级节点
refreshTree()              // 刷新树数据
```

## 下一步待办（v1.1）

按优先级排列：

1. **llm-wiki 深入集成**
   - 项目详情页中右键文件/链接 → "消化到此项目"
   - 批量 URL 输入 → 排队后台执行
   - 控制台显示消化进度（当前是黑盒）

2. **interview-workflow 集成**
   - 理解 interview-workflow 插件的数据结构和操作流程
   - 在项目详情或独立页面中封装其 GUI
   - 可能的入口：项目详情 Tab 或新的侧边栏菜单项

3. **系统托盘 + 全局快捷键**
   - 最小化到托盘
   - `Ctrl+Shift+D`：消化剪贴板 URL

4. **暗色模式持久化**
   - 当前 `isDark` 每次启动重置，应写入 localStorage

## 关键文件索引

修改某个功能时，先看对应的文件：

| 功能 | 核心文件 |
|---|---|
| 侧边栏布局 | `src/App.vue` |
| 项目状态 | `src/stores/project.ts` |
| 项目列表页 | `src/pages/projects/index.vue` |
| 项目详情页 | `src/pages/project-detail/index.vue` |
| 任务面板 | `src/components/task-panel/index.vue` |
| 面包屑组件 | `src/components/project-breadcrumb/index.vue` |
| 概览（快速消化） | `src/pages/overview/index.vue` |
| 速记 | `src/pages/capture/index.vue` |
| 能力索引 | `src/pages/capabilities/index.vue` |
| IPC 接口类型 | `src/types/electron.d.ts` |
| Vault 文件操作 | `electron/services/vault-service.ts` |
| Git 同步 | `electron/services/git-service.ts` |
| CLI 子进程 | `electron/services/cli-service.ts` |
| Preload 桥 | `electron/preload.ts` |
| 路由 | `src/router/index.ts` |

## 常见改动模式

### 添加新页面
1. 在 `src/pages/` 创建 `xxx/index.vue`（每个页面一个文件夹）
2. 在 `src/router/index.ts` 添加路由（懒加载）
3. 在 `src/App.vue` 全局菜单中添加 `<a-menu-item>`

### 添加新 IPC 接口
1. 在 `electron/services/vault-service.ts` 添加方法
2. 在 `electron/main.ts` 注册 `ipcMain.handle`
3. 在 `electron/preload.ts` 暴露到 `api.vault`
4. 在 `src/types/electron.d.ts` 添加类型声明

### 修改侧边栏
- 全局菜单始终显示（`App.vue` 中 `<a-menu>` 在最外层）
- 项目控制台在 `projStore.projName` 存在时显示（分隔线下方）
- 项目树选择器在 `!projStore.projName` 时显示（分隔线下方）
- 注意：`projName` 从路径末段提取，支持子项目

### 项目树节点交互
- 点击节点 → `enterProject(path)` → 导航到 `/project/:path`
- 侧边栏控制台子项目树同理
- ProjectsPage 树通过 `@select` 事件导航
