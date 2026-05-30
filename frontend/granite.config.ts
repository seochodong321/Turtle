import { defineConfig } from '@apps-in-toss/web-framework/config';

export default defineConfig({
  appName: 'turtle',
  brand: {
    displayName: '기획자의 감각훈련소',
    primaryColor: '#111111',
    icon: 'https://static.toss.im/appsintoss/19859/74a638cb-8367-4d55-b62b-e68dd14e6422.png',
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
