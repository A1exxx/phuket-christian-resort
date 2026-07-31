/* Пер-элементная генерация визуалов проекта.
     node gen-slot.mjs <имя-слота>     — перегенерировать один элемент
     node gen-slot.mjs --all-google    — все google-слоты (когда есть биллинг)
     node gen-slot.mjs --list          — список слотов и статусы файлов
   После генерации: node build-master.mjs — пересборка страницы. */

import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { SLOTS } from "./slots.config.mjs";

const DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1"));
const GEN = "C:/Users/user/.claude/skills/free-gen/scripts/gen-image.mjs";

/* FLUX.2-dev на Cloudflare Workers AI: бесплатно, принимает референс (multipart),
   но держит его как «вдохновение», а не как холст — геометрию фото не сохраняет.
   Для точных правок реальных фото нужен google (nano-banana) с биллингом.
   ⚠ Слова "Jesus Christ" режутся модерацией — в промптах писать
   "bearded robed male figure with arms outstretched". */
async function runFlux2(s, out) {
  const env = fs.readFileSync("C:/Users/user/.claude/skills/free-gen/.env", "utf8");
  const acct = env.match(/^FREEGEN_CF_ACCOUNT=(.*)$/m)[1].trim();
  const token = env.match(/^FREEGEN_CF_TOKEN=(.*)$/m)[1].trim();
  const fd = new FormData();
  fd.append("prompt", s.prompt);
  if (s.ref) fd.append("input_image", new Blob([fs.readFileSync(path.resolve(DIR, s.ref))], { type: "image/jpeg" }), "ref.jpg");
  if (s.width) fd.append("width", String(s.width));
  if (s.height) fd.append("height", String(s.height));
  const r = await fetch(`https://api.cloudflare.com/client/v4/accounts/${acct}/ai/run/@cf/black-forest-labs/flux-2-dev`,
    { method: "POST", headers: { Authorization: "Bearer " + token }, body: fd });
  if (!r.ok) throw new Error(`flux2 HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const b64 = j.result && (j.result.image || (j.result.images && j.result.images[0]));
  if (!b64) throw new Error("flux2: нет картинки в ответе");
  fs.writeFileSync(out, Buffer.from(b64, "base64"));
  console.log(`  ✅ ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

async function runSlot(name) {
  const s = SLOTS[name];
  if (!s) { console.error("нет слота:", name, "\nдоступные:", Object.keys(SLOTS).join(", ")); process.exit(1); }
  const out = path.resolve(DIR, s.out);
  console.log(`▶ ${name} — ${s.title}`);
  if (s.provider === "flux2") return runFlux2(s, out);
  const args = ["--prompt", s.prompt, "--out", out, "--provider", s.provider];
  if (s.provider === "google") { args.push("--ar", s.ar || "16:9"); if (s.ref) args.push("--ref", path.resolve(DIR, s.ref)); }
  else { if (s.width) args.push("--width", String(s.width)); if (s.height) args.push("--height", String(s.height)); if (s.seed != null) args.push("--seed", String(s.seed)); }
  execFileSync("node", [GEN, ...args], { stdio: "inherit" });
}

const arg = process.argv[2];
if (!arg || arg === "--list") {
  for (const [name, s] of Object.entries(SLOTS)) {
    const out = path.resolve(DIR, s.out);
    const st = fs.existsSync(out) ? "✅ " + new Date(fs.statSync(out).mtime).toISOString().slice(0, 16) : "⬜ нет файла";
    console.log(`${name.padEnd(18)} [${s.provider.padEnd(10)}] ${st}  ${s.title}`);
  }
} else if (arg === "--all-google") {
  let failed = 0;
  for (const [name, s] of Object.entries(SLOTS)) if (s.provider === "google") {
    try { runSlot(name); } catch { failed++; console.error(`✗ ${name} не сгенерировался`); }
  }
  process.exit(failed ? 1 : 0);
} else {
  runSlot(arg);
}
