import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig(({command, mode}) => { 
    return {
        build: {
            manifest: true,
            rollupOptions: {
                input: {
                    main: '/src/client/main.ts'
                },
            },
            polyfillDynamicImport: false,
            target: 'esnext',
            outDir: './build/client'
        },
        plugins: [vue()]
    }
})
