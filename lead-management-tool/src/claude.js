import Anthropic from "@anthropic-ai/sdk";

let client;

export function anthropic() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error("ANTHROPIC_API_KEY is not set");
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}

// Sends a single-turn prompt and returns the text response. Optionally
// instructs the model to reply with JSON only, which is parsed and returned.
export async function ask(prompt, { json = false, maxTokens = 1024 } = {}) {
  const res = await anthropic().messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: maxTokens,
    messages: [{ role: "user", content: prompt }],
  });
  const text = res.content.map((b) => (b.type === "text" ? b.text : "")).join("");
  if (!json) return text;

  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error(`Expected JSON in model response, got: ${text}`);
  return JSON.parse(match[0]);
}
