import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_FILE = path.join(__dirname, "..", "data", "companies.json");
const SEED_FILE = path.join(__dirname, "..", "data", "companies.seed.json");

function load() {
  if (!fs.existsSync(DATA_FILE)) {
    const seed = JSON.parse(fs.readFileSync(SEED_FILE, "utf8"));
    save(seed);
    return seed;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
}

function save(companies) {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  fs.writeFileSync(DATA_FILE, JSON.stringify(companies, null, 2));
}

export function getAll() {
  return load();
}

export function findById(id) {
  return load().find((c) => c.id === id);
}

export function update(id, patch) {
  const companies = load();
  const idx = companies.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error(`Unknown company: ${id}`);
  companies[idx] = { ...companies[idx], ...patch, updatedAt: new Date().toISOString() };
  save(companies);
  return companies[idx];
}
