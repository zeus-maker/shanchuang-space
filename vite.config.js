import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  base: '/shanchuang-space',
  // @ffmpeg/ffmpeg 内含 worker，预打包后 worker 路径会指向 .vite/deps 下不存在的文件
  optimizeDeps: {
    exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util']
  },
  plugins: [vue()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  server: {
    proxy: {
      '/v1': {
        target: 'https://api.chatfire.site',
        changeOrigin: true
      },
      '/api/media': {
        target: 'http://127.0.0.1:8787',
        changeOrigin: true
      }
    }
  }
})
