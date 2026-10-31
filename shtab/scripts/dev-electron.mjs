// Dev-запуск: поднимает Vite-сервер, ждёт его готовность, собирает main/preload и запускает Electron.
// Использование: npm run dev  (см. package.json)

import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');

const PORT = 5173;

function waitForPort(timeoutMs = 60000) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    const tryOnce = () => {
      const sock = net.connect(PORT, '127.0.0.1');
      sock.once('connect', () => { sock.destroy(); resolve(); });
      sock.once('error', () => {
        sock.destroy();
        if (Date.now() - start > timeoutMs) reject(new Error('Vite-сервер не поднялся за 60 секунд'));
        else setTimeout(tryOnce, 400);
      });
    };
    tryOnce();
  });
}

function run(cmd, args, opts = {}) {
  return spawn(cmd, args, { cwd: root, stdio: 'inherit', shell: process.platform === 'win32', ...opts });
}

const vite = run(process.execPath, [path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')]);

let electronProc = null;
let shuttingDown = false;

async function startElectron() {
  await waitForPort();
  // Сборка main/preload (dev-сборка без typecheck — быстрый цикл).
  const build = await new Promise((resolve) => {
    const p = run(process.execPath, [
      path.join(root, 'node_modules', 'esbuild', 'bin', 'esbuild'),
      'src/electron/main.ts', 'src/electron/preload.ts',
      '--bundle', '--platform=node', '--format=cjs',
      '--external:better-sqlite3', '--outdir=dist-electron',
    ]);
    p.on('exit', (code) => resolve(code));
  });
  if (build !== 0) { console.error('Не удалось собрать main-процесс'); shutdown(1); return; }

  const userDataDir = path.join(root, '.dev-userdata');
  electronProc = run(process.execPath, [path.join(root, 'node_modules', 'electron', 'cli.js'), '.', '--no-sandbox'], {
    env: { ...process.env, SHTAB_DEV: '1', ELECTRON_USER_DATA: userDataDir },
  });
  electronProc.on('exit', (code) => shutdown(code ?? 0));
}

function shutdown(code) {
  if (shuttingDown) return;
  shuttingDown = true;
  try { vite.kill(); } catch { /* уже завершён */ }
  try { if (electronProc) electronProc.kill(); } catch { /* уже завершён */ }
  process.exit(code);
}

vite.on('exit', (code) => shutdown(code ?? 0));
startElectron().catch((err) => { console.error(err.message); shutdown(1); });
