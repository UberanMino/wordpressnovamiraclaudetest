import { ask } from "./claude.js";

function stripHtml(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchPageText(url, { maxChars = 6000 } = {}) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
    if (!res.ok) return "";
    const html = await res.text();
    return stripHtml(html).slice(0, maxChars);
  } catch {
    return "";
  }
}

// Fetches the candidate's site (and search snippet as fallback context) and
// asks Claude to produce a structured research summary relevant to LogBATT's
// battery reverse-logistics pitch.
export async function researchCompany(candidate) {
  const siteText = await fetchPageText(`https://${candidate.domain}`);

  const prompt = `You are a B2B sales researcher for LogBATT GmbH, a German company offering certified
reverse logistics (collection, storage, transport, recycling routing) and certified packaging
(SafetyBATTbox) for lithium-ion batteries, primarily serving the automotive/EV industry.

Research target company:
Name: ${candidate.name}
Domain: ${candidate.domain}
Search snippet: ${candidate.snippet || "(none)"}

Website text excerpt (may be empty if unavailable):
"""
${siteText || "(no content retrieved)"}
"""

Based only on the information above, return JSON with this exact shape:
{
  "summary": "2-4 sentence summary of what this company does",
  "likelyIndustry": "best guess at industry/category",
  "evidenceOfBatteryRelevance": "any signal connecting them to EV/lithium-ion batteries, or 'none found'",
  "confidence": "low" | "medium" | "high"
}
Respond with JSON only.`;

  const result = await ask(prompt, { json: true, maxTokens: 600 });
  return { ...result, siteTextAvailable: Boolean(siteText) };
}
