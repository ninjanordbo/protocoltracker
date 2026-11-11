// Fire-and-forget git commits for the markdown data layer.
// If the project isn't a git repo (or git isn't available) this is a no-op.

import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';

let isRepo: boolean | null = null;
let hasRemote = false;

export function commitData(message: string): void {
  try {
    if (isRepo === null) {
      // Checked lazily on first write; sync check is fine at this scale.
      const { execSync } = require('child_process') as typeof import('child_process');
      try {
        execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
        isRepo = true;
        try {
          execSync('git remote get-url origin', { stdio: 'ignore' });
          hasRemote = true;
        } catch {
          hasRemote = false;
        }
      } catch {
        isRepo = false;
      }
    }
    if (!isRepo) return;
    const safe = message.replace(/"/g, "'");
    exec(
      `git add data && git commit -m "${safe}" --quiet${hasRemote ? ' && git push --quiet' : ''}`,
      { cwd: process.cwd() },
      (err, _stdout, stderr) => {
        try {
          fs.appendFileSync(
            path.join(process.cwd(), 'git-sync.log'),
            `${new Date().toISOString()} remote=${hasRemote} err=${err ? err.message : 'none'} stderr=${stderr}\n`
          );
        } catch {}
      }
    );
  } catch {
    // never break the app over version control
  }
}
