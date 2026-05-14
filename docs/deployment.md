# Deployment Runbook

Target for the first public build: Cloudflare serving the static Vite build via Workers Static Assets.

## Cloudflare Workers Static Assets

Use these project settings in the dashboard:

| Setting | Value |
| --- | --- |
| Framework preset | None (auto-detection picks "Vite" and forces a Vite-6 requirement we don't want) |
| Build command | `npm run build` |
| Deploy command | `npx wrangler deploy` |
| Build output directory | `dist` |
| Node version | Cloudflare default, or the active local LTS used for the release |

The repo declares the deploy contract in `wrangler.toml`:

- `[assets] directory = "./dist"` points at the Vite build output.
- `not_found_handling = "single-page-application"` is the canonical SPA fallback declaration. Do not also add a Pages-style `public/_redirects` rule like `/* /index.html 200`; Workers Static Assets rejects it as an infinite-loop hazard. The wrangler.toml setting is the right place.

Files under `public/` are copied into `dist/` by Vite. The launch build includes:

- `public/_headers` for security headers and correctness-first no-cache responses.

## HTTPS And Domain

Cloudflare provides HTTPS for the generated Worker URL. For a custom domain, add the Worker custom domain or route in Cloudflare and complete the DNS records Cloudflare gives for that project.

Before launch, verify the live URL:

```bash
curl.exe -I https://<domain>/
curl.exe -I https://<domain>/index.html
curl.exe -I https://<domain>/assets/<known-asset>
```

Expected checks:

- Root and `index.html` return `200`.
- Root, SPA fallback paths, and static assets include `Cache-Control: no-cache, no-store, must-revalidate`.
- HTTP requests redirect to HTTPS once the custom domain is active.

## Local Production Smoke

Use the same production build path the host will serve:

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4173
```

Then open `http://127.0.0.1:4173/`.

Static hosting does not run the Vite dev proxy. Do not rely on `/api/openai/*` in this launch build unless a provider-side function is added.

The launch header policy intentionally avoids long-lived media caching because `public/assets/` contains Phaser assets with stable filenames. Add fingerprinted media paths or loader cache-busting before enabling long `max-age` headers for game art.
