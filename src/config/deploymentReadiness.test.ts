import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import packageJson from '../../package.json';

const readRepoFile = (path: string): string =>
  readFileSync(resolve(process.cwd(), path), 'utf8');

describe('deployment readiness', () => {
  it('publishes Cloudflare Pages static hosting controls', () => {
    expect(existsSync(resolve(process.cwd(), 'public/_headers'))).toBe(true);
    expect(existsSync(resolve(process.cwd(), 'public/_redirects'))).toBe(true);

    const headers = readRepoFile('public/_headers');
    expect(headers).toContain('/*');
    expect(headers).toContain('Cache-Control: no-cache, no-store, must-revalidate');
    expect(headers).toContain('X-Content-Type-Options: nosniff');
    expect(headers).not.toContain('max-age=604800');

    const redirects = readRepoFile('public/_redirects');
    expect(redirects).toContain('/* /index.html 200');
  });

  it('exposes an executable production browser support matrix', () => {
    expect(existsSync(resolve(process.cwd(), 'playwright.browser.config.ts'))).toBe(true);
    expect(packageJson.scripts['test:browsers:prod']).toBe(
      'playwright test --config=playwright.browser.config.ts',
    );
  });
});
