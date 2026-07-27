import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const DIR = "D:/church-cafe-phuket";
const IMG = path.join(DIR, "images");

/* Сжимаем PNG в JPEG перед встраиванием — иначе артефакт весит десятки мегабайт. */
function jpeg(name, width) {
  const src = path.join(IMG, name + ".png");
  const out = path.join(IMG, name + ".jpg");
  if (!fs.existsSync(src)) throw new Error("нет исходника: " + src);
  const needsRebuild = !fs.existsSync(out) || fs.statSync(src).mtimeMs > fs.statSync(out).mtimeMs;
  if (needsRebuild) {
    execFileSync("ffmpeg", ["-y", "-i", src, "-vf", `scale=${width}:-2`, "-q:v", "4", out], { stdio: "ignore" });
  }
  const b64 = fs.readFileSync(out).toString("base64");
  return { uri: `data:image/jpeg;base64,${b64}`, kb: fs.statSync(out).size / 1024 };
}

const MAP = {
  IMG_HERO:    ["v2-A1-med-aerial", 1500],
  IMG_ARTPARK: ["v2-C2-neo-artpark", 1400],
  IMG_CAFE:    ["v2-A3-med-cafe", 1400],
  IMG_A1: ["v2-A1-med-aerial", 900],
  IMG_A2: ["v2-A2-med-artpark", 900],
  IMG_A3: ["v2-A3-med-cafe", 900],
  IMG_B1: ["v2-B1-aman-aerial", 900],
  IMG_B2: ["v2-B2-aman-artpark", 900],
  IMG_B3: ["v2-B3-aman-cafe", 900],
  IMG_C1: ["v2-C1-neo-aerial", 900],
  IMG_C2: ["v2-C2-neo-artpark", 900],
  IMG_C3: ["v2-C3-neo-cafe", 900]
};

let html = fs.readFileSync(path.join(DIR, "master.template.html"), "utf8");
html = html.split("{{MODEL_JS}}").join(fs.readFileSync(path.join(DIR, "model.js"), "utf8"));

let totalKb = 0;
for (const [token, [name, width]] of Object.entries(MAP)) {
  const { uri, kb } = jpeg(name, width);
  totalKb += kb;
  html = html.split(`{{${token}}}`).join(uri);
}

const leftovers = html.match(/\{\{[A-Z_0-9]+\}\}/g);
if (leftovers) {
  console.error("❌ незаменённые плейсхолдеры:", [...new Set(leftovers)].join(", "));
  process.exit(1);
}

/* index.html — то, что отдаёт GitHub Pages. master-plan.html — та же сборка под
   прежним именем, чтобы не ломать уже опубликованную ссылку артефакта. */
const out = path.join(DIR, "index.html");
fs.writeFileSync(out, html);
fs.writeFileSync(path.join(DIR, "master-plan.html"), html);
console.log(`✅ ${out}`);
console.log(`   картинок ${Object.keys(MAP).length}, суммарно ${(totalKb / 1024).toFixed(1)} MB до base64`);
console.log(`   итоговый файл ${(html.length / 1024 / 1024).toFixed(1)} MB`);
