import { ask } from "./claude.js";
import { company } from "./profile.js";

// Drafts a short, personalized cold email referencing the lead's specific
// pain point and LogBATT's certifications/reference customers.
export async function draftEmail(candidate, research, qualification) {
  const prompt = `Write a cold outreach email from a LogBATT GmbH sales rep to a prospect at "${candidate.name}".

LogBATT facts you may draw on (use only what's relevant, don't list everything):
- Certified end-to-end reverse logistics for lithium-ion batteries: collection, storage, ADR-certified
  packaging, transport, routing to recycling, across Europe.
- Manufactures the SafetyBATTbox containers in-house (own fire testing, BAM type approval), covering
  intact, defective, and critically defective batteries (incl. ADR 2025 P911/LP906).
- Certifications: ${company.certifications.join(", ")}.
- Reference customers: ${company.referenceCustomers.join(", ")}.
- Part of Lagermax Group's Green Logistics division.

Prospect context:
Company: ${candidate.name} (${candidate.domain})
What they do: ${research.summary}
Likely pain point: ${qualification.painPoint}

Requirements:
- Subject line + body.
- Body under 120 words, plain text, no markdown.
- Reference their specific situation/pain point in the first 1-2 sentences, don't open with "I hope this email finds you well".
- One light, specific proof point (certification or reference customer) only if it's relevant to the pain point.
- End with a low-friction call to action (e.g. a short call), not a hard sell.
- Sign off as "The LogBATT Team".

Return JSON only, exact shape:
{ "subject": "...", "body": "..." }`;

  return ask(prompt, { json: true, maxTokens: 700 });
}
