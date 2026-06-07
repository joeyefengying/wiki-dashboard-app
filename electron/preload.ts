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
        searchTasks: (pattern: string) => ipcRenderer.invoke('vault:searchTasks', pattern),
        getDailyPath: () => ipcRenderer.invoke('vault:getDailyPath'),
        ensureDailyFile: () => ipcRenderer.invoke('vault:ensureDailyFile'),
        getActiveProjects: () => ipcRenderer.invoke('vault:getActiveProjects'),
    },
};

contextBridge.exposeInMainWorld('electronAPI', api);
