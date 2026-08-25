import { defineConfig } from 'vite'

export default defineConfig({
  // Serve the root directory (index.html at root)
  root: '.',
  build: {
    outDir: 'dist',
    rollupOptions: {
      // Declare all HTML entry points so Vite bundles them
      input: {
        main: './index.html',
        blog: './blog.html',
        infra: './infra.html',
      }
    }
  },
  server: {
    port: 3000,
    open: true, // auto-open browser on dev start
  }
})
