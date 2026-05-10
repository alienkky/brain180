import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// VITE_BASE_URL lets us deploy the same build to different roots:
//   default     → /          (Railway, custom domains, dev preview)
//   GitHub Pages → /brain180/ (set via the deploy workflow env)
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: process.env.VITE_BASE_URL ?? '/',
})
