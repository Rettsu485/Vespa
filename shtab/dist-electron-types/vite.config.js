import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
// Renderer build. Electron main/preload are built separately by esbuild (scripts/build-main.mjs).
const rootDir = fileURLToPath(new URL('.', import.meta.url));
export default defineConfig({
    base: './',
    plugins: [react()],
    resolve: {
        alias: {
            '@': path.resolve(rootDir, 'src'),
            '@shared': path.resolve(rootDir, 'shared'),
        },
    },
    root: '.',
    build: {
        outDir: 'dist',
        emptyOutDir: true,
    },
    server: {
        port: 5173,
        strictPort: true,
    },
});
