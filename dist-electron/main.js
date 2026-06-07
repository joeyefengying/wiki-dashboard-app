let electron = require("electron");
let path = require("path");
let url = require("url");
let fs = require("fs");
//#region electron/services/vault-service.ts
var VAULT_ROOT = "E:/project/obsidian-wiki";
var VaultService = class {
	constructor(root) {
		this.root = root || VAULT_ROOT;
	}
	setRoot(path$7) {
		this.root = path$7;
	}
	vaultPath(relative) {
		return (0, path.join)(this.root, relative).replace(/\\/g, "/");
	}
	async getStats() {
		const files = this.walkFiles(this.root);
		let entities = 0, topics = 0, sources = 0, synthesis = 0;
		for (const f of files) {
			const rel = f.replace(this.root + "/", "").replace(/\\/g, "/");
			if (rel.startsWith("wiki/entities/")) entities++;
			else if (rel.startsWith("wiki/topics/")) topics++;
			else if (rel.startsWith("wiki/sources/")) sources++;
			else if (rel.startsWith("wiki/synthesis/")) synthesis++;
		}
		return {
			entities,
			topics,
			sources,
			synthesis,
			totalFiles: files.length
		};
	}
	async getRecentFiles(limit) {
		return this.walkFiles(this.root).filter((f) => f.endsWith(".md")).map((f) => {
			const stat = (0, fs.statSync)(f);
			const rel = f.replace(this.root + "/", "").replace(/\\/g, "/");
			return {
				name: (0, path.basename)(f, ".md"),
				path: rel,
				mtime: stat.mtimeMs,
				size: stat.size,
				isDir: false
			};
		}).sort((a, b) => b.mtime - a.mtime).slice(0, limit);
	}
	async readFile(path$8) {
		return (0, fs.readFileSync)(this.vaultPath(path$8), "utf-8");
	}
	async writeFile(path$9, content) {
		const full = this.vaultPath(path$9);
		(0, fs.mkdirSync)((0, path.dirname)(full), { recursive: true });
		(0, fs.writeFileSync)(full, content, "utf-8");
	}
	async appendFile(path$10, content) {
		const full = this.vaultPath(path$10);
		(0, fs.mkdirSync)((0, path.dirname)(full), { recursive: true });
		(0, fs.appendFileSync)(full, content, "utf-8");
	}
	async listDir(path$11) {
		const full = this.vaultPath(path$11);
		if (!(0, fs.existsSync)(full)) return [];
		return (0, fs.readdirSync)(full).map((name) => {
			const stat = (0, fs.statSync)((0, path.join)(full, name));
			return {
				name,
				path: (path$11 + "/" + name).replace(/\\/g, "/").replace(/\/+/g, "/"),
				mtime: stat.mtimeMs,
				size: stat.size,
				isDir: stat.isDirectory()
			};
		});
	}
	async getActiveProjects() {
		return await this.listDir("PARA 管理/1. 项目");
	}
	async buildProjectTree(dirPath) {
		const base = dirPath || "PARA 管理/1. 项目";
		const entries = await this.listDir(base);
		const nodes = [];
		for (const e of entries) {
			if (!e.isDir) continue;
			const subEntries = await this.listDir(e.path);
			const allFiles = this.walkFiles(this.vaultPath(e.path));
			nodes.push({
				name: e.name,
				path: e.path,
				children: subEntries.some((s) => s.isDir) ? await this.buildProjectTree(e.path) : [],
				fileCount: allFiles.length,
				isDir: true
			});
		}
		return nodes.sort((a, b) => a.name.localeCompare(b.name));
	}
	async createProject(path$12, readme) {
		await this.writeFile(path$12 + "/README.md", readme);
	}
	async moveProject(from, to) {
		const fromFull = this.vaultPath(from);
		const toFull = this.vaultPath(to);
		(0, fs.mkdirSync)((0, path.dirname)(toFull), { recursive: true });
		const files = this.walkFiles(fromFull);
		for (const f of files) {
			const dest = (0, path.join)(toFull, f.replace(fromFull + "/", ""));
			(0, fs.mkdirSync)((0, path.dirname)(dest), { recursive: true });
			(0, fs.renameSync)(f, dest);
		}
		try {
			(0, fs.rmdirSync)(fromFull);
		} catch {}
	}
	async searchTasks(pattern) {
		const results = [];
		const mdFiles = this.walkFiles(this.root).filter((f) => f.endsWith(".md") && !f.includes(".obsidian") && !f.includes("raw/"));
		for (const f of mdFiles.slice(0, 200)) {
			const content = (0, fs.readFileSync)(f, "utf-8");
			const regex = new RegExp(`- \\[ \\].*${pattern}.*`, "gi");
			const matches = content.match(regex);
			if (matches) for (const m of matches) results.push({
				text: m.trim(),
				file: f.replace(this.root + "/", "").replace(/\\/g, "/")
			});
			if (results.length >= 30) break;
		}
		return results;
	}
	getDailyPath() {
		const now = /* @__PURE__ */ new Date();
		const y = now.getFullYear();
		const m = String(now.getMonth() + 1).padStart(2, "0");
		return `周期笔记/${y}/Daily/${m}/${y}-${m}-${String(now.getDate()).padStart(2, "0")}.md`;
	}
	async ensureDailyFile() {
		const path$13 = this.getDailyPath();
		if ((0, fs.existsSync)(this.vaultPath(path$13))) return path$13;
		await this.writeFile(path$13, `## 项目列表\n\n## 日常记录\n\n## 习惯打卡\n\n## 今日完成\n`);
		return path$13;
	}
	async getTasks(dailyPath) {
		const path$14 = dailyPath || this.getDailyPath();
		const full = this.vaultPath(path$14);
		if (!(0, fs.existsSync)(full)) return [];
		const content = (0, fs.readFileSync)(full, "utf-8");
		return this.parseTasks(content);
	}
	async appendToSection(dailyPath, sectionName, line) {
		const full = this.vaultPath(dailyPath);
		if (!(0, fs.existsSync)(full)) {
			await this.writeFile(dailyPath, `## ${sectionName}\n\n${line}\n`);
			return;
		}
		const lines = (0, fs.readFileSync)(full, "utf-8").split("\n");
		let sectionIdx = -1;
		for (let i = 0; i < lines.length; i++) if (lines[i].trim() === `## ${sectionName}`) {
			sectionIdx = i;
			break;
		}
		if (sectionIdx === -1) {
			await this.appendFile(dailyPath, `\n## ${sectionName}\n\n${line}\n`);
			return;
		}
		let nextIdx = lines.length;
		for (let i = sectionIdx + 1; i < lines.length; i++) if (lines[i].match(/^## /)) {
			nextIdx = i;
			break;
		}
		let insertIdx = nextIdx - 1;
		while (insertIdx > sectionIdx && lines[insertIdx].trim() === "") insertIdx--;
		insertIdx++;
		lines.splice(insertIdx, 0, line);
		(0, fs.writeFileSync)(full, lines.join("\n"), "utf-8");
	}
	async toggleTask(dailyPath, raw, done) {
		const full = this.vaultPath(dailyPath);
		if (!(0, fs.existsSync)(full)) return;
		const content = (0, fs.readFileSync)(full, "utf-8");
		const toggled = done ? raw.replace(/- \[x\]/, "- [ ]") : raw.replace(/- \[ \]/, "- [x]");
		(0, fs.writeFileSync)(full, content.replace(raw, toggled), "utf-8");
	}
	parseTasks(content) {
		return content.split("\n").map((line) => {
			const m = line.match(/^\s*- \[(.)\] (.+)$/);
			if (!m) return null;
			const done = m[1] !== " ";
			let rest = m[2].trim();
			let priority = "";
			let due = "";
			const pm = rest.match(/^(⏫|🔼|🔽)\s*/);
			if (pm) {
				priority = pm[1];
				rest = rest.slice(pm[0].length);
			}
			const dm = rest.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
			if (dm) {
				due = dm[1];
				rest = rest.replace(dm[0], "").trim();
			}
			return {
				text: rest.trim(),
				done,
				priority,
				due,
				raw: line
			};
		}).filter(Boolean);
	}
	async getEnabledPlugins() {
		const pluginsDir = (0, path.join)(this.root, ".obsidian/plugins");
		if (!(0, fs.existsSync)(pluginsDir)) return [];
		const configPath = (0, path.join)(this.root, ".obsidian/community-plugins.json");
		let enabledIds = [];
		if ((0, fs.existsSync)(configPath)) try {
			enabledIds = JSON.parse((0, fs.readFileSync)(configPath, "utf-8"));
		} catch {}
		const plugins = [];
		const dirs = (0, fs.readdirSync)(pluginsDir);
		for (const dir of dirs) {
			const manifestPath = (0, path.join)(pluginsDir, dir, "manifest.json");
			if (!(0, fs.existsSync)(manifestPath)) continue;
			try {
				const manifest = JSON.parse((0, fs.readFileSync)(manifestPath, "utf-8"));
				if (enabledIds.includes(manifest.id)) plugins.push({
					id: manifest.id,
					name: manifest.name,
					desc: manifest.description || ""
				});
			} catch {}
		}
		return plugins;
	}
	async getAllOpenTasks() {
		const results = [];
		const mdFiles = this.walkFiles(this.root).filter((f) => f.endsWith(".md") && !f.includes(".obsidian") && !f.includes("raw/"));
		for (const f of mdFiles.slice(0, 250)) {
			const lines = (0, fs.readFileSync)(f, "utf-8").split("\n");
			for (const line of lines) if (line.match(/^\s*- \[ \] /)) results.push({
				text: line.trim().replace(/- \[ \] /, ""),
				file: f.replace(this.root + "/", "").replace(/\\/g, "/")
			});
			if (results.length >= 40) break;
		}
		return results;
	}
	walkFiles(dir) {
		const results = [];
		if (!(0, fs.existsSync)(dir)) return results;
		const list = (0, fs.readdirSync)(dir);
		for (const name of list) {
			const p = (0, path.join)(dir, name);
			if (name.startsWith(".")) continue;
			try {
				if ((0, fs.statSync)(p).isDirectory()) results.push(...this.walkFiles(p));
				else results.push(p);
			} catch {}
		}
		return results;
	}
};
//#endregion
//#region electron/main.ts
var __dirname$1 = (0, path.dirname)((0, url.fileURLToPath)(require("url").pathToFileURL(__filename).href));
var mainWindow = null;
var vaultService = new VaultService();
function createWindow() {
	mainWindow = new electron.BrowserWindow({
		width: 1400,
		height: 900,
		minWidth: 900,
		minHeight: 600,
		title: "Wiki Dashboard",
		titleBarStyle: "hiddenInset",
		webPreferences: {
			preload: (0, path.join)(__dirname$1, "preload.js"),
			nodeIntegration: false,
			contextIsolation: true
		}
	});
	if (process.env.VITE_DEV_SERVER_URL) {
		mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
		mainWindow.webContents.openDevTools();
	} else mainWindow.loadFile((0, path.join)(__dirname$1, "../dist/index.html"));
	console.log("[main] preload path:", (0, path.join)(__dirname$1, "preload.js"));
}
function registerIpc() {
	electron.ipcMain.handle("vault:stats", async () => {
		return await vaultService.getStats();
	});
	electron.ipcMain.handle("vault:recentFiles", async (_event, limit) => {
		return await vaultService.getRecentFiles(limit);
	});
	electron.ipcMain.handle("vault:readFile", async (_event, path$1) => {
		return await vaultService.readFile(path$1);
	});
	electron.ipcMain.handle("vault:writeFile", async (_event, path$2, content) => {
		return await vaultService.writeFile(path$2, content);
	});
	electron.ipcMain.handle("vault:appendFile", async (_event, path$3, content) => {
		return await vaultService.appendFile(path$3, content);
	});
	electron.ipcMain.handle("vault:listDir", async (_event, path$4) => {
		return await vaultService.listDir(path$4);
	});
	electron.ipcMain.handle("vault:buildProjectTree", async () => {
		return await vaultService.buildProjectTree();
	});
	electron.ipcMain.handle("vault:createProject", async (_event, path$5, readme) => {
		return await vaultService.createProject(path$5, readme);
	});
	electron.ipcMain.handle("vault:moveProject", async (_event, from, to) => {
		return await vaultService.moveProject(from, to);
	});
	electron.ipcMain.handle("vault:searchTasks", async (_event, pattern) => {
		return await vaultService.searchTasks(pattern);
	});
	electron.ipcMain.handle("vault:getDailyPath", () => {
		return vaultService.getDailyPath();
	});
	electron.ipcMain.handle("vault:ensureDailyFile", async () => {
		return await vaultService.ensureDailyFile();
	});
	electron.ipcMain.handle("vault:getActiveProjects", async () => {
		return await vaultService.getActiveProjects();
	});
	electron.ipcMain.handle("vault:getTasks", async (_event, dailyPath) => {
		return await vaultService.getTasks(dailyPath);
	});
	electron.ipcMain.handle("vault:appendToSection", async (_event, dailyPath, section, line) => {
		return await vaultService.appendToSection(dailyPath, section, line);
	});
	electron.ipcMain.handle("vault:toggleTask", async (_event, dailyPath, raw, done) => {
		return await vaultService.toggleTask(dailyPath, raw, done);
	});
	electron.ipcMain.handle("vault:searchAllTasks", async (_event, pattern) => {
		return await vaultService.searchTasks(pattern);
	});
	electron.ipcMain.handle("vault:getEnabledPlugins", async () => {
		return await vaultService.getEnabledPlugins();
	});
	electron.ipcMain.handle("vault:openFile", async (_event, path$6) => {
		const full = vaultService.vaultPath(path$6);
		return await electron.shell.openPath(full);
	});
	electron.ipcMain.handle("vault:getAllOpenTasks", async () => {
		return await vaultService.getAllOpenTasks();
	});
}
electron.app.whenReady().then(() => {
	registerIpc();
	createWindow();
});
electron.app.on("window-all-closed", () => {
	electron.app.quit();
});
//#endregion
