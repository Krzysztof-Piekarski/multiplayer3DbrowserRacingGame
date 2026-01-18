import {defineConfig} from 'vite';

export default defineConfig({
    root: 'client',
    server: {
        port: 8024
    },
    build: {
        outDir: '../build',
        emptyOutDir: true
    }
});