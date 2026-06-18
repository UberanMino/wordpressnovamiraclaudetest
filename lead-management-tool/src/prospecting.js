const SERPER_URL = "https://google.serper.dev/search";

function extractDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

// Runs a web search query and returns deduplicated candidate companies
// (name, domain, source URL, snippet) for later research/qualification.
export async function searchCompanies(query, { num = 10 } = {}) {
  const apiKey = process.env.SERPER_API_KEY;
  if (!apiKey) throw new Error("SERPER_API_KEY is not set");

  const res = await fetch(SERPER_URL, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ q: query, num }),
  });

  if (!res.ok) {
    throw new Error(`Serper search failed: ${res.status} ${await res.text()}`);
  }

  const data = await res.json();
  const organic = data.organic || [];

  const seen = new Set();
  const candidates = [];
  for (const item of organic) {
    const domain = extractDomain(item.link);
    if (!domain || seen.has(domain)) continue;
    seen.add(domain);
    candidates.push({
      domain,
      name: item.title,
      url: item.link,
      snippet: item.snippet,
    });
  }
  return candidates;
}

// A handful of starter queries derived from the LogBATT ICP. Callers can
// pass their own queries instead; this is just a reasonable default set.
export function defaultProspectingQueries() {
  return [
    "EV battery recycling partner needed Germany Austria Switzerland",
    "Gefahrgutbeauftragter Lithium-Ionen Batterie Logistik Automobilhersteller",
    "automotive gigafactory expansion Germany lithium-ion battery 2026",
    "EV fleet operator battery warranty returns logistics Europe",
    "battery manufacturer end of life reverse logistics Europe",
  ];
}
