import {defineConfig} from 'vite';

export default defineConfig({
    root: 'client',
    server: {
        port: 888,
        host: true
    },
    build: {
        outDir: '../build',
        emptyOutDir: true
    }
});