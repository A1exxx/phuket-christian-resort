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

function runSlot(name) {
  const s = SLOTS[name];
  if (!s) { console.error("нет слота:", name, "\nдоступные:", Object.keys(SLOTS).join(", ")); process.exit(1); }
  const out = path.resolve(DIR, s.out);
  const args = ["--prompt", s.prompt, "--out", out, "--provider", s.provider];
  if (s.provider === "google") { args.push("--ar", s.ar || "16:9"); if (s.ref) args.push("--ref", path.resolve(DIR, s.ref)); }
  else { if (s.width) args.push("--width", String(s.width)); if (s.height) args.push("--height", String(s.height)); if (s.seed != null) args.push("--seed", String(s.seed)); }
  console.log(`▶ ${name} — ${s.title}`);
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
