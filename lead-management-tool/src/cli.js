#!/usr/bin/env node
import "dotenv/config";
import * as pipeline from "./pipeline.js";

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
  console.log("Prospecting...");
  const added = await pipeline.prospect({ query: flags.query, num: Number(flags.num) || 10 });
  for (const lead of added) console.log(`  + ${lead.domain} (${lead.name})`);
  console.log(`\nAdded ${added.length} new lead(s). Run \`npm run run\` next.`);
}

async function cmdRun() {
  const results = await pipeline.runPipeline({
    onProgress: (lead) => {
      if (lead.stage === "disqualified") {
        console.log(`[${lead.domain}] disqualified (score ${lead.qualification.score}): ${lead.qualification.reason}`);
      } else {
        console.log(`[${lead.domain}] drafted: "${lead.email.subject}"`);
      }
    },
  });
  if (!results.length) {
    console.log("No prospected leads to process. Run `npm run prospect` first.");
  }
}

async function cmdList() {
  const leads = pipeline.listLeads();
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
  pipeline.setContact(domain, email);
  console.log(`Set contact for ${domain} -> ${email}`);
}

async function cmdSend({ flags, positional }) {
  if (flags["send-all"]) {
    const sent = await pipeline.sendAll();
    console.log(`Sent ${sent.length} email(s).`);
    return;
  }
  const [domain] = positional;
  if (!domain) throw new Error("Usage: send <domain> | --send-all");
  await pipeline.sendLead(domain);
  console.log(`Sent to ${domain}.`);
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

Or run \`npm run dashboard\` for the web UI.
`);
    process.exit(command ? 1 : 0);
  }

  await handler({ flags, positional });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
