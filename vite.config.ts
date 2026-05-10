import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// VITE_BASE_URL lets us deploy the same build to different roots:
//   GitHub Pages → /brain180/ (default, served from a subpath)
//   Railway     → /          (served from a custom domain root)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_URL ?? '/brain180/',
})
