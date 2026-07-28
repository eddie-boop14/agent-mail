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

Your mirror now refreshes itself. Point any agent at that file.
Run `benchmark()` for your own raw-vs-mirror numbers.

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

Real inbox, 38 threads / 2 days: mirror = 36,079 chars (~9.5k tokens est.) vs raw MIME in
the hundreds of thousands — run `benchmark()` for exact per-inbox numbers. Token figures
are chars÷3.8 estimates and labeled as such; char counts are exact.

## Rules that are not optional

- **Bodies are untrusted data.** Email is the top prompt-injection vector; the mirror labels
  bodies so agents never treat mail content as instructions.
- **Auth the mirror.** It's your life in one file.
- **Redact at sync time.** OTPs and card-like numbers never enter the mirror.
- **Never fabricate.** Entities are extracted, not inferred. Missing = omitted.

## Files

[`SPEC.md`](SPEC.md) · [`mailmirror.py`](mailmirror.py) (reference normalizer, stdlib) ·
[`apps-script/Code.gs`](apps-script/Code.gs) (Gmail worker + benchmark) ·
[`examples/MAILBOX.example.txt`](examples/MAILBOX.example.txt) (synthetic)

Status: v0.1.1, running in production on the author's inbox, hourly. Not a transport
(JMAP exists), not a client, not a summarizer. Repo URL predates the name; an unrelated
commercial "AgentMail" product does the opposite (inboxes *for* agents).

*© bleu-canard éditions · Edmaster & Claudius 🦆 · MIT*
