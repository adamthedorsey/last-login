/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Server-side game core (types + engine). Story content from this
      // directory may only be imported behind `import.meta.env.DEV` guards —
      // scripts/check-bundle.mjs verifies none of it reaches prod bundles.
      '@gamecore': fileURLToPath(new URL('./supabase/functions/_shared/gamecore', import.meta.url)),
    },
  },
  build: {
    sourcemap: false,
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
