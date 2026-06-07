import { spawn, ChildProcess } from 'child_process';
import { VAULT_ROOT } from './vault-service';

export class CliService {
    private vaultRoot: string;
    private activeProcess: ChildProcess | null = null;

    constructor(root?: string) {
        this.vaultRoot = root || VAULT_ROOT;
    }

    /**
     * 执行 claude 命令，实时推送输出到 callback
     */
    /**
     * 保存 prompt 到临时文件，返回文件路径
     */
    savePrompt(prompt: string): string {
        const fs = require('fs');
        const path = require('path');
        const tmpDir = path.join(this.vaultRoot, '.tmp');
        if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
        const filePath = path.join(tmpDir, 'claude-prompt.txt');
        fs.writeFileSync(filePath, prompt, 'utf-8');
        return filePath;
    }

    async openClaudeTerminal(prompt: string): Promise<void> {
        // 用 PowerShell 打开新窗口
        const psCmd = `Set-Location '${this.vaultRoot}'; Write-Host '正在启动 Claude Code...' -ForegroundColor Cyan; Write-Host ''; claude`;
        const cmd = `start "Claude Code" powershell -NoExit -Command "[Console]::OutputEncoding=[Text.Encoding]::UTF8; ${psCmd}"`;
        const { exec } = require('child_process');
        return new Promise((resolve) => {
            exec(cmd, { windowsHide: false }, () => resolve());
        });
    }

    execClaudeLive(
        prompt: string,
        onOutput: (line: string) => void,
        onDone: (code: number | null) => void,
    ): void {
        if (this.activeProcess) {
            this.activeProcess.kill();
        }

        const cmd = `claude`;
        const args = ['-p', prompt];
        console.log('[CliService] spawning:', cmd);

        const proc = spawn(cmd, args, {
            cwd: this.vaultRoot,
            shell: true,
            windowsHide: true,
            env: { ...process.env, FORCE_COLOR: '0' },
            stdio: ['ignore', 'pipe', 'pipe'],
        });

        this.activeProcess = proc;

        proc.stdout.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (line.trim()) onOutput(line);
            }
        });

        proc.stderr.on('data', (data: Buffer) => {
            const lines = data.toString().split('\n');
            for (const line of lines) {
                if (line.trim()) onOutput(`[err] ${line}`);
            }
        });

        proc.on('close', (code) => {
            console.log('[CliService] process closed, code:', code);
            this.activeProcess = null;
            onDone(code);
        });

        proc.on('error', (err) => {
            console.error('[CliService] spawn error:', err);
            onOutput(`[error] ${err.message}`);
            this.activeProcess = null;
            onDone(-1);
        });
    }

    /**
     * 终止当前执行
     */
    kill() {
        if (this.activeProcess) {
            this.activeProcess.kill();
            this.activeProcess = null;
        }
    }
}
