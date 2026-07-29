# inbox.txt — draft 0.1

*A mirror format for mailboxes, so agents stop paying MIME prices for plain-text questions.*
*Same move as llms.txt, pointed at SMTP. — bleu-canard éditions, 2026*
*Canonical home: https://inboxtxt.dev · Reference: https://github.com/eddie-boop14/agent-mail*

## Problem
An LLM agent answering "anything important in my mail?" today fetches full MIME payloads:
HTML soup, 600-char tracking URLs, MSO comments, quoted history, legal footers. Measured on a
real inbox: one Klarna receipt ≈ 60,000 chars raw for ~350 chars of information. Cost scales
with every read, by every agent, forever.

## Principle
**Normalize once at delivery time. Read the mirror forever.**
Mail has one mandatory chokepoint — delivery — where DKIM/spam/DLP already parse every
message. Add one more pass there. Parsing cost is linear in mail *received*; savings are
linear in agent *reads* (which is the exploding term).

## Format
One UTF-8 text document per mailbox (or per label/folder), served at a well-known location
(`/.well-known/inbox.txt` for hosted; a guarded file/endpoint for self-hosted).

```
# MAILBOX <address> — inbox.txt/0.1 — cursor: <ISO8601 of last sync>

## index                          ← TIER 0: one line per thread, ~15-40 tokens
<id> | <sender-domain> | <subject ≤48> | <class> | <date> | #<content-hash>

## attention                      ← TIER 1: only threads needing action/review
<CLASS> <id>  <one-line reason>

## quarantine                     ← spam: tier 0 only, bodies never mirrored
<id> | <sender-domain> | <subject> | SPAM | <date>

## bodies                         ← TIER 2: cleaned text, tracking URLs → [link:domain],
### <id> #<hash>                     footers stripped, entities extracted
entities: {"amounts": [...], "dates": [...], "refs": [...]}
<cleaned body, capped>
```

TIER 3 = raw MIME, fetched from the mail store only on explicit demand. Never in the mirror.

## Rules
1. **Classes**: HUMAN · TRANSACTION · SECURITY · DEV · MARKETING. MARKETING gets tier 0 only.
2. **Hashes**: content hash per thread. Unchanged hash ⇒ agent may skip re-reading. Cursor ⇒
   "what's new" is one diff, not five searches.
3. **No fabrication**: entities are extracted, never inferred. Missing field = omitted.
4. **Spam is visible, never quoted.** Real mail lands in spam, so a `## quarantine`
   section lists it at tier 0 — sender domain, subject, date — and *never* mirrors a body.
   Spam is the most hostile prompt-injection surface in a mailbox; the agent gets to say
   "something from your accountant is in spam" without a single untrusted line entering the
   file.
5. **Untrusted by construction**: the bodies section is labeled as data. Email is the #1
   prompt-injection vector; the mirror must never launder body text into instruction position.
6. **Auth is not optional**: the mirror is a person's whole life in one file. Self-hosted
   deployments MUST put it behind auth; the format itself carries no secrets — OTPs, card
   numbers, API keys (github_pat_, sk-, AIza, xkeysib-…) and long hex/base64 reset codes
   are redacted at normalize time.

## Reference implementation
`mailmirror.py` — ~120 lines, stdlib only. Sync worker (cron/Pi/Cloudflare Worker) pulls via
Gmail/JMAP/IMAP, normalizes, writes the mirror. Agents read one file.

## Measured (real inbox, 2026-07-29, benchmark() over raw RFC-822 MIME)

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

Method: `benchmark()` sums `getRawContent().length` per message against the live mirror.
Exact token counts come from the `worker/` tokenizer (cl100k) via `tokenizeExact7d()`.


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

## Non-goals
Not a transport (JMAP solved that). Not a mail client. Not a summarizer that hallucinates —
tier 2 is *cleaned text*, not paraphrase; the `attention` section is the only interpretive
layer and it cites its thread.
