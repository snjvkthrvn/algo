import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'http';

/**
 * Ensures /api/openai requests fail fast with a clear message when the key is missing.
 * The actual proxy is configured in vite.config.ts (server.proxy).
 */
export function openAiProxyGuardPlugin(env: Record<string, string>): Plugin {
  const key = env.OPENAI_API_KEY;
  return {
    name: 'openai-proxy-guard',
    enforce: 'pre',
    configureServer(server) {
      type Next = () => void;
      const guard = (
        req: IncomingMessage,
        res: ServerResponse,
        next: Next,
      ) => {
        const url = req.url ?? '';
        if (!url.startsWith('/api/openai')) {
          next();
          return;
        }
        if (!key) {
          res.statusCode = 503;
          res.setHeader('Content-Type', 'application/json; charset=utf-8');
          res.end(
            JSON.stringify({
              error:
                'OPENAI_API_KEY is not set. Add it to .env.local as OPENAI_API_KEY (server-side only — never use a VITE_ prefix for secrets).',
            }),
          );
          return;
        }
        next();
      };
      server.middlewares.use(guard);
    },
  };
}
