# Wiki Dashboard

> Obsidian vault 的 GUI 操作面板 —— 把高频插件能力封装成点击即用的桌面应用。

## 定位

不是 Obsidian 的替代品，而是它的**操作加速器**。Obsidian 本身是一个强大的笔记 IDE，但它的插件能力散落在命令面板、快捷键和社区插件中，每次使用都需要记忆和查找。Wiki Dashboard 把这些能力按使用频率和场景重新组织，做成不超过两次点击的 GUI 入口。

**一句话**：不再 `Ctrl+P` → 搜命令 → 回车，直接点。

## 技术栈

| 层 | 选型 |
|---|---|
| 桌面壳 | Electron 42 |
| 前端 | Vue 3.5 + TypeScript 6 + Vite 8 |
| UI 库 | Ant Design Vue 4 |
| 状态 | Pinia 3 |
| 路由 | Vue Router 4（Hash 模式） |
| Markdown | marked |
| Git 操作 | simple-git |
| 后端数据 | 文件系统（直接读写 Obsidian vault） |
| CLI 集成 | 子进程调用 claude CLI |

## 功能模块

### 概览（/）
- Vault 统计卡片（实体 / 主题 / 素材 / 综合分析）
- 活跃项目网格
- **快速消化**：粘贴 URL → 一键调 llm-wiki 后台消化
- 最近动态文件列表

### 任务管理（/tasks）
- 全局 + 项目级任务视图
- 优先级筛选（⏫ 🔼 🔽）
- 任务状态切换（checkbox）
- 支持 `obsidian-tasks-plugin` 的 `tasks` 代码块协议

### 速记（/capture）
- 模板按钮：想法 / 待办 / 重点 / 链接
- Ctrl+Enter 快速保存到日报
- 支持标签 + 项目关联

### 项目（/projects）
- 树形项目浏览器（递归展示 PARA 结构）
- 创建 / 导入 / 添加子项目
- 归档 / 删除操作
- 拖拽排序（占位，待实现）

### 项目详情（/project/:path）
- 面包屑导航：可点击每级路径，下拉查看同级项目
- 五个 Tab：
  - **任务**：项目关联任务（不再有子项目下拉，上下文由面包屑承载）
  - **速记**：项目内快速捕获
  - **子项目**：当前项目的直属子树
  - **文件**：当前目录文件列表
  - **介绍**：README.md 预览
- 侧边栏控制台：当前项目子项目树 + 快捷添加

### 能力（/capabilities）
- Obsidian 已安装插件的能力索引
- 按类别分组（导航 / 搜索 / 笔记编辑 / 任务 / AI 助手等）
- 每个条目展示触发方式

### 底部控制台
- Claude CLI 实时输出
- 后台消化进度查看
- 终止 / 清空操作

### Git 同步
- 侧边栏底部显示当前分支 + 变更计数
- 一键 pull → commit → push

## 架构

```
┌──────────────────────────────────────┐
│            Electron Main             │
│  ┌──────────┐ ┌────────┐ ┌───────┐  │
│  │  Vault    │ │  Git   │ │  CLI  │  │
│  │  Service  │ │ Service│ │Service│  │
│  └────┬─────┘ └───┬────┘ └──┬────┘  │
│       │            │         │       │
│  ─ ─ ─│─ IPC ─ ─ ─│─ ─ ─ ─ │─ ─ ─  │
│       │            │         │       │
│  ┌────┴────────────┴─────────┴────┐  │
│  │         Preload (Bridge)       │  │
│  └───────────────┬────────────────┘  │
│                  │                   │
│  ┌───────────────┴────────────────┐  │
│  │     Vue 3 Renderer Process     │  │
│  │  ┌──────┐ ┌──────┐ ┌───────┐  │  │
│  │  │Router│ │Pinia │ │Ant DV │  │  │
│  │  └──────┘ └──────┘ └───────┘  │  │
│  │  ┌──────┐ ┌──────┐ ┌───────┐  │  │
│  │  │Views │ │Comps │ │Types  │  │  │
│  │  └──────┘ └──────┘ └───────┘  │  │
│  └────────────────────────────────┘  │
└──────────────────────────────────────┘
         │
         ▼
    Obsidian Vault
    (PARA 管理 结构)
```

## 开发

```bash
# 安装依赖
npm install

# 启动开发服务器（Vite + Electron）
npm run dev

# 类型检查
npx vue-tsc --noEmit

# 构建
npm run build

# 打包 Electron 应用
npm run electron:build
```

### 目录结构

```
src/
├── App.vue                     # 根布局（侧边栏 + 内容区 + 底部控制台）
├── main.ts                     # Vue 入口
├── style.css                   # 全局样式
├── router/index.ts             # 路由配置
├── stores/project.ts           # 项目状态（树 / 面包屑 / 同级查询）
├── types/electron.d.ts         # IPC 接口类型定义
├── hooks/                      # 通用 composables
├── utils/                      # 通用工具函数
├── pages/                      # 页面（每个页面一个文件夹）
│   ├── overview/index.vue            # 概览
│   ├── tasks/index.vue               # 任务管理
│   ├── capture/index.vue             # 速记
│   ├── projects/index.vue            # 项目树管理
│   ├── project-detail/index.vue      # 项目详情
│   ├── capabilities/index.vue        # 插件能力索引
│   └── settings/index.vue            # 设置
├── components/                 # 通用组件（每个组件一个文件夹）
│   ├── task-panel/index.vue          # 任务面板（全局/项目复用）
│   ├── file-preview/index.vue        # 文件预览弹窗
│   └── project-breadcrumb/index.vue  # 项目面包屑（可点击同级下拉）
electron/
├── main.ts              # Electron 主进程
├── preload.ts           # contextBridge 预加载
└── services/
    ├── vault-service.ts  # Vault 文件系统操作
    ├── git-service.ts    # Git 同步
    └── cli-service.ts    # Claude CLI 子进程管理
```

## 路线图

### 已实现
- [x] Vault 统计与概览
- [x] 全局 + 项目级任务管理
- [x] 速记 + 日报追加
- [x] 项目树形管理（CRUD + 归档）
- [x] 项目详情多 Tab（任务/速记/子项目/文件/介绍）
- [x] 面包屑导航（可点击同级下拉）
- [x] 侧边栏项目控制台
- [x] 插件能力索引（CapabilitiesPage）
- [x] Claude CLI 底部控制台
- [x] Git 同步面板

### 下一步（v1.1）
- [ ] **llm-wiki 深入集成**：项目内右键"消化到此项目"、批量消化、进度追踪
- [ ] **interview-workflow 集成**：面试工作流的 GUI 封装
- [ ] 系统托盘 + 全局快捷键（消化剪贴板）
- [ ] 暗色模式持久化

### 远期（v2.0）
- [ ] **反向链接面板**：跨笔记引用关系可视化
- [ ] **知识溢出检测**：孤立项目提醒
- [ ] 拖拽排序（项目树）
- [ ] 全文搜索（集成 omnisearch）
- [ ] 数据看板（dataview 查询的 GUI 封装）
