import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    rollupOptions: {
      output: {
        // Split the biggest deps out of the main bundle so they load in
        // parallel and stay cached across deploys. No behaviour change.
        manualChunks(id: string) {
          if (id.includes('node_modules/framer-motion')) return 'motion';
          if (/node_modules\/(react|react-dom|react-router|react-router-dom|scheduler)\//.test(id)) {
            return 'react-vendor';
          }
          return undefined;
        },
      },
    },
  },
})
