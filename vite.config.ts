import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tsconfigPaths from "vite-tsconfig-paths";

// https://vite.dev/config/
export default defineConfig({
  base: process.env.BASE_PATH || '/',
  build: {
    sourcemap: 'hidden',
  },
  plugins: [
    react({
      babel: {
        plugins:
          process.env.NODE_ENV === 'development'
            ? ['react-dev-locator']
            : [],
      },
    }),
    tsconfigPaths()
  ],
})
