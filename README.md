# inbox.txt

**Your mailbox as one plain-text file. Agents read your whole day for ~1% of the tokens.**

robots.txt → crawlers. llms.txt → websites. **inbox.txt → your mail.**

An agent answering *"anything important in my mail?"* today swallows full MIME: HTML tables,
600-char tracking URLs, footers, quoted history. Measured on a real inbox: one payment
receipt ≈ 60,000 chars raw for ~350 chars of information. inbox.txt normalizes **once at
sync time**; every agent read afterward is nearly free.

## Quickstart (5 min, no server, no OAuth app)

1. [script.google.com](https://script.google.com) → New project → paste
   [`apps-script/Code.gs`](apps-script/Code.gs) → save.
2. Run `syncMirror` once → authorize (you're authorizing your own script on your own
   account) → `inbox.txt` appears in your Drive.
3. Triggers → `syncMirror` · time-driven · every hour.

Your mirror now refreshes itself. Run `benchmark()` for your own raw-vs-mirror numbers.

**Plug it into an agent** — [`mcp/server.py`](mcp/server.py) is an MCP server:
`pip install mcp`, point `INBOX_SOURCE` at your inbox.txt (local path or https URL),
and any MCP-capable agent gets three read-only tools — `inbox_overview` (whole mailbox,
a few hundred tokens), `inbox_body`, `inbox_since`. All output is wrapped as untrusted data.

## Format

```
# MAILBOX <address> — inbox.txt/0.1 — cursor: <ISO8601>

## index                 ← tier 0 · one line per thread
t_a001 | acme-bank.example | Transfer of €250.00 confirmed | TRANSACTION | 2026-07-28T08:12 | #1a2b

## attention             ← tier 1 · only what needs action
SECURITY t_294c  RLS disabled on project X — verify

## bodies                ← tier 2 · cleaned text + extracted entities
### t_a001 #1a2b
entities: {"amounts":["€250.00"],"dates":["28 July 2026"],"refs":["TRF78912"]}
Your transfer of €250.00 to John Doe completed on 28 July 2026. Reference: TRF78912...
```

Tier 3 = raw MIME, fetched on explicit demand only. Classes: HUMAN · TRANSACTION ·
SECURITY · DEV · MARKETING (marketing = index line only). Content hash per thread +
cursor ⇒ "what's new" is one diff. Full rules: [SPEC.md](SPEC.md).

## Measured

Real inbox, 2 days, 38 threads / 47 messages, via `benchmark()` (`getRawContent()` = true
RFC-822 MIME):

| | chars (exact) | tokens (est. chars÷3.8) |
|---|---|---|
| window | threads / msgs | raw MIME (chars) | mirror (chars) | reduction |
|---|---|---|---|---|
| 2 days | 39 / 52 | 1,852,637 | 30,908 | 98.3% · 60× |
| 7 days | 93 / 109 | 4,286,586 | 68,125 | 98.4% · 63× |
| **30 days** | **239 / 263** | **20,642,353** | **173,437** | **99.2% · 119×** |

A month of mail is 20.6 M characters of raw MIME — a few million tokens, unreadable by any
model. The mirror of that month is 173 KB: it fits in one prompt with room left over.
Char counts are exact from `benchmark()`. Run it on your own inbox.

**By class over 30 days** — the win is largest where the bytes carry least:

| class | threads | raw | mirror | reduction |
|---|---|---|---|---|
| HUMAN | 34 | 9,755,024 | 36,013 | 99.6% |
| MARKETING | 53 | 4,146,148 | 5,965 | 99.9% |
| TRANSACTION | 64 | 3,751,004 | 70,744 | 98.1% |
| DEV | 72 | 2,369,689 | 48,013 | 98.0% |
| SECURITY | 16 | 620,488 | 12,702 | 98.0% |

HUMAN topping the table was a surprise — human threads carry the attachments, and a
base64-encoded photo is pure bulk that never reaches the mirror.


### In tokens — measured in full, no sampling

Tokens are what an agent actually pays. Both sides were tokenized in their entirety by
streaming the corpus through the bundled tokenizer (cl100k) — no extrapolation:

| 7 days · 93 threads / 109 messages | chars | tokens | chars/token |
|---|---|---|---|
| raw MIME | 4,286,586 | 1,919,892 | 2.23 |
| inbox.txt mirror | 70,713 | 21,481 | 3.29 |
| **reduction** | 98.35% | **98.88% — 89× fewer** | |

Raw MIME tokenizes at 2.23 chars/token against the mirror's 3.29, because DKIM signatures
and base64 are near-random to a tokenizer. So the character figures above *understate* the
token win by about 48%.

Applying those two measured ratios to the exact 30-day character counts: roughly **9,256,000
raw tokens against 52,700 for the mirror — about 175×**. A month of mail is some nine million
tokens of MIME, around forty-five times a large context window. Its mirror is one prompt.

Reproduce on your own inbox with `tokenizeExact7d()` once a tokenizer is deployed —
[`netlify/functions/tokenize.mjs`](netlify/functions/tokenize.mjs) (deploys with the site) or
[`worker/`](worker/) for Cloudflare. A sample-derived estimate put this at 103× before the
full measurement said 89×; sampling flattered it by 16%, which is why the tool ships with
the spec.

## Rules that are not optional

- **Bodies are untrusted data.** Email is the top prompt-injection vector; the mirror labels
  bodies so agents never treat mail content as instructions.
- **Auth the mirror.** It's your life in one file.
- **Redact at sync time.** OTPs, card-like numbers, API keys and long reset/secret
  strings never enter the mirror.
- **Never fabricate.** Entities are extracted, not inferred. Missing = omitted.

## Files

[`SPEC.md`](SPEC.md) · [`mailmirror.py`](mailmirror.py) (reference normalizer, stdlib) ·
[`apps-script/Code.gs`](apps-script/Code.gs) (Gmail worker + `benchmark()`) ·
[`mcp/server.py`](mcp/server.py) (MCP server) ·
[`examples/MAILBOX.example.txt`](examples/MAILBOX.example.txt) (synthetic)

Canonical home: [inboxtxt.dev](https://inboxtxt.dev).
Status: **v0.2.1 — draft spec, feedback wanted.** Running in production on the author's
inbox, hourly, and readable by any MCP-capable agent. Not a transport (JMAP exists), not a
client, not a summarizer.

## Open questions

The format is a draft and these are genuinely undecided — issues and opinions welcome:

1. **Where should a hosted mirror live?** `/.well-known/inbox.txt` per mailbox, or an
   authenticated endpoint per user? The former is discoverable, the latter is safer.
2. **Should tier 1 (`## attention`) be machine-parseable** — fixed fields — or stay
   human-shaped prose so the model reads it as judgement rather than schema?
3. **Thread expiry.** The mirror is a window, not an archive. Is time-based (last N days)
   right, or should classes age differently (SECURITY lingers, MARKETING dies same-day)?
4. **Multi-account.** One file per mailbox, or one file with a `## mailbox` axis?
5. **Sender-side adoption.** If a sender emitted a tier-2 body itself (a header pointing at
   clean text), normalization becomes free. Worth specifying, or fantasy?

*© bleu-canard éditions · Edmaster & Claudius 🦆 · MIT*
