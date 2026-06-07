import { readFileSync, writeFileSync, appendFileSync, readdirSync, statSync, existsSync, mkdirSync, renameSync, rmdirSync } from 'fs';
import { join, dirname, basename } from 'path';

const VAULT_ROOT = 'E:/project/obsidian-wiki';

export interface FileInfo {
    name: string;
    path: string;
    mtime: number;
    size: number;
    isDir: boolean;
}

export interface VaultStats {
    entities: number;
    topics: number;
    sources: number;
    synthesis: number;
    totalFiles: number;
}

export interface TreeNode {
    name: string;
    path: string;
    children: TreeNode[];
    fileCount: number;
    isDir: boolean;
}

export class VaultService {
    private root: string;

    constructor(root?: string) {
        this.root = root || VAULT_ROOT;
    }

    setRoot(path: string) {
        this.root = path;
    }

    vaultPath(relative: string): string {
        return join(this.root, relative).replace(/\\/g, '/');
    }

    // ── 统计 ──

    async getStats(): Promise<VaultStats> {
        const files = this.walkFiles(this.root);
        let entities = 0, topics = 0, sources = 0, synthesis = 0;
        for (const f of files) {
            const rel = f.replace(this.root + '/', '').replace(/\\/g, '/');
            if (rel.startsWith('wiki/entities/')) entities++;
            else if (rel.startsWith('wiki/topics/')) topics++;
            else if (rel.startsWith('wiki/sources/')) sources++;
            else if (rel.startsWith('wiki/synthesis/')) synthesis++;
        }
        return { entities, topics, sources, synthesis, totalFiles: files.length };
    }

    // ── 最近文件 ──

    async getRecentFiles(limit: number): Promise<FileInfo[]> {
        const files = this.walkFiles(this.root)
            .filter(f => f.endsWith('.md'))
            .map(f => {
                const stat = statSync(f);
                const rel = f.replace(this.root + '/', '').replace(/\\/g, '/');
                return {
                    name: basename(f, '.md'),
                    path: rel,
                    mtime: stat.mtimeMs,
                    size: stat.size,
                    isDir: false,
                };
            })
            .sort((a, b) => b.mtime - a.mtime)
            .slice(0, limit);
        return files;
    }

    // ── 文件读写 ──

    async readFile(path: string): Promise<string> {
        const full = this.vaultPath(path);
        return readFileSync(full, 'utf-8');
    }

    async writeFile(path: string, content: string): Promise<void> {
        const full = this.vaultPath(path);
        mkdirSync(dirname(full), { recursive: true });
        writeFileSync(full, content, 'utf-8');
    }

    async appendFile(path: string, content: string): Promise<void> {
        const full = this.vaultPath(path);
        mkdirSync(dirname(full), { recursive: true });
        appendFileSync(full, content, 'utf-8');
    }

    // ── 目录列表 ──

    async listDir(path: string): Promise<FileInfo[]> {
        const full = this.vaultPath(path);
        if (!existsSync(full)) return [];
        const entries = readdirSync(full);
        return entries.map(name => {
            const p = join(full, name);
            const stat = statSync(p);
            return {
                name,
                path: (path + '/' + name).replace(/\\/g, '/').replace(/\/+/g, '/'),
                mtime: stat.mtimeMs,
                size: stat.size,
                isDir: stat.isDirectory(),
            };
        });
    }

    // ── 项目树 ──

    async getActiveProjects(): Promise<FileInfo[]> {
        return await this.listDir('PARA 管理/1. 项目');
    }

    async buildProjectTree(dirPath?: string): Promise<TreeNode[]> {
        const base = dirPath || 'PARA 管理/1. 项目';
        const entries = await this.listDir(base);
        const nodes: TreeNode[] = [];
        for (const e of entries) {
            if (!e.isDir) continue;
            const subEntries = await this.listDir(e.path);
            const allFiles = this.walkFiles(this.vaultPath(e.path));
            nodes.push({
                name: e.name,
                path: e.path,
                children: subEntries.some(s => s.isDir) ? await this.buildProjectTree(e.path) : [],
                fileCount: allFiles.length,
                isDir: true,
            });
        }
        return nodes.sort((a, b) => a.name.localeCompare(b.name));
    }

    // ── 项目管理 ──

    async createProject(path: string, readme: string): Promise<void> {
        await this.writeFile(path + '/README.md', readme);
    }

    async moveProject(from: string, to: string): Promise<void> {
        const fromFull = this.vaultPath(from);
        const toFull = this.vaultPath(to);
        mkdirSync(dirname(toFull), { recursive: true });
        const files = this.walkFiles(fromFull);
        for (const f of files) {
            const rel = f.replace(fromFull + '/', '');
            const dest = join(toFull, rel);
            mkdirSync(dirname(dest), { recursive: true });
            renameSync(f, dest);
        }
        try { rmdirSync(fromFull); } catch { /* ignore */ }
    }

    // ── 任务搜索 ──

    async searchTasks(pattern: string): Promise<Array<{ text: string; file: string }>> {
        const results: Array<{ text: string; file: string }> = [];
        const mdFiles = this.walkFiles(this.root)
            .filter(f => f.endsWith('.md') && !f.includes('.obsidian') && !f.includes('raw/'));
        for (const f of mdFiles.slice(0, 200)) {
            const content = readFileSync(f, 'utf-8');
            const regex = new RegExp(`- \\[ \\].*${pattern}.*`, 'gi');
            const matches = content.match(regex);
            if (matches) {
                for (const m of matches) {
                    results.push({ text: m.trim(), file: f.replace(this.root + '/', '').replace(/\\/g, '/') });
                }
            }
            if (results.length >= 30) break;
        }
        return results;
    }

    // ── 日报 ──

    getDailyPath(): string {
        const now = new Date();
        const y = now.getFullYear();
        const m = String(now.getMonth() + 1).padStart(2, '0');
        const d = String(now.getDate()).padStart(2, '0');
        return `周期笔记/${y}/Daily/${m}/${y}-${m}-${d}.md`;
    }

    async ensureDailyFile(): Promise<string> {
        const path = this.getDailyPath();
        const full = this.vaultPath(path);
        if (existsSync(full)) return path;
        await this.writeFile(path, `## 项目列表\n\n## 日常记录\n\n## 习惯打卡\n\n## 今日完成\n`);
        return path;
    }

    // ── 工具 ──

    private walkFiles(dir: string): string[] {
        const results: string[] = [];
        if (!existsSync(dir)) return results;
        const list = readdirSync(dir);
        for (const name of list) {
            const p = join(dir, name);
            if (name.startsWith('.')) continue;
            try {
                const stat = statSync(p);
                if (stat.isDirectory()) {
                    results.push(...this.walkFiles(p));
                } else {
                    results.push(p);
                }
            } catch { /* skip */ }
        }
        return results;
    }
}
