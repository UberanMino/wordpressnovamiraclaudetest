import { ask } from "./claude.js";
import { searchCompanies } from "./prospecting.js";

// Looks up what a company does using a web search (when SERPER_API_KEY is
// available) plus Claude's own knowledge, and fills in industry/description.
export async function enrichCompany(company) {
  let snippets = "";
  if (process.env.SERPER_API_KEY) {
    try {
      const results = await searchCompanies(`${company.name} ${company.country || ""}`, { num: 5 });
      snippets = results.map((r) => `- ${r.name}: ${r.snippet}`).join("\n");
    } catch {
      snippets = "";
    }
  }

  const prompt = `You are a B2B sales researcher for LogBATT GmbH, a German certified reverse-logistics
provider for lithium-ion batteries (collection, storage, transport, recycling routing, and
SafetyBATTbox certified containers), serving mostly automotive/EV companies.

Research target company:
Name: ${company.name}
Country: ${company.country || "unknown"}
Known notes from a trade-show lead sheet: ${JSON.stringify(company.deals?.map((d) => d.need).filter(Boolean))}

Web search snippets (may be empty):
"""
${snippets || "(no search results available)"}
"""

Return JSON only, with this exact shape:
{
  "industry": "short industry/category label",
  "description": "2-4 sentence description of what this company does, written for a sales rep who needs context fast"
}`;

  const result = await ask(prompt, { json: true, maxTokens: 500 });
  return result;
}
