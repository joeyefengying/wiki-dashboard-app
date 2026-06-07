import { BrowserWindow, app, ipcMain } from "electron";
import { basename, dirname, join } from "path";
import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync, renameSync, rmdirSync, statSync, writeFileSync } from "fs";
//#region electron/services/vault-service.ts
var VAULT_ROOT = "E:/project/obsidian-wiki";
var VaultService = class {
	constructor(root) {
		this.root = root || VAULT_ROOT;
	}
	setRoot(path) {
		this.root = path;
	}
	vaultPath(relative) {
		return join(this.root, relative).replace(/\\/g, "/");
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
			const stat = statSync(f);
			const rel = f.replace(this.root + "/", "").replace(/\\/g, "/");
			return {
				name: basename(f, ".md"),
				path: rel,
				mtime: stat.mtimeMs,
				size: stat.size,
				isDir: false
			};
		}).sort((a, b) => b.mtime - a.mtime).slice(0, limit);
	}
	async readFile(path) {
		return readFileSync(this.vaultPath(path), "utf-8");
	}
	async writeFile(path, content) {
		const full = this.vaultPath(path);
		mkdirSync(dirname(full), { recursive: true });
		writeFileSync(full, content, "utf-8");
	}
	async appendFile(path, content) {
		const full = this.vaultPath(path);
		mkdirSync(dirname(full), { recursive: true });
		appendFileSync(full, content, "utf-8");
	}
	async listDir(path) {
		const full = this.vaultPath(path);
		if (!existsSync(full)) return [];
		return readdirSync(full).map((name) => {
			const stat = statSync(join(full, name));
			return {
				name,
				path: (path + "/" + name).replace(/\\/g, "/").replace(/\/+/g, "/"),
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
	async createProject(path, readme) {
		await this.writeFile(path + "/README.md", readme);
	}
	async moveProject(from, to) {
		const fromFull = this.vaultPath(from);
		const toFull = this.vaultPath(to);
		mkdirSync(dirname(toFull), { recursive: true });
		const files = this.walkFiles(fromFull);
		for (const f of files) {
			const dest = join(toFull, f.replace(fromFull + "/", ""));
			mkdirSync(dirname(dest), { recursive: true });
			renameSync(f, dest);
		}
		try {
			rmdirSync(fromFull);
		} catch {}
	}
	async searchTasks(pattern) {
		const results = [];
		const mdFiles = this.walkFiles(this.root).filter((f) => f.endsWith(".md") && !f.includes(".obsidian") && !f.includes("raw/"));
		for (const f of mdFiles.slice(0, 200)) {
			const content = readFileSync(f, "utf-8");
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
		const path = this.getDailyPath();
		if (existsSync(this.vaultPath(path))) return path;
		await this.writeFile(path, `## 项目列表\n\n## 日常记录\n\n## 习惯打卡\n\n## 今日完成\n`);
		return path;
	}
	walkFiles(dir) {
		const results = [];
		if (!existsSync(dir)) return results;
		const list = readdirSync(dir);
		for (const name of list) {
			const p = join(dir, name);
			if (name.startsWith(".")) continue;
			try {
				if (statSync(p).isDirectory()) results.push(...this.walkFiles(p));
				else results.push(p);
			} catch {}
		}
		return results;
	}
};
//#endregion
//#region electron/main.ts
var mainWindow = null;
var vaultService = new VaultService();
function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		minWidth: 900,
		minHeight: 600,
		title: "Wiki Dashboard",
		titleBarStyle: "hiddenInset",
		webPreferences: {
			preload: join(__dirname, "preload.js"),
			nodeIntegration: false,
			contextIsolation: true
		}
	});
	if (process.env.VITE_DEV_SERVER_URL) mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
	else mainWindow.loadFile(join(__dirname, "../dist/index.html"));
}
function registerIpc() {
	ipcMain.handle("vault:stats", async () => {
		return await vaultService.getStats();
	});
	ipcMain.handle("vault:recentFiles", async (_event, limit) => {
		return await vaultService.getRecentFiles(limit);
	});
	ipcMain.handle("vault:readFile", async (_event, path) => {
		return await vaultService.readFile(path);
	});
	ipcMain.handle("vault:writeFile", async (_event, path, content) => {
		return await vaultService.writeFile(path, content);
	});
	ipcMain.handle("vault:appendFile", async (_event, path, content) => {
		return await vaultService.appendFile(path, content);
	});
	ipcMain.handle("vault:listDir", async (_event, path) => {
		return await vaultService.listDir(path);
	});
	ipcMain.handle("vault:buildProjectTree", async () => {
		return await vaultService.buildProjectTree();
	});
	ipcMain.handle("vault:createProject", async (_event, path, readme) => {
		return await vaultService.createProject(path, readme);
	});
	ipcMain.handle("vault:moveProject", async (_event, from, to) => {
		return await vaultService.moveProject(from, to);
	});
	ipcMain.handle("vault:searchTasks", async (_event, pattern) => {
		return await vaultService.searchTasks(pattern);
	});
	ipcMain.handle("vault:getDailyPath", () => {
		return vaultService.getDailyPath();
	});
	ipcMain.handle("vault:ensureDailyFile", async () => {
		return await vaultService.ensureDailyFile();
	});
	ipcMain.handle("vault:getActiveProjects", async () => {
		return await vaultService.getActiveProjects();
	});
}
app.whenReady().then(() => {
	registerIpc();
	createWindow();
});
app.on("window-all-closed", () => {
	app.quit();
});
//#endregion
export {};
