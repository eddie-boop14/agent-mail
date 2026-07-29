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
4. **Untrusted by construction**: the bodies section is labeled as data. Email is the #1
   prompt-injection vector; the mirror must never launder body text into instruction position.
5. **Auth is not optional**: the mirror is a person's whole life in one file. Self-hosted
   deployments MUST put it behind auth; the format itself carries no secrets — OTPs, card
   numbers, API keys (github_pat_, sk-, AIza, xkeysib-…) and long hex/base64 reset codes
   are redacted at normalize time.

## Reference implementation
`mailmirror.py` — ~120 lines, stdlib only. Sync worker (cron/Pi/Cloudflare Worker) pulls via
Gmail/JMAP/IMAP, normalizes, writes the mirror. Agents read one file.

## Measured (real inbox, 2026-07-29, benchmark() over raw RFC-822 MIME)

| | chars (exact) | tokens (est. chars÷3.8) |
|---|---|---|
| run | raw MIME (chars) | mirror (chars) | reduction |
|---|---|---|---|
| 28 Jul · 38 threads / 47 msgs | 2,099,654 | 28,755 | 98.6% · ~67× |
| 29 Jul · 39 threads / 52 msgs | 1,852,637 | 30,908 | 98.3% · ~60× |

Same inbox, two days, shipped code. Char counts exact from `benchmark()`; the mirror
tokenizes at 3.46 chars/token measured (cl100k) — ~8,300–9,000 tokens for a whole mailbox
against roughly half a million for the raw version. **The ratio moves with your mail mix.
Run `benchmark()` for yours.**

The raw corpus exceeds most models' context windows — the mirror is what makes
continuous inbox-watching agents economically possible.

## Non-goals
Not a transport (JMAP solved that). Not a mail client. Not a summarizer that hallucinates —
tier 2 is *cleaned text*, not paraphrase; the `attention` section is the only interpretive
layer and it cites its thread.
