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
    rollupOptions: {
      treeshake: {
        // @react95/icons ships no `sideEffects` flag, so its barrel import
        // would drag all ~1950 icons into the bundle. Its modules are pure;
        // declaring that lets tree-shaking keep only the icons we import.
        moduleSideEffects: (id) => !id.includes('@react95/icons'),
      },
    },
  },
  test: {
    include: ['tests/**/*.test.ts'],
    environment: 'node',
  },
})
