import fs from "node:fs";
import path from "node:path";

const DIR = "D:/church-cafe-phuket";
const IMG_DIR = path.join(DIR, "images");
const template = fs.readFileSync(path.join(DIR, "plan.template.html"), "utf8");

function b64(file, mime) {
  const data = fs.readFileSync(file).toString("base64");
  return `data:${mime};base64,${data}`;
}

function replaceAll(str, token, value) {
  return str.split(token).join(value);
}

let fontFaceCss = "";
try {
  const cssResp = await fetch(
    "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600&display=swap",
    { headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" } }
  );
  const css = await cssResp.text();
  const match = css.match(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+\.woff2)\)/);
  if (match) {
    const fontResp = await fetch(match[1]);
    const buf = Buffer.from(await fontResp.arrayBuffer());
    const fontB64 = buf.toString("base64");
    fontFaceCss = `@font-face{font-family:'FrauncesEmbed';src:url(data:font/woff2;base64,${fontB64}) format('woff2');font-weight:600;font-style:normal;font-display:swap;}`;
    console.log("font embedded:", (buf.length / 1024).toFixed(0), "KB");
  } else {
    console.log("font: no woff2 match in CSS response, skipping embed (system serif fallback will be used)");
  }
} catch (e) {
  console.log("font fetch failed, falling back to system serif:", e.message);
}

let html = template;
html = replaceAll(html, "{{FONT_FACE_CSS}}", fontFaceCss);
html = replaceAll(html, "{{IMG_HERO}}", b64(path.join(IMG_DIR, "hero-premium-refined.jpg"), "image/jpeg"));
html = replaceAll(html, "{{IMG_INTERIOR}}", b64(path.join(IMG_DIR, "interior-premium-refined.jpg"), "image/jpeg"));
html = replaceAll(html, "{{IMG_STATUE}}", b64(path.join(IMG_DIR, "statue-closeup.jpg"), "image/jpeg"));
html = replaceAll(html, "{{IMG_NIGHT}}", b64(path.join(IMG_DIR, "night-view.jpg"), "image/jpeg"));
html = replaceAll(html, "{{IMG_C1}}", b64(path.join(IMG_DIR, "concept-1-grand-entrance.jpg"), "image/jpeg"));
html = replaceAll(html, "{{IMG_C2}}", b64(path.join(IMG_DIR, "concept-2-garden-path.jpg"), "image/jpeg"));
html = replaceAll(html, "{{IMG_C3}}", b64(path.join(IMG_DIR, "concept-3-photo-zone-interior.jpg"), "image/jpeg"));
html = replaceAll(html, "{{IMG_C4}}", b64(path.join(IMG_DIR, "concept-4-prayer-courtyard.jpg"), "image/jpeg"));
html = replaceAll(html, "{{IMG_C5}}", b64(path.join(IMG_DIR, "concept-5-night-wonder.jpg"), "image/jpeg"));

const outPath = path.join(DIR, "business-plan.html");
fs.writeFileSync(outPath, html);
console.log("wrote", outPath, (html.length / 1024).toFixed(0), "KB");
