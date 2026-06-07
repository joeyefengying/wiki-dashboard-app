let electron = require("electron");
//#region electron/preload.ts
var api = {
	vault: {
		getStats: () => electron.ipcRenderer.invoke("vault:stats"),
		recentFiles: (limit) => electron.ipcRenderer.invoke("vault:recentFiles", limit),
		readFile: (path) => electron.ipcRenderer.invoke("vault:readFile", path),
		writeFile: (path, content) => electron.ipcRenderer.invoke("vault:writeFile", path, content),
		appendFile: (path, content) => electron.ipcRenderer.invoke("vault:appendFile", path, content),
		listDir: (path) => electron.ipcRenderer.invoke("vault:listDir", path),
		buildProjectTree: () => electron.ipcRenderer.invoke("vault:buildProjectTree"),
		createProject: (path, readme) => electron.ipcRenderer.invoke("vault:createProject", path, readme),
		moveProject: (from, to) => electron.ipcRenderer.invoke("vault:moveProject", from, to),
		deleteProject: (path) => electron.ipcRenderer.invoke("vault:deleteProject", path),
		searchTasks: (pattern) => electron.ipcRenderer.invoke("vault:searchTasks", pattern),
		getDailyPath: () => electron.ipcRenderer.invoke("vault:getDailyPath"),
		ensureDailyFile: () => electron.ipcRenderer.invoke("vault:ensureDailyFile"),
		getActiveProjects: () => electron.ipcRenderer.invoke("vault:getActiveProjects"),
		getTasks: (dailyPath) => electron.ipcRenderer.invoke("vault:getTasks", dailyPath),
		appendToSection: (dailyPath, section, line) => electron.ipcRenderer.invoke("vault:appendToSection", dailyPath, section, line),
		toggleTask: (dailyPath, raw, done) => electron.ipcRenderer.invoke("vault:toggleTask", dailyPath, raw, done),
		searchAllTasks: (pattern) => electron.ipcRenderer.invoke("vault:searchAllTasks", pattern),
		getEnabledPlugins: () => electron.ipcRenderer.invoke("vault:getEnabledPlugins"),
		openFile: (path) => electron.ipcRenderer.invoke("vault:openFile", path),
		openExternal: (uri) => electron.ipcRenderer.invoke("vault:openExternal", uri),
		getAllOpenTasks: () => electron.ipcRenderer.invoke("vault:getAllOpenTasks")
	},
	git: {
		status: () => electron.ipcRenderer.invoke("git:status"),
		pull: () => electron.ipcRenderer.invoke("git:pull"),
		push: () => electron.ipcRenderer.invoke("git:push"),
		commit: (msg) => electron.ipcRenderer.invoke("git:commit", msg),
		sync: (msg) => electron.ipcRenderer.invoke("git:sync", msg)
	},
	cli: {
		exec: (prompt) => electron.ipcRenderer.send("cli:execClaude", prompt),
		kill: () => electron.ipcRenderer.send("cli:kill"),
		openTerminal: (prompt) => electron.ipcRenderer.invoke("cli:openTerminal", prompt)
	}
};
electron.ipcRenderer.on("cli:output", (_e, line) => {
	window.postMessage({
		type: "cli:output",
		line
	}, "*");
});
electron.ipcRenderer.on("cli:done", (_e, code) => {
	window.postMessage({
		type: "cli:done",
		code
	}, "*");
});
electron.contextBridge.exposeInMainWorld("electronAPI", api);
//#endregion
