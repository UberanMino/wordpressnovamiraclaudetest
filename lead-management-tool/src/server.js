import "dotenv/config";
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as pipeline from "./pipeline.js";

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

const port = process.env.PORT || 4173;
app.listen(port, () => {
  console.log(`LogBATT lead dashboard running at http://localhost:${port}`);
});
