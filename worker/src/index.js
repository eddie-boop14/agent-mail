/**
 * inbox.txt tokenizer — exact token counts, so nothing in the benchmark is an estimate.
 * bleu-canard éditions · Edmaster & Claudius 🦆 · MIT
 *
 * POST plain text with `Authorization: Bearer <TOKENIZE_TOKEN>` → exact cl100k count.
 * Apps Script streams the corpus in chunks and sums; see tokenizeExact7d() in Code.gs.
 *
 * Why a service at all: Apps Script has no tokenizer (a BPE vocabulary is ~1.7 MB) and a
 * 20 MB mail corpus can't be shipped anywhere else to be counted. So the counter goes
 * where the pipes already are.
 */
import { encode } from 'gpt-tokenizer/encoding/cl100k_base';

const MAX = 400_000; // chars per request — keeps CPU inside Workers limits

export default {
  async fetch(request, env) {
    if (request.method === 'GET') {
      return new Response(
        'inbox.txt tokenizer\n\nPOST text/plain (max 400000 chars) with:\n' +
        '  Authorization: Bearer <TOKENIZE_TOKEN>\n\n→ {"chars":n,"cl100k":n,"ms":n}\n',
        { headers: { 'content-type': 'text/plain; charset=utf-8' } }
      );
    }
    if (request.method !== 'POST') return new Response('method not allowed', { status: 405 });

    const expected = env.TOKENIZE_TOKEN;
    if (!expected) return new Response('server not configured: set TOKENIZE_TOKEN secret', { status: 500 });
    if ((request.headers.get('authorization') || '') !== `Bearer ${expected}`) {
      return new Response('unauthorized', { status: 401 });
    }

    const text = await request.text();
    if (!text) return Response.json({ chars: 0, cl100k: 0, ms: 0 });
    if (text.length > MAX) {
      return Response.json({ error: `chunk too large: ${text.length} > ${MAX}` }, { status: 413 });
    }

    const t0 = Date.now();
    const count = encode(text).length;
    return Response.json({ chars: text.length, cl100k: count, ms: Date.now() - t0 });
  },
};
