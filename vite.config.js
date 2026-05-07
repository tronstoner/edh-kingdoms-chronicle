import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Ensure base always ends with '/' so import.meta.env.BASE_URL is consistently formed.
  const rawBase = env.VITE_BASE_PATH || '/'
  const base = rawBase.endsWith('/') ? rawBase : rawBase + '/'
  return {
    base,
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          lifetracker: resolve(__dirname, 'lifetracker/index.html'),
        },
      },
    },
    plugins: [
      vue(),
      tailwindcss(),
      {
        name: 'css-charset',
        generateBundle(_, bundle) {
          for (const file of Object.values(bundle)) {
            if (file.fileName.endsWith('.css')) {
              file.source = '@charset "UTF-8";\n' + file.source
            }
          }
        },
      },
    ],
  }
})
