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

export interface ParsedTask {
    text: string;
    done: boolean;
    priority: string;
    due: string;
    raw: string;
}

export interface ElectronAPI {
    vault: {
        getStats(): Promise<VaultStats>;
        recentFiles(limit: number): Promise<FileInfo[]>;
        readFile(path: string): Promise<string>;
        writeFile(path: string, content: string): Promise<void>;
        appendFile(path: string, content: string): Promise<void>;
        listDir(path: string): Promise<FileInfo[]>;
        buildProjectTree(dirPath?: string): Promise<TreeNode[]>;
        createProject(path: string, readme: string): Promise<void>;
        moveProject(from: string, to: string): Promise<void>;
        searchTasks(pattern: string): Promise<Array<{ text: string; file: string }>>;
        getDailyPath(): Promise<string>;
        ensureDailyFile(): Promise<string>;
        getActiveProjects(): Promise<FileInfo[]>;
        getTasks(dailyPath?: string): Promise<ParsedTask[]>;
        appendToSection(dailyPath: string, section: string, line: string): Promise<void>;
        toggleTask(dailyPath: string, raw: string, done: boolean): Promise<void>;
        searchAllTasks(pattern: string): Promise<Array<{ text: string; file: string }>>;
    };
}

declare global {
    interface Window {
        electronAPI: ElectronAPI;
    }
}
