import {defineConfig} from 'vite';

export default defineConfig({
    root: 'client',
    server: {
        port: 888
    },
    build: {
        outDir: '../build',
        emptyOutDir: true
    }
});