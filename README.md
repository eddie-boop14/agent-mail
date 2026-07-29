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


### In tokens

Characters are the exact, reproducible unit. Tokens are what an agent actually pays, so they
were measured too: **raw MIME tokenizes at 2.10 chars/token** (cl100k, measured on a
19,899-char stratified sample — one message per class; per-class spread is narrow, 1.99–2.22).
The mirror, being clean text, runs 3.46.

| window | raw ≈ tokens | mirror ≈ tokens | reduction |
|---|---|---|---|
| 7 days | 2,037,000 | 19,700 | 99.0% · 103× |
| **30 days** | **9,809,000** | **50,100** | **99.5% · 196×** |

A month of mail is roughly **9.8 million tokens** of raw MIME — about fifty times a large
context window. The mirror of that month is ~50,000 tokens, which fits in one prompt.
Because raw MIME tokenizes worse than clean text, the character-based figures above
*understate* the win.

These token numbers apply a measured ratio to exact character counts. To remove the
extrapolation entirely, deploy [`worker/`](worker/) and run `tokenizeExact7d()` — it streams
the whole corpus through a real tokenizer and reports both sides exactly.

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
