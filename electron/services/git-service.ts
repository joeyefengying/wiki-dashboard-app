import { simpleGit, SimpleGit, StatusResult } from 'simple-git';
import { VAULT_ROOT } from './vault-service';

export interface GitStatus {
    path: string;
    modified: string[];
    added: string[];
    deleted: string[];
    untracked: string[];
    conflicted: string[];
    ahead: number;
    behind: number;
    current: string;
    hasChanges: boolean;
}

export class GitService {
    private git: SimpleGit;

    constructor(root?: string) {
        this.git = simpleGit(root || VAULT_ROOT);
    }

    async status(): Promise<GitStatus> {
        const s: StatusResult = await this.git.status();
        return {
            path: VAULT_ROOT,
            modified: s.modified,
            added: [...s.created, ...s.staged],
            deleted: s.deleted,
            untracked: s.not_added,
            conflicted: s.conflicted,
            ahead: s.ahead,
            behind: s.behind,
            current: s.current || 'unknown',
            hasChanges: !s.isClean(),
        };
    }

    async pull(): Promise<string> {
        const result = await this.git.pull();
        return result.summary?.changes?.length
            ? `拉取 ${result.summary.changes.length} 个变更`
            : '已是最新';
    }

    async push(): Promise<string> {
        await this.git.push();
        return '推送成功';
    }

    async commit(message: string): Promise<string> {
        await this.git.add('.');
        await this.git.commit(message);
        return '提交成功';
    }

    async sync(message?: string): Promise<string> {
 const s = await this.git.status();
        if (!s.isClean()) {
            await this.git.add('.');
            await this.git.commit(message || 'Dashboard auto-sync');
        }
        await this.git.pull();
        await this.git.push();
        return '同步完成';
    }
}
