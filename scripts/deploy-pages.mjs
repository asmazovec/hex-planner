// Publishes the build, and only the build, to the repository behind the `pages` git remote.
// Its history is thrown away on every deploy: the sources and their commits stay on this computer.
import { execSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const run = (command, options = {}) => execSync(command, { stdio: 'inherit', ...options });

let remote;
try {
  remote = execSync('git remote get-url pages', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
} catch {
  console.error('Нет удалённого репозитория pages. Добавьте его: git remote add pages <адрес репозитория>');
  process.exit(1);
}

run('npm run build');

const dist = resolve('dist');
// Without this file GitHub Pages runs Jekyll, which is not needed for a ready build.
writeFileSync(join(dist, '.nojekyll'), '');

const gitDir = mkdtempSync(join(tmpdir(), 'ti4-pages-'));
// A neutral author: the commit is public, and the personal address from the git config must stay out of it.
const git = `git --git-dir="${gitDir}" --work-tree="${dist}" -c user.name=deploy -c user.email=deploy@localhost -c core.autocrlf=false`;
try {
  run(`${git} init --quiet --initial-branch=main`);
  run(`${git} add --all`);
  run(`${git} commit --quiet -m "Build"`);
  run(`${git} push --force "${remote}" main`);
  console.log(`Опубликовано в ${remote}`);
} finally {
  rmSync(gitDir, { recursive: true, force: true });
}
