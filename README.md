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
t_ccdd | klarna.fr | 1er paiement reçu | TRANSACTION | 2026-07-27T03:25 | #f87f

## attention             ← tier 1 · only what needs action
SECURITY t_294c  RLS disabled on project X — verify

## bodies                ← tier 2 · cleaned text + extracted entities
### t_ccdd #f87f
entities: {"amounts":["312,33 €"],"dates":["26 août 2026"],"refs":["V2XBRSVH"]}
Paiement de 312,33 € effectué. Prochain prélèvement le 26 août 2026...
```

Tier 3 = raw MIME, fetched on explicit demand only. Classes: HUMAN · TRANSACTION ·
SECURITY · DEV · MARKETING (marketing = index line only). Content hash per thread +
cursor ⇒ "what's new" is one diff. Full rules: [SPEC.md](SPEC.md).

## Measured

Real inbox, 2 days, 38 threads / 47 messages, via `benchmark()` (`getRawContent()` = true
RFC-822 MIME):

| | chars (exact) | tokens (est. chars÷3.8) |
|---|---|---|
| raw MIME | 2,099,654 | ≈607,000* |
| inbox.txt mirror | 28,755 | 9,051 measured* |
| **reduction** | **99%** | **~67× (98.5%)** |

The raw version doesn't even fit a typical context window. The mirror is a side note.
Run `benchmark()` on your own inbox — one log line.

\* Tokenizer-measured (gpt cl100k) on a live mirror snapshot: 31,317 chars → 9,051 tokens (3.46 chars/token; o200k: 8,697). Raw-side tokens are implied from that measured ratio; raw char counts are exact from `benchmark()`.

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
