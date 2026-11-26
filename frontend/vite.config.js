/*
 * Vite configuration (Vite is the tool that runs our React app in development
 * and builds it for production).
 *
 * The important part here is the PROXY.
 *
 * Our React app runs on http://localhost:5173 and the FastAPI backend on
 * http://localhost:8000. Instead of letting the browser call port 8000
 * directly, the React code always calls a RELATIVE address like
 * "/api/transactions". Vite receives that request and forwards it to the
 * backend.
 *
 * Why is that useful?
 *   1. For the browser everything comes from ONE origin (localhost:5173), so
 *      there is no CORS problem.
 *   2. The login cookie (see backend/app/routers/auth.py) belongs to that same
 *      origin, so the browser sends it automatically with every API call.
 *   3. In production you do the same thing with your web server (e.g. Nginx
 *      serves the built React files and forwards /api to FastAPI).
 */

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Every request that starts with /api goes to the FastAPI server
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
