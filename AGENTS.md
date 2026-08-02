# AGENTS.md

Instructions for coding agents working in this repository. Humans should read
[README.md](README.md) and [SPEC.md](SPEC.md) instead — those are the real documents.

## What this project is

`inbox.txt` is a **format**, not an application. A mailbox is normalised once at sync
time into a tiered plain-text file; agents read the mirror instead of raw MIME. The
reference implementation exists to prove the format is buildable in an afternoon, not to
become a product.

Keep that order of priorities: **the spec is the artefact, the code serves it.**

## Ground rules

1. **Numbers in this repo are measured, never estimated.** If you change a figure, you
   must have run `benchmark()` or `tokenizeExact7d()` to produce it, and the same figure
   must be updated in *all five* places it appears: `README.md`, `SPEC.md`, `index.html`,
   `why.html`, `llms.txt`. An inconsistent benchmark is worse than no benchmark.

2. **Never soften a correction.** The published reduction was once estimated at 103× and
   measured at 89×. That correction stays in the text. If a future measurement is less
   flattering, it replaces the old one in full, in every location.

3. **The untrusted-content rules are load-bearing.** Bodies are labelled untrusted, spam
   never gets a body, secrets are redacted at sync time, entities are extracted rather
   than inferred. Do not "simplify" these away. If you think one is wrong, open an issue
   arguing the case — do not quietly change it.

4. **No dependencies without a reason that survives a sentence.** `mailmirror.py` is
   standard library only. The Apps Script worker uses no libraries at all. The tokenizer
   is the single exception, and it exists solely so the benchmark is reproducible.

5. **No analytics, no cookies, no tracking, no build step** on the website. Two static
   pages and some plain text. If a change requires a bundler, it is the wrong change.

## Layout

    SPEC.md                        the specification (draft 0.2.1)
    README.md                      setup, benchmark, open questions
    apps-script/Code.gs            Gmail sync worker — runs in the user's own account
    mailmirror.py                  reference normalizer, stdlib only
    mcp/server.py                  MCP server: inbox_overview, inbox_body, inbox_since
    netlify/functions/tokenize.mjs exact cl100k / o200k counts for the benchmark
    worker/                        the same tokenizer as a Cloudflare Worker
    index.html  why.html           the website
    llms.txt  llms-full.txt        machine-readable entry points — update with the site
    example.txt                    synthetic mirror, safe to read, shows every tier

## When changing the site

`llms.txt` and `llms-full.txt` are part of the site, not decoration. If a page changes
materially, regenerate `llms-full.txt` and review `llms.txt` by hand. A stale machine
index on a project about machine-readable formats is an embarrassment, not a detail.

## Tone

Plain, specific, and willing to say what is not known. The spec is a draft and says so.
Gmail-first and says so. If you find yourself writing marketing copy, stop.
