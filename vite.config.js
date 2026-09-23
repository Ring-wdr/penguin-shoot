import { defineConfig } from 'vite';

export default defineConfig({
  base: '/penguin-shoot/', // GitHub Pages 프로젝트 경로
  build: {
    chunkSizeWarningLimit: 800, // three가 대부분(약 490kB, gzip 130kB) — 한 화면짜리 게임이라 분할하지 않음
  },
  test: {
    include: ['tests/**/*.test.js'],
  },
});
