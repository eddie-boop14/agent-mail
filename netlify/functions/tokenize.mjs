/**
 * inbox.txt tokenizer — Netlify Function edition (the easy one to deploy).
 * bleu-canard éditions · Edmaster & Claudius 🦆 · MIT
 *
 * Deploys automatically with the site: this repo is already linked to Netlify, so pushing
 * this file is the deploy. No dashboard wizard, no CLI, and a 10-second budget per call
 * (Cloudflare's free plan caps CPU at ~10ms, which is why this exists).
 *
 * Setup, once:
 *   Netlify → your site → Site configuration → Environment variables → add
 *     TOKENIZE_TOKEN = <any long random string>
 *   Then in apps-script/Code.gs:
 *     TOKENIZER_URL   = 'https://inboxtxt.dev/.netlify/functions/tokenize'
 *     TOKENIZER_TOKEN = <the same string>
 *     TOKENIZER_CHUNK = 200000
 *
 * POST text/plain → {"chars":n,"cl100k":n,"o200k":n,"ms":n}
 */
import { encode as cl100k } from 'gpt-tokenizer/encoding/cl100k_base';
import { encode as o200k } from 'gpt-tokenizer/encoding/o200k_base';

const MAX = 400_000;

export default async (request) => {
  if (request.method === 'GET') {
    return new Response(
      'inbox.txt tokenizer\n\nPOST text/plain (max 400000 chars) with:\n' +
      '  Authorization: Bearer <TOKENIZE_TOKEN>\n\n' +
      '→ {"chars":n,"cl100k":n,"o200k":n,"ms":n}\n',
      { headers: { 'content-type': 'text/plain; charset=utf-8' } }
    );
  }
  if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });

  const expected = process.env.TOKENIZE_TOKEN;
  if (!expected) return new Response('server not configured: set TOKENIZE_TOKEN', { status: 500 });
  if ((request.headers.get('authorization') || '') !== `Bearer ${expected}`) {
    return new Response('unauthorized', { status: 401 });
  }

  const text = await request.text();
  if (!text) return Response.json({ chars: 0, cl100k: 0, o200k: 0, ms: 0 });
  if (text.length > MAX) {
    return Response.json({ error: `chunk too large: ${text.length} > ${MAX}` }, { status: 413 });
  }

  const t0 = Date.now();
  const a = cl100k(text).length;
  const b = o200k(text).length;
  return Response.json({ chars: text.length, cl100k: a, o200k: b, ms: Date.now() - t0 });
};
