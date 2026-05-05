import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    base: env.VITE_BASE_PATH || '/',
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
