import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';

const readRepoFile = (path: string): string =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

describe('deployment readiness', () => {
  it('publishes Cloudflare static hosting controls', () => {
    expect(existsSync(resolve(process.cwd(), 'public/_headers'))).toBe(true);

    const headers = readRepoFile('public/_headers');
    expect(headers).toContain('/*');
    expect(headers).toContain('Cache-Control: no-cache, no-store, must-revalidate');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).not.toContain('max-age=604800');
  });

  it('declares SPA fallback in wrangler.toml (Workers Static Assets equivalent of _redirects)', () => {
    // Workers Static Assets rejects the Pages-style "/* /index.html 200" redirect
    // as an infinite-loop hazard. The canonical SPA fallback declaration lives in
    // wrangler.toml under [assets].not_found_handling.
    expect(existsSync(resolve(process.cwd(), 'public/_redirects'))).toBe(false);
    expect(existsSync(resolve(process.cwd(), 'wrangler.toml'))).toBe(true);
    const wranglerToml = readRepoFile('wrangler.toml');
    expect(wranglerToml).toContain('[assets]');
    expect(wranglerToml).toContain('directory = "./dist"');
    expect(wranglerToml).toContain('not_found_handling = "single-page-application"');
  });

  it('exposes an executable production browser support matrix', () => {
    expect(existsSync(resolve(process.cwd(), 'playwright.browser.config.ts'))).toBe(true);
    expect(packageJson.scripts['test:browsers:prod']).toBe(
      'playwright test --config=playwright.browser.config.ts',
    );
  });
});
