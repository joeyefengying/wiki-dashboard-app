import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { VaultService } from './services/vault-service';

const __dirname = dirname(fileURLToPath(import.meta.url));

let mainWindow: BrowserWindow | null = null;
const vaultService = new VaultService();

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 900,
        minHeight: 600,
        title: 'Wiki Dashboard',
        titleBarStyle: 'hiddenInset',
        webPreferences: {
            preload: join(__dirname, 'preload.js'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    // 开发模式加载 Vite dev server
    if (process.env.VITE_DEV_SERVER_URL) {
        mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
        mainWindow.webContents.openDevTools();
    } else {
        mainWindow.loadFile(join(__dirname, '../dist/index.html'));
    }
    console.log('[main] preload path:', join(__dirname, 'preload.js'));
}

// IPC 注册
function registerIpc() {
    ipcMain.handle('vault:stats', async () => {
        return await vaultService.getStats();
    });

    ipcMain.handle('vault:recentFiles', async (_event, limit: number) => {
        return await vaultService.getRecentFiles(limit);
    });

    ipcMain.handle('vault:readFile', async (_event, path: string) => {
        return await vaultService.readFile(path);
    });

    ipcMain.handle('vault:writeFile', async (_event, path: string, content: string) => {
        return await vaultService.writeFile(path, content);
    });

    ipcMain.handle('vault:appendFile', async (_event, path: string, content: string) => {
        return await vaultService.appendFile(path, content);
    });

    ipcMain.handle('vault:listDir', async (_event, path: string) => {
        return await vaultService.listDir(path);
    });

    ipcMain.handle('vault:buildProjectTree', async () => {
        return await vaultService.buildProjectTree();
    });

    ipcMain.handle('vault:createProject', async (_event, path: string, readme: string) => {
        return await vaultService.createProject(path, readme);
    });

    ipcMain.handle('vault:moveProject', async (_event, from: string, to: string) => {
        return await vaultService.moveProject(from, to);
    });

    ipcMain.handle('vault:searchTasks', async (_event, pattern: string) => {
        return await vaultService.searchTasks(pattern);
    });

    ipcMain.handle('vault:getDailyPath', () => {
        return vaultService.getDailyPath();
    });

    ipcMain.handle('vault:ensureDailyFile', async () => {
        return await vaultService.ensureDailyFile();
    });

    ipcMain.handle('vault:getActiveProjects', async () => {
        return await vaultService.getActiveProjects();
    });

    ipcMain.handle('vault:getTasks', async (_event, dailyPath?: string) => {
        return await vaultService.getTasks(dailyPath);
    });

    ipcMain.handle('vault:appendToSection', async (_event, dailyPath: string, section: string, line: string) => {
        return await vaultService.appendToSection(dailyPath, section, line);
    });

    ipcMain.handle('vault:toggleTask', async (_event, dailyPath: string, raw: string, done: boolean) => {
        return await vaultService.toggleTask(dailyPath, raw, done);
    });

    ipcMain.handle('vault:searchAllTasks', async (_event, pattern: string) => {
        return await vaultService.searchTasks(pattern);
    });

    ipcMain.handle('vault:getEnabledPlugins', async () => {
        return await vaultService.getEnabledPlugins();
    });

    ipcMain.handle('vault:openFile', async (_event, path: string) => {
        const full = vaultService.vaultPath(path);
        return await shell.openPath(full);
    });

    ipcMain.handle('vault:getAllOpenTasks', async () => {
        return await vaultService.getAllOpenTasks();
    });
}

app.whenReady().then(() => {
    registerIpc();
    createWindow();
});

app.on('window-all-closed', () => {
    app.quit();
});
