# inbox.txt

**Your mailbox as one plain-text file, so AI agents stop paying MIME prices for plain-text questions.**

robots.txt told crawlers what to read. llms.txt told LLMs what a site says.
**inbox.txt tells agents what your mailbox says — at ~1% of the token cost.**

*(repo URL says agent-mail for historical reasons; the format is inbox.txt — an unrelated
commercial product already owns the AgentMail name, and it solves the opposite problem:
inboxes FOR agents. This is a mirror OF human inboxes.)*

---

## The problem, measured

An agent answering *"anything important in my mail today?"* fetches full MIME payloads:
HTML tables six levels deep, 600-character tracking URLs, MSO conditional comments, legal
footers, tracking pixels, and the entire quoted history re-sent in every reply.

Measured on a real inbox (2026-07-27):

| message | raw payload | actual information |
|---|---|---|
| One Klarna payment receipt | ~60,000 chars | ~350 chars (amount, dates, refs, item) |
| One marketing welcome email | ~35,000 chars | 1 line ("welcome, you bought X") |

Every agent pays that price on every read, forever. That's what makes continuous
inbox-watching agents economically dead on arrival.

## The flip

**Normalize once at delivery time. Read the mirror forever.**

Mail already has one mandatory chokepoint — delivery — where SPF/DKIM/spam/DLP parse every
message once. Add one more pass there: strip the soup, extract the entities, classify, hash,
and append to a tiered plain-text mirror. Parsing cost is linear in mail *received* (once
each). Savings are linear in agent *reads* — the exploding term.

Same philosophy as static site generation vs. runtime JS: do the work once, serve flat.

## The format

One UTF-8 file per mailbox. Agents descend only as deep as needed:

```
# MAILBOX <address> — inbox.txt/0.1 — cursor: 2026-07-27T18:44Z

## index                    ← TIER 0 · ~15-40 tokens/thread
t_ccdd | klarna.fr | 1er paiement reçu pour Back Market | TRANSACTION | 2026-07-27T03:25 | #c5

## attention                ← TIER 1 · only what needs a human or an action
SECURITY t_c9b2  GitHub: new PAT created — verify if not you
ACTION   t_7731  Parcel delivered tomorrow — confirm address before midnight

## bodies                   ← TIER 2 · cleaned text, entities extracted
### t_ccdd #c5
entities: {"amounts": ["312,33 €","936,99 €"], "dates": ["26 août 2026"], "refs": ["V2XBRSVH"]}
Paiement de 312,33 € effectué. Prochain prélèvement le 26 août 2026...
```

TIER 3 = raw MIME, fetched from the mail store only on explicit demand. Never in the mirror.

Full rules in [SPEC.md](SPEC.md). Real-world sample (anonymized) in
[examples/MAILBOX.example.txt](examples/MAILBOX.example.txt).

## Measured result

Full 15-thread day, real inbox: **raw est. 150k–300k chars → 4,067-char mirror (~1,100
tokens)**. That's a ~97–99% reduction, and it's the number that turns "mail agent" from a
party trick into something you can run on a timer all day.

*Honesty note: token figures are chars-based estimates adjusted for URL-dense text; the
sweep total extrapolates from two fully-measured messages. Replacing every estimate with
tiktoken-measured counts over a 200+ thread corpus is the current milestone — see Status.*

## Security stance (non-negotiable)

1. **Bodies are untrusted data.** Email is the #1 prompt-injection vector. The bodies
   section is explicitly labeled so agents never treat mail content as instructions.
2. **The mirror is your life in one file.** Self-hosted deployments MUST sit behind auth.
3. **Redact at normalize time.** No OTPs, no full card numbers ever enter the mirror.
4. **No fabrication.** Entities are extracted, never inferred. Missing field = omitted.

## What's here

- [`SPEC.md`](SPEC.md) — the one-page format spec (draft 0.1)
- [`mailmirror.py`](mailmirror.py) — reference normalizer, ~120 lines, stdlib only
- [`apps-script/Code.gs`](apps-script/Code.gs) — zero-OAuth sync worker that runs inside
  your own Google account on a timer (see file header for 5-minute setup)
- [`examples/MAILBOX.example.txt`](examples/MAILBOX.example.txt) — a real day, mirrored

## Status

Prototype — proven on one real inbox, one day, notification-heavy mail.
Open before v0.2: tiktoken-measured benchmark on 200+ threads · quoted-history collapse for
HUMAN threads · OTP/card redaction pass · Outlook/JMAP sync workers.

Not a transport (JMAP solved that). Not a mail client. Not a summarizer that hallucinates.

---

*© bleu-canard éditions · Edmaster & Claudius 🦆 · MIT*
