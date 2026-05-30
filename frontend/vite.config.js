import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // 웹뷰(앱인토스)에서 번들이 루트가 아닌 경로로 서빙되어도 에셋을 찾도록 상대경로 사용
  base: './',
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
});
