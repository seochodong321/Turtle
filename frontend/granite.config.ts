import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'turtle-gamsak', // 콘솔에 등록한 appName으로 변경하세요
  brand: {
    displayName: '기획자의 감각훈련소',
    primaryColor: '#111111',
    icon: '', // 콘솔에서 업로드한 아이콘 URL로 변경하세요
  },
  web: {
    host: 'localhost',
    port: 3000,
    commands: {
      dev: 'vite',
      build: 'vite build',
    },
  },
  permissions: [],
  outdir: 'dist',
});
