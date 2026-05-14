# Deployment Runbook

Target for the first public build: Cloudflare Pages serving the static Vite build.

## Cloudflare Pages

Use these project settings:

| Setting | Value |
| --- | --- |
| Framework preset | Vite or None |
| Build command | `npm run build` |
| Build output directory | `dist` |
| Node version | Cloudflare default, or the active local LTS used for the release |

Files under `public/` are copied into `dist/` by Vite. The launch build includes:

- `public/_headers` for security headers and correctness-first no-cache responses.
- `public/_redirects` for a single-page-app fallback to `index.html`.

## HTTPS And Domain

Cloudflare Pages provides HTTPS for the generated `*.pages.dev` URL. For a custom domain, add the domain in the Pages dashboard and complete the DNS records Cloudflare gives for that project.

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
