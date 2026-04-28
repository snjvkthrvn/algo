/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite';
import path from 'path';
import { openAiProxyGuardPlugin } from './vite/plugins/openAiProxyGuard';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const openAiKey = env.OPENAI_API_KEY;

  return {
    plugins: [openAiProxyGuardPlugin(env)],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 3000,
      open: true,
      proxy: openAiKey
        ? {
            '/api/openai': {
              target: 'https://api.openai.com',
              changeOrigin: true,
              secure: true,
              rewrite: (pathname) => {
                const trimmed = pathname.replace(/^\/api\/openai/, '');
                return trimmed.length > 0 ? trimmed : '/';
              },
              configure: (proxy) => {
                proxy.on('proxyReq', (proxyReq) => {
                  proxyReq.removeHeader('authorization');
                  proxyReq.removeHeader('Authorization');
                  proxyReq.setHeader('Authorization', `Bearer ${openAiKey}`);
                });
              },
            },
          }
        : {},
    },
    build: {
      target: 'es2020',
      outDir: 'dist',
    },
    test: {
      environment: 'node',
      include: ['src/**/*.test.ts'],
    },
  };
});
