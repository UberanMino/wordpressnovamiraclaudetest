import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as pipeline from "./pipeline.js";
import * as crmStore from "./crmStore.js";
import { enrichCompany } from "./enrich.js";
import { draftCrmEmail } from "./draftCrmEmail.js";
import { chat } from "./chat.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

function handle(fn) {
  return async (req, res) => {
    try {
      const result = await fn(req, res);
      res.json({ ok: true, result });
    } catch (err) {
      res.status(400).json({ ok: false, error: err.message || String(err) });
    }
  };
}

app.get("/api/leads", handle(() => pipeline.listLeads()));

app.post(
  "/api/prospect",
  handle((req) => pipeline.prospect(req.body || {}))
);

// Streams progress as newline-delimited JSON so the UI can show live updates
// while research/qualification/drafting runs (this can take a while per lead).
app.post("/api/run", async (req, res) => {
  res.setHeader("Content-Type", "application/x-ndjson");
  try {
    await pipeline.runPipeline({
      onProgress: (lead) => res.write(JSON.stringify({ ok: true, lead }) + "\n"),
    });
  } catch (err) {
    res.write(JSON.stringify({ ok: false, error: err.message || String(err) }) + "\n");
  }
  res.end();
});

app.post(
  "/api/leads/:domain/email",
  handle((req) => pipeline.updateEmail(req.params.domain, req.body || {}))
);

app.post(
  "/api/leads/:domain/contact",
  handle((req) => pipeline.setContact(req.params.domain, req.body.email))
);

app.post(
  "/api/leads/:domain/send",
  handle((req) => pipeline.sendLead(req.params.domain))
);

app.post(
  "/api/send-all",
  handle(() => pipeline.sendAll())
);

app.get("/api/companies", handle(() => crmStore.getAll()));

app.get(
  "/api/companies/:id",
  handle((req) => {
    const c = crmStore.findById(req.params.id);
    if (!c) throw new Error(`Unknown company: ${req.params.id}`);
    return c;
  })
);

app.post(
  "/api/companies/:id/enrich",
  handle(async (req) => {
    const c = crmStore.findById(req.params.id);
    if (!c) throw new Error(`Unknown company: ${req.params.id}`);
    const enrichment = await enrichCompany(c);
    return crmStore.update(req.params.id, enrichment);
  })
);

app.post(
  "/api/companies/:id/draft-email",
  handle(async (req) => {
    const c = crmStore.findById(req.params.id);
    if (!c) throw new Error(`Unknown company: ${req.params.id}`);
    const emailDraft = await draftCrmEmail(c);
    return crmStore.update(req.params.id, { emailDraft });
  })
);

app.post(
  "/api/companies/:id/email",
  handle((req) => crmStore.update(req.params.id, { emailDraft: req.body }))
);

app.post(
  "/api/companies/:id/chat",
  handle(async (req) => {
    const c = crmStore.findById(req.params.id);
    const reply = await chat(req.body.messages || [], c);
    return { reply };
  })
);

const port = process.env.PORT || 4173;
app.listen(port, () => {
  console.log(`LogBATT lead dashboard running at http://localhost:${port}`);
});
