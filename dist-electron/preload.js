import { contextBridge, ipcRenderer } from "electron";
//#region electron/preload.ts
contextBridge.exposeInMainWorld("electronAPI", { vault: {
	getStats: () => ipcRenderer.invoke("vault:stats"),
	recentFiles: (limit) => ipcRenderer.invoke("vault:recentFiles", limit),
	readFile: (path) => ipcRenderer.invoke("vault:readFile", path),
	writeFile: (path, content) => ipcRenderer.invoke("vault:writeFile", path, content),
	appendFile: (path, content) => ipcRenderer.invoke("vault:appendFile", path, content),
	listDir: (path) => ipcRenderer.invoke("vault:listDir", path),
	buildProjectTree: () => ipcRenderer.invoke("vault:buildProjectTree"),
	createProject: (path, readme) => ipcRenderer.invoke("vault:createProject", path, readme),
	moveProject: (from, to) => ipcRenderer.invoke("vault:moveProject", from, to),
	searchTasks: (pattern) => ipcRenderer.invoke("vault:searchTasks", pattern),
	getDailyPath: () => ipcRenderer.invoke("vault:getDailyPath"),
	ensureDailyFile: () => ipcRenderer.invoke("vault:ensureDailyFile"),
	getActiveProjects: () => ipcRenderer.invoke("vault:getActiveProjects"),
	getTasks: (dailyPath) => ipcRenderer.invoke("vault:getTasks", dailyPath),
	appendToSection: (dailyPath, section, line) => ipcRenderer.invoke("vault:appendToSection", dailyPath, section, line),
	toggleTask: (dailyPath, raw, done) => ipcRenderer.invoke("vault:toggleTask", dailyPath, raw, done),
	searchAllTasks: (pattern) => ipcRenderer.invoke("vault:searchAllTasks", pattern),
	getEnabledPlugins: () => ipcRenderer.invoke("vault:getEnabledPlugins"),
	openFile: (path) => ipcRenderer.invoke("vault:openFile", path),
	getAllOpenTasks: () => ipcRenderer.invoke("vault:getAllOpenTasks")
} });
//#endregion
export {};
