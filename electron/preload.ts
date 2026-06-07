import { contextBridge, ipcRenderer } from 'electron';

const api = {
    vault: {
        getStats: () => ipcRenderer.invoke('vault:stats'),
        recentFiles: (limit: number) => ipcRenderer.invoke('vault:recentFiles', limit),
        readFile: (path: string) => ipcRenderer.invoke('vault:readFile', path),
        writeFile: (path: string, content: string) => ipcRenderer.invoke('vault:writeFile', path, content),
        appendFile: (path: string, content: string) => ipcRenderer.invoke('vault:appendFile', path, content),
        listDir: (path: string) => ipcRenderer.invoke('vault:listDir', path),
        buildProjectTree: () => ipcRenderer.invoke('vault:buildProjectTree'),
        createProject: (path: string, readme: string) => ipcRenderer.invoke('vault:createProject', path, readme),
        moveProject: (from: string, to: string) => ipcRenderer.invoke('vault:moveProject', from, to),
        deleteProject: (path: string) => ipcRenderer.invoke('vault:deleteProject', path),
        searchTasks: (pattern: string) => ipcRenderer.invoke('vault:searchTasks', pattern),
        getDailyPath: () => ipcRenderer.invoke('vault:getDailyPath'),
        ensureDailyFile: () => ipcRenderer.invoke('vault:ensureDailyFile'),
        getActiveProjects: () => ipcRenderer.invoke('vault:getActiveProjects'),
        getTasks: (dailyPath?: string) => ipcRenderer.invoke('vault:getTasks', dailyPath),
        appendToSection: (dailyPath: string, section: string, line: string) => ipcRenderer.invoke('vault:appendToSection', dailyPath, section, line),
        toggleTask: (dailyPath: string, raw: string, done: boolean) => ipcRenderer.invoke('vault:toggleTask', dailyPath, raw, done),
        searchAllTasks: (pattern: string) => ipcRenderer.invoke('vault:searchAllTasks', pattern),
        getEnabledPlugins: () => ipcRenderer.invoke('vault:getEnabledPlugins'),
        openFile: (path: string) => ipcRenderer.invoke('vault:openFile', path),
        openExternal: (uri: string) => ipcRenderer.invoke('vault:openExternal', uri),
        getAllOpenTasks: () => ipcRenderer.invoke('vault:getAllOpenTasks'),
    },
    git: {
        status: () => ipcRenderer.invoke('git:status'),
        pull: () => ipcRenderer.invoke('git:pull'),
        push: () => ipcRenderer.invoke('git:push'),
        commit: (msg: string) => ipcRenderer.invoke('git:commit', msg),
        sync: (msg?: string) => ipcRenderer.invoke('git:sync', msg),
    },
    cli: {
        exec: (prompt: string) => ipcRenderer.send('cli:execClaude', prompt),
        kill: () => ipcRenderer.send('cli:kill'),
    },
};

// CLI 事件通过 postMessage 转发（绕过 contextBridge 的序列化限制）
ipcRenderer.on('cli:output', (_e, line: string) => {
    window.postMessage({ type: 'cli:output', line }, '*');
});
ipcRenderer.on('cli:done', (_e, code: number | null) => {
    window.postMessage({ type: 'cli:done', code }, '*');
});

contextBridge.exposeInMainWorld('electronAPI', api);
