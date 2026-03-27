import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// 支持多平台部署：Cloudflare Pages / GitHub Pages / Vercel
// 默认 '/' (Cloudflare/Vercel 自定义域名)，通过环境变量覆盖
export default defineConfig({
  base: process.env.VITE_BASE_URL || '/',
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true
  },
  build: {
    // 超过 500KB 的 chunk 发出警告
    chunkSizeWarningLimit: 500,
    // 生成 source map 便于调试
    sourcemap: false,
    // 代码分割：将 recharts 和 react-router 单独拆包，减少首屏体积
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('recharts') || id.includes('d3-') || id.includes('internmap') || id.includes('delaunator') || id.includes('robust-predicates')) {
              return 'vendor-charts'
            }
            if (id.includes('react-router')) {
              return 'vendor-router'
            }
            if (id.includes('date-fns')) {
              return 'vendor-date'
            }
            if (id.includes('dompurify')) {
              return 'vendor-sanitize'
            }
          }
        },
      },
    },
  },
})
