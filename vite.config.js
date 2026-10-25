import {defineConfig} from 'vite';

export default defineConfig({
    root: 'client',
    publicDir: 'public',

    build: {
        outDir: '../build',
        emptyOutDir: true,
        copyPublicDir: true
    }
});