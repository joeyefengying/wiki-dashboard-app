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
    execClaudeLive(
        prompt: string,
        onOutput: (line: string) => void,
        onDone: (code: number | null) => void,
    ): void {
        if (this.activeProcess) {
            this.activeProcess.kill();
        }

        const cmd = `claude`;
        const args: string[] = [];  // 不用 -p，通过 stdin 传入
        console.log('[CliService] spawning:', cmd, 'with stdin prompt');

        const proc = spawn(cmd, args, {
            cwd: this.vaultRoot,
            shell: true,
            windowsHide: true,
            env: { ...process.env, FORCE_COLOR: '0' },
            stdio: ['pipe', 'pipe', 'pipe'], // stdin 用于传入 prompt
        });

        this.activeProcess = proc;

        // 立即写入 prompt 并关闭 stdin
        if (proc.stdin) {
            proc.stdin.write(prompt + '\n');
            proc.stdin.end();
        }

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
