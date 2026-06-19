import { anthropic } from "./claude.js";
import { searchCompanies } from "./prospecting.js";

const SEARCH_TOOL = {
  name: "web_search",
  description: "Search the web for information to fill in a gap (e.g. a missing contact, what a company does, recent news).",
  input_schema: {
    type: "object",
    properties: { query: { type: "string" } },
    required: ["query"],
  },
};

function companyContext(company) {
  if (!company) return "(no company selected)";
  return `Company: ${company.name}
Country: ${company.country || "unknown"}
Industry: ${company.industry || "unknown"}
Description: ${company.description || "unknown"}
Contacts: ${(company.contacts || []).map((c) => `${c.name} (${c.position || "?"}) ${c.email || ""}`).join("; ") || "none"}
Needs recorded: ${(company.deals || []).map((d) => d.need).filter(Boolean).join(" | ") || "none"}
Status/notes: ${(company.deals || []).map((d) => `${d.status}: ${d.notes || ""} ${d.notes2 || ""}`).join(" | ")}`;
}

// One assistant turn that can optionally call a web search tool before
// answering, so the bot can fill in info missing from the CRM record.
export async function chat(messages, company) {
  const system = `You are a sales research assistant for LogBATT GmbH, helping a rep fill in missing
information about a lead from a trade-show contact list. Use the web_search tool when you need
information not already given (e.g. a missing contact's role, company size, recent news, the right
spelling of a name). Be concise and cite what you found vs. what's uncertain.

Current CRM record for this lead:
${companyContext(company)}`;

  const client = anthropic();
  let convo = [...messages];

  for (let i = 0; i < 3; i++) {
    const res = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 800,
      system,
      tools: process.env.SERPER_API_KEY ? [SEARCH_TOOL] : [],
      messages: convo,
    });

    const toolUse = res.content.find((b) => b.type === "tool_use");
    if (!toolUse) {
      return res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    }

    let results = [];
    try {
      results = await searchCompanies(toolUse.input.query, { num: 5 });
    } catch (err) {
      results = [{ name: "search failed", snippet: err.message }];
    }

    convo = [
      ...convo,
      { role: "assistant", content: res.content },
      {
        role: "user",
        content: [
          {
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(results),
          },
        ],
      },
    ];
  }
  return "I wasn't able to find a confident answer after a few searches.";
}
