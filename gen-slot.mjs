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

/* nano-banana через OpenRouter: та же модель Google, что делает точные правки
   реальных фото с сохранением ракурса, но без биллинга Google — платится
   с баланса OpenRouter (~$0.004/картинка). */
async function runOpenRouter(s, out) {
  const env = fs.readFileSync("C:/Users/user/.claude/skills/free-gen/.env", "utf8");
  const key = env.match(/^FREEGEN_OPENROUTER_KEY=(.*)$/m)[1].trim();
  const content = [{ type: "text", text: s.prompt }];
  if (s.ref) {
    const p = path.resolve(DIR, s.ref);
    const mime = p.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
    content.push({ type: "image_url", image_url: { url: `data:${mime};base64,${fs.readFileSync(p).toString("base64")}` } });
  }
  const r = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: s.model || "google/gemini-2.5-flash-image",
      messages: [{ role: "user", content }],
      modalities: ["image", "text"]
    })
  });
  if (!r.ok) throw new Error(`openrouter HTTP ${r.status}: ${(await r.text()).slice(0, 300)}`);
  const j = await r.json();
  const uri = j.choices?.[0]?.message?.images?.[0]?.image_url?.url;
  if (!uri) throw new Error("openrouter: нет картинки в ответе: " + JSON.stringify(j).slice(0, 300));
  fs.writeFileSync(out, Buffer.from(uri.split(",")[1], "base64"));
  console.log(`  ✅ ${(fs.statSync(out).size / 1024).toFixed(0)} KB`);
}

async function runSlot(name) {
  const s = SLOTS[name];
  if (!s) { console.error("нет слота:", name, "\nдоступные:", Object.keys(SLOTS).join(", ")); process.exit(1); }
  const out = path.resolve(DIR, s.out);
  console.log(`▶ ${name} — ${s.title}`);
  if (s.provider === "flux2") return runFlux2(s, out);
  if (s.provider === "openrouter") return runOpenRouter(s, out);
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
  for (const [name, s] of Object.entries(SLOTS)) if (s.provider === "google" || s.provider === "openrouter") {
    try { await runSlot(name); } catch (e) { failed++; console.error(`✗ ${name}: ${e.message}`); }
  }
  process.exit(failed ? 1 : 0);
} else {
  await runSlot(arg);
}
