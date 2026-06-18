import { ask } from "./claude.js";
import { icp } from "./profile.js";

// Scores a researched lead against LogBATT's ICP. Returns a qualification
// verdict plus reasoning so a human can audit "agent finds leads" decisions.
export async function qualifyLead(candidate, research) {
  const prompt = `You are qualifying a sales lead for LogBATT GmbH against this Ideal Customer Profile (ICP):

Target industries: ${icp.industries.join(", ")}
Target buyer titles: ${icp.buyerTitles.join(", ")}
Target regions: ${icp.regions.join(", ")}
Positive triggers: ${icp.triggers.join("; ")}
Disqualifiers: ${icp.disqualifiers.join("; ")}

Lead research:
Name: ${candidate.name}
Domain: ${candidate.domain}
Summary: ${research.summary}
Likely industry: ${research.likelyIndustry}
Evidence of battery relevance: ${research.evidenceOfBatteryRelevance}
Research confidence: ${research.confidence}

Return JSON only, exact shape:
{
  "qualified": true | false,
  "score": 0-100,
  "reason": "1-2 sentence justification",
  "painPoint": "the most likely pain point this company has that LogBATT's reverse logistics / SafetyBATTbox offering solves, or empty string if not qualified"
}`;

  return ask(prompt, { json: true, maxTokens: 500 });
}
