import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "data", "leads.json");

function load() {
  if (!fs.existsSync(DATA_FILE)) return [];
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function save(leads) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(leads, null, 2));
}

export function getAll() {
  return load();
}

export function findByDomain(domain) {
  return load().find((l) => l.domain === domain);
}

export function upsert(lead) {
  const leads = load();
  const idx = leads.findIndex((l) => l.domain === lead.domain);
  const now = new Date().toISOString();
  if (idx === -1) {
    leads.push({ ...lead, createdAt: now, updatedAt: now });
  } else {
    leads[idx] = { ...leads[idx], ...lead, updatedAt: now };
  }
  save(leads);
  return leads.find((l) => l.domain === lead.domain);
}

export function setStage(domain, stage, extra = {}) {
  return upsert({ domain, stage, ...extra });
}
