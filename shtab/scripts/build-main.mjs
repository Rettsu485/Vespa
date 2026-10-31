// Сборка main- и preload-процессов Electron через esbuild.
// Миграции (.sql) копируются в dist-electron как есть (читаются из fs в рантайме).
import { build } from 'esbuild';
import fs from 'node:fs';
import path from 'node:path';

const root = path.resolve(import.meta.dirname, '..');
const outdir = path.join(root, 'dist-electron');

const common = {
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  sourcemap: false,
  minify: false,
  external: ['better-sqlite3', 'electron'],
};

await build({ ...common, entryPoints: [path.join(root, 'electron/main.ts')], outfile: path.join(outdir, 'main.js') });
await build({ ...common, entryPoints: [path.join(root, 'electron/preload.ts')], outfile: path.join(outdir, 'preload.js') });

// Копируем SQL-миграции рядом с собранным main.js (путь __dirname/migrations).
const migrationsSrc = path.join(root, 'electron/migrations');
const migrationsDst = path.join(outdir, 'migrations');
fs.rmSync(migrationsDst, { recursive: true, force: true });
fs.mkdirSync(migrationsDst, { recursive: true });
for (const f of fs.readdirSync(migrationsSrc)) {
  if (f.endsWith('.sql')) fs.copyFileSync(path.join(migrationsSrc, f), path.join(migrationsDst, f));
}
console.log('build:main ok ->', outdir);
