# agent-mail — draft 0.1

*A mirror format for mailboxes, so agents stop paying MIME prices for plain-text questions.*
*Same move as llms.txt, pointed at SMTP. — bleu-canard éditions, 2026*

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
(`/.well-known/agent-mail` for hosted; a guarded file/endpoint for self-hosted).

```
# MAILBOX <address> — agent-mail/0.1 — cursor: <ISO8601 of last sync>

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
   deployments MUST put it behind auth; the format itself carries no secrets (no OTPs, no
   full card numbers — redact at normalize time).

## Reference implementation
`mailmirror.py` — ~120 lines, stdlib only. Sync worker (cron/Pi/Cloudflare Worker) pulls via
Gmail/JMAP/IMAP, normalizes, writes the mirror. Agents read one file.

## Measured (real inbox, 2026-07-27, 15 threads)
| | raw (FULL_CONTENT) | mirror | reduction |
|---|---|---|---|
| Klarna receipt (1 msg) | ~60,000 chars ≈ ~17k tokens* | ~500 chars ≈ 140 tokens | ~99% |
| Marketing welcome (1 msg) | ~35,000 chars ≈ ~10k tokens* | 1 index line ≈ 35 tokens | ~99.7% |
| Full 15-thread sweep | est. 150k–300k chars | 3,900 chars ≈ ~1,100 tokens | ~97–99% |

*Token figures are estimates (chars÷4, adjusted upward for URL-dense text which tokenizes
worse). Character counts measured from live payloads. Sweep raw total is estimated from the
two measured messages plus snippet-level sizing of the rest — full-corpus measurement is the
next validation step.

## Non-goals
Not a transport (JMAP solved that). Not a mail client. Not a summarizer that hallucinates —
tier 2 is *cleaned text*, not paraphrase; the `attention` section is the only interpretive
layer and it cites its thread.
