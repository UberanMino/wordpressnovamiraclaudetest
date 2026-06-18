import { searchCompanies, defaultProspectingQueries } from "./prospecting.js";
import { researchCompany } from "./research.js";
import { qualifyLead } from "./qualify.js";
import { draftEmail } from "./draft.js";
import { sendEmail } from "./send.js";
import * as store from "./store.js";

// Each function here is a single pipeline step, reused by both the CLI and
// the web dashboard (server.js) so the two stay in sync automatically.

export async function prospect({ query, num = 10 } = {}) {
  const queries = query ? [query] : defaultProspectingQueries();
  const added = [];
  for (const q of queries) {
    const candidates = await searchCompanies(q, { num });
    for (const c of candidates) {
      if (store.findByDomain(c.domain)) continue;
      const lead = store.upsert({ ...c, stage: "prospected", sourceQuery: q });
      added.push(lead);
    }
  }
  return added;
}

export async function processLead(domain) {
  const lead = store.findByDomain(domain);
  if (!lead) throw new Error(`Unknown lead: ${domain}`);

  const research = await researchCompany(lead);
  store.upsert({ domain, research });

  const qualification = await qualifyLead(lead, research);
  store.upsert({ domain, qualification });

  if (!qualification.qualified) {
    return store.setStage(domain, "disqualified");
  }

  const email = await draftEmail(lead, research, qualification);
  return store.upsert({ domain, email, stage: "drafted" });
}

export async function runPipeline({ onProgress } = {}) {
  const leads = store.getAll().filter((l) => l.stage === "prospected");
  const results = [];
  for (const lead of leads) {
    const updated = await processLead(lead.domain);
    results.push(updated);
    onProgress?.(updated);
  }
  return results;
}

export function listLeads() {
  return store.getAll();
}

export function updateEmail(domain, { subject, body }) {
  const lead = store.findByDomain(domain);
  if (!lead) throw new Error(`Unknown lead: ${domain}`);
  return store.upsert({ domain, email: { subject, body } });
}

export function setContact(domain, email) {
  if (!store.findByDomain(domain)) throw new Error(`Unknown lead: ${domain}`);
  return store.upsert({ domain, contactEmail: email });
}

export async function sendLead(domain) {
  const lead = store.findByDomain(domain);
  if (!lead) throw new Error(`Unknown lead: ${domain}`);
  if (lead.stage !== "drafted") throw new Error(`Lead is in stage "${lead.stage}", expected "drafted"`);
  if (!lead.contactEmail) throw new Error("No contact email set for this lead");

  await sendEmail({ to: lead.contactEmail, subject: lead.email.subject, body: lead.email.body });
  return store.setStage(domain, "sent");
}

export async function sendAll() {
  const targets = store.getAll().filter((l) => l.stage === "drafted" && l.contactEmail);
  const results = [];
  for (const lead of targets) {
    results.push(await sendLead(lead.domain));
  }
  return results;
}
