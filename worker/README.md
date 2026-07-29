# inbox.txt tokenizer worker

Exact cl100k token counts for the benchmark, so the published numbers stop being estimates.

## Why

Character counts are exact and reproducible anywhere. Token counts were not: Apps Script
has no tokenizer (a BPE vocabulary is ~1.7 MB), and a 20 MB raw-MIME corpus is too large to
export somewhere else just to be counted. So the counter is deployed next to the pipes: the
sync worker streams the corpus through it in chunks and sums the results.

## Deploy from a phone (no CLI)

1. Cloudflare dashboard → **Workers & Pages → Create → Workers → Import a repository**.
2. Pick `eddie-boop14/inbox-txt`, set **root directory** to `worker`.
   Build command `npm install`, deploy command `npx wrangler deploy`.
3. After the first deploy: **Settings → Variables and Secrets → Add secret**
   `TOKENIZE_TOKEN` = any long random string.
4. Open the worker URL in a browser — a GET returns usage text, which confirms it's live.

## Deploy with the CLI

    cd worker && npm install
    npx wrangler secret put TOKENIZE_TOKEN
    npx wrangler deploy

## Use it

    curl -X POST "$WORKER_URL" -H "Authorization: Bearer $TOKENIZE_TOKEN" \
         -H 'content-type: text/plain' --data-binary @some.txt
    → {"chars":31317,"cl100k":9051,"ms":42}

In `apps-script/Code.gs` set `TOKENIZER_URL` and `TOKENIZER_TOKEN`, then run
`tokenizeExact7d()` from the function dropdown. It tokenizes the live mirror exactly,
streams every raw message through the worker, and logs both sides with no extrapolation.

Requests are capped at 400,000 chars each; the caller chunks. Auth is a single shared
secret — this is a measuring instrument for one inbox, not a public API.

*MIT · © bleu-canard éditions*
