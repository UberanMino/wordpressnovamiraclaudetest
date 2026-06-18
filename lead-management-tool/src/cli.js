#!/usr/bin/env node
import "dotenv/config";
import { searchCompanies, defaultProspectingQueries } from "./prospecting.js";
import { researchCompany } from "./research.js";
import { qualifyLead } from "./qualify.js";
import { draftEmail } from "./draft.js";
import { sendEmail } from "./send.js";
import * as store from "./store.js";

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const flags = {};
  const positional = [];
  for (let i = 0; i < rest.length; i++) {
    const arg = rest[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = rest[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = true;
      }
    } else {
      positional.push(arg);
    }
  }
  return { command, flags, positional };
}

async function cmdProspect({ flags }) {
  const queries = flags.query ? [flags.query] : defaultProspectingQueries();
  console.log(`Running ${queries.length} prospecting query(ies)...`);

  for (const query of queries) {
    console.log(`\n[search] ${query}`);
    const candidates = await searchCompanies(query, { num: Number(flags.num) || 10 });
    for (const c of candidates) {
      if (store.findByDomain(c.domain)) continue;
      store.upsert({ ...c, stage: "prospected", sourceQuery: query });
      console.log(`  + ${c.domain} (${c.name})`);
    }
  }
  console.log("\nDone. Run `npm run run` to research, qualify, and draft outreach.");
}

async function cmdRun({ flags }) {
  const leads = store.getAll().filter((l) => l.stage === "prospected");
  if (!leads.length) {
    console.log("No prospected leads to process. Run `npm run prospect` first.");
    return;
  }

  for (const lead of leads) {
    console.log(`\n[${lead.domain}] researching...`);
    const research = await researchCompany(lead);
    store.upsert({ domain: lead.domain, research });

    const qualification = await qualifyLead(lead, research);
    store.upsert({ domain: lead.domain, qualification });

    if (!qualification.qualified) {
      store.setStage(lead.domain, "disqualified");
      console.log(`  disqualified (score ${qualification.score}): ${qualification.reason}`);
      continue;
    }

    console.log(`  qualified (score ${qualification.score}): ${qualification.painPoint}`);
    const email = await draftEmail(lead, research, qualification);
    store.upsert({ domain: lead.domain, email, stage: "drafted" });
    console.log(`  drafted email: "${email.subject}"`);
  }

  console.log(
    "\nDone. Review drafts with `npm run lead-tool list`, attach a contact address with " +
      "`node src/cli.js set-contact <domain> <email>`, then send with " +
      "`node src/cli.js send <domain>` (or --send-all)."
  );
}

async function cmdList() {
  const leads = store.getAll();
  if (!leads.length) {
    console.log("No leads yet.");
    return;
  }
  for (const l of leads) {
    console.log(
      `${l.domain.padEnd(30)} stage=${l.stage.padEnd(13)} score=${l.qualification?.score ?? "-"}` +
        ` contact=${l.contactEmail ?? "-"}`
    );
  }
}

async function cmdSetContact({ positional }) {
  const [domain, email] = positional;
  if (!domain || !email) throw new Error("Usage: set-contact <domain> <email>");
  store.upsert({ domain, contactEmail: email });
  console.log(`Set contact for ${domain} -> ${email}`);
}

async function cmdSend({ flags, positional }) {
  const targets = flags["send-all"]
    ? store.getAll().filter((l) => l.stage === "drafted" && l.contactEmail)
    : store.getAll().filter((l) => l.domain === positional[0]);

  if (!targets.length) {
    console.log("Nothing to send. Leads need stage=drafted and a contactEmail set.");
    return;
  }

  for (const lead of targets) {
    if (lead.stage !== "drafted") {
      console.log(`  skip ${lead.domain}: stage is "${lead.stage}", expected "drafted"`);
      continue;
    }
    if (!lead.contactEmail) {
      console.log(`  skip ${lead.domain}: no contactEmail set`);
      continue;
    }
    await sendEmail({ to: lead.contactEmail, subject: lead.email.subject, body: lead.email.body });
    store.setStage(lead.domain, "sent");
    console.log(`  sent to ${lead.contactEmail} (${lead.domain})`);
  }
}

async function main() {
  const { command, flags, positional } = parseArgs(process.argv.slice(2));

  const commands = {
    prospect: cmdProspect,
    run: cmdRun,
    list: cmdList,
    "set-contact": cmdSetContact,
    send: cmdSend,
  };

  const handler = commands[command];
  if (!handler) {
    console.log(`Usage: lead-tool <command> [options]

Commands:
  prospect [--query "..."] [--num 10]   Search for candidate companies (defaults to LogBATT ICP queries)
  run                                    Research + qualify + draft email for all prospected leads
  list                                   Show all leads and their stage
  set-contact <domain> <email>           Attach a verified contact email to a lead
  send <domain> | --send-all             Send the drafted email (requires contactEmail set)
`);
    process.exit(command ? 1 : 0);
  }

  await handler({ flags, positional });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
