# Algorithmia (Phaser + Vite)

## OpenAI integration (secure setup)

Secrets must **not** use the `VITE_` prefix. In Vite, `import.meta.env.VITE_*` is inlined into the client bundle—any secret there can be extracted from deployed JavaScript.

**Do:**

- Put `OPENAI_API_KEY` in `.env.local` (already gitignored).
- Call OpenAI HTTP APIs from the browser only via the **dev-server proxy**: request paths beginning with `/api/openai/` (see `src/api/openAiProxyFetch.ts`).

The proxy rewrites `/api/openai` → `https://api.openai.com` and adds `Authorization` on the Node side. The key never reaches the frontend bundle.

**Do not:**

- Instantiate `OpenAI` in browser code with `dangerouslyAllowBrowser: true`.
- Use `import.meta.env.VITE_OPENAI_API_KEY` or any `VITE_*` variable for tokens.

### Production deployments

`vite preview` and static hosts **do not** run the dev proxy. For production you need one of:

- A small backend (Node, Bun, etc.) that forwards requests using `OPENAI_API_KEY` from server environment variables.
- Platform serverless (e.g. Vercel, Cloudflare Workers) with the key set in the provider’s secret store.

Point your client at that backend path (you can keep the same `/api/openai` prefix if you configure your server to match).

## Scripts

| Command        | Description       |
| -------------- | ----------------- |
| `npm run dev`  | Vite dev server   |
| `npm run build`| Typecheck + build |
| `npm run test` | Vitest            |

Copy `.env.example` to `.env.local` and fill in values as needed.
