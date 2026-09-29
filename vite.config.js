import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The site serves every route (/city/paris, /trip...) from the root, so assets use absolute paths.
// The single-file preview build uses relative paths and hash routes instead.
export default defineConfig({
  base: process.env.VITE_PREVIEW ? './' : '/',
  plugins: [react()],
})
