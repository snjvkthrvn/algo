/**
 * OpenAI HTTP calls routed through `/api/openai`, which only exists on the dev server proxy.
 * Configure OPENAI_API_KEY in `.env.local` (no `VITE_` prefix) so secrets are not embedded in the bundle.
 *
 * Production: host an equivalent HTTPS route on your backend or serverless (see README).
 */

const PREFIX = '/api/openai';

export function openAiUrl(openaiPath: string): string {
  const p = openaiPath.startsWith('/') ? openaiPath : `/${openaiPath}`;
  return `${PREFIX}${p}`;
}

/** POST body is typically JSON; caller must stringify as needed */
export async function openAiFetch(
  openaiPath: string,
  init?: RequestInit,
): Promise<Response> {
  return fetch(openAiUrl(openaiPath), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });
}
