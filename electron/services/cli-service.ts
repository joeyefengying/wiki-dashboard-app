import { exec } from 'child_process';
import { VAULT_ROOT } from './vault-service';

export class CliService {
    private vaultRoot: string;

    constructor(root?: string) {
        this.vaultRoot = root || VAULT_ROOT;
    }

    async execClaude(prompt: string): Promise<{ success: boolean; output: string }> {
        return new Promise((resolve) => {
            const cmd = `claude -p "${prompt.replace(/"/g, '\\"')}"`;
            exec(cmd, {
                cwd: this.vaultRoot,
                timeout: 300_000, // 5 分钟超时
                maxBuffer: 10 * 1024 * 1024, // 10MB
                windowsHide: true,
            }, (error, stdout, stderr) => {
                if (error) {
                    resolve({
                        success: false,
                        output: stderr || error.message || '执行失败',
                    });
                } else {
                    resolve({
                        success: true,
                        output: stdout || '（无输出）',
                    });
                }
            });
        });
    }
}
