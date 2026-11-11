// Fire-and-forget git commits for the markdown data layer.
// If the project isn't a git repo (or git isn't available) this is a no-op.

import { exec } from 'child_process';

let isRepo: boolean | null = null;

export function commitData(message: string): void {
  try {
    if (isRepo === null) {
      // Checked lazily on first write; sync check is fine at this scale.
      const { execSync } = require('child_process') as typeof import('child_process');
      try {
        execSync('git rev-parse --is-inside-work-tree', { stdio: 'ignore' });
        isRepo = true;
      } catch {
        isRepo = false;
      }
    }
    if (!isRepo) return;
    const safe = message.replace(/"/g, "'");
    exec(
      `git add data && git commit -m "${safe}" --quiet`,
      { cwd: process.cwd() },
      () => {} // ignore errors (nothing to commit, etc.)
    );
  } catch {
    // never break the app over version control
  }
}
