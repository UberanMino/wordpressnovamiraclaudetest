import { ask } from "./claude.js";
import { company as logbatt } from "./profile.js";

// Drafts a cold email for an existing CRM lead, grounded in the specific
// need/notes captured at the trade show rather than a generic ICP pitch.
export async function draftCrmEmail(company) {
  const primaryContact = company.contacts?.[0];
  const needs = (company.deals || []).map((d) => d.need).filter(Boolean).join("\n- ");
  const notes = (company.deals || [])
    .flatMap((d) => [d.notes, d.notes2])
    .filter(Boolean)
    .join("\n- ");

  const prompt = `You are writing a cold/follow-up sales email on behalf of LogBATT GmbH (${logbatt.positioning}).

LogBATT services: ${logbatt.services.join("; ")}.
Reference customers: ${logbatt.referenceCustomers.join(", ")}.

Lead company: ${company.name} (${company.industry || "industry unknown"}${company.country ? ", " + company.country : ""})
${company.description ? `What they do: ${company.description}` : ""}
Contact: ${primaryContact ? `${primaryContact.name}, ${primaryContact.position || "role unknown"}` : "no named contact yet"}

Specific needs/interests captured from the trade-show conversation:
- ${needs || "none recorded"}

Internal notes/status history:
- ${notes || "none"}

Write a short (under 180 words), specific email that:
1. References the actual conversation/need above (not generic boilerplate)
2. Links 1-2 concrete LogBATT services directly to that need
3. Has a clear, low-friction call to action (a short call or next step)

Return JSON only: {"subject": "...", "body": "..."}`;

  return ask(prompt, { json: true, maxTokens: 700 });
}
