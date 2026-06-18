# LogBATT Lead Management Tool

Automated cold acquisition pipeline for LogBATT GmbH: finds candidate companies, researches and
qualifies them against LogBATT's ICP, drafts a personalized cold email with Claude, and sends it
over SMTP once you've attached a verified contact address.

## Pipeline

1. **Prospect** — runs web search queries (Serper.dev) derived from LogBATT's ICP to find candidate
   companies. Saves them locally with stage `prospected`.
2. **Run** — for each prospected company: fetches their website, asks Claude to summarize them and
   flag battery/EV relevance, scores them against the ICP (`qualify.js`), and — if qualified —
   drafts a short personalized cold email (`draft.js`). Disqualified leads are marked and skipped.
3. **Set contact** — this tool does not source verified contact emails (no paid contact-data API is
   wired up). After `run`, manually find the right contact (e.g. via the company site or LinkedIn)
   and attach it: `node src/cli.js set-contact acme.com jane@acme.com`.
4. **Send** — sends the drafted email over SMTP to the attached contact, one lead or all
   drafted-and-contacted leads at once.

Everything is stored in `data/leads.json` (gitignored) so re-running `prospect` won't duplicate
companies you've already seen, and you always have an audit trail of research/qualification
reasoning behind each email.

## Setup

```bash
npm install
cp .env.example .env
# fill in ANTHROPIC_API_KEY, SERPER_API_KEY, and SMTP_* in .env
```

## Usage

```bash
# 1. Find candidate companies (uses default LogBATT ICP queries)
node src/cli.js prospect

# or with a custom query
node src/cli.js prospect --query "EV fleet operator Germany battery returns"

# 2. Research, qualify, and draft outreach for everything found
node src/cli.js run

# 3. Review what was found/drafted
node src/cli.js list

# 4. Attach a verified contact email to a qualified lead
node src/cli.js set-contact acme.com jane@acme.com

# 5. Send
node src/cli.js send acme.com
# or send everything that's drafted and has a contact attached
node src/cli.js send --send-all
```

## Web dashboard

A LogBATT-branded dashboard wraps the same pipeline in a browser UI: prospect, run, review/edit
drafted emails, attach contacts, and send — all from one page.

```bash
npm run dashboard
# open http://localhost:4173
```

It's a thin Express server (`src/server.js`) over the same `src/pipeline.js` functions the CLI
uses, so both stay in sync. Branding assets (logo, process-flow icons) live in `public/assets/`,
extracted from LogBATT's own presentation deck.

## What's intentionally not built yet

- **Contact discovery**: finding a named decision-maker's email at a qualified company is a manual
  step for now. Wiring up a contact-data API (e.g. Apollo, Hunter) would automate this.
- **Reply handling / follow-ups**: this sends a single first-touch email; it doesn't track replies,
  bounces, or schedule follow-up sequences.
- **CRM sync**: leads live in a local JSON file. Swap `src/store.js` for a real CRM (HubSpot,
  Airtable, etc.) if you need shared visibility across a team.

## Configuration

LogBATT's company facts and ICP (target industries, buyer titles, regions, qualification triggers)
live in `src/profile.js` — edit this file as the targeting strategy evolves.
