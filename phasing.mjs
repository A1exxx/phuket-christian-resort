/* Проверка гипотезы фазирования: если поток решает всё, а номера доходность не двигают —
   имеет ли смысл строить арт-парк и кафе первыми, доказать трафик, и только потом отель? */
import fs from "node:fs";
const src = fs.readFileSync("D:/church-cafe-phuket/model.js", "utf8");
const w = {};
new Function("window", src)(w);
const M = w.PhuketModel;
const base = M.presets.base;

function show(label, patch) {
  const r = M.compute({ ...base, ...patch });
  console.log(
    label.padEnd(52) +
    `CAPEX $${(r.capex / 36).toFixed(1)}M`.padStart(13) +
    `дох ${r.yieldOnCost.toFixed(1)}%`.padStart(11) +
    `IRR ${r.irr === null ? "н/д" : r.irr.toFixed(1) + "%"}`.padStart(11) +
    `окуп ${r.payback === null ? "никогда" : r.payback.toFixed(1)}`.padStart(14)
  );
  return r;
}

console.log("=== ФАЗА 1: только арт-парк + кафе, без отеля ===");
console.log("(проверяем при разном потоке — сколько нужно людей, чтобы фаза 1 сама себя окупала)\n");
console.log("СЦЕНАРИЙ".padEnd(52) + "CAPEX".padStart(13) + "ДОХОДН".padStart(11) + "IRR".padStart(11) + "ОКУП".padStart(14));
console.log("-".repeat(101));

const p1 = { keys: 0, landRai: 4, landPricePerRai: 12, artBudget: 45, cafeSqm: 900 };
for (const v of [400, 600, 1000, 1500, 2000, 2700]) {
  show(`Фаза 1, ${v} посетителей/день`, { ...p1, visitorsDay: v });
}

console.log("\n=== Фаза 1 экономнее: арт-парк 25M вместо 45M ===");
for (const v of [600, 1000, 1500, 2700]) {
  show(`Фаза 1 эконом, ${v} посетителей/день`, { ...p1, artBudget: 25, visitorsDay: v });
}

console.log("\n=== ФАЗА 2: добавляем отель к доказанному потоку ===");
console.log("(земля уже куплена в фазе 1, арт-парк построен — считаем полный комплекс)\n");
for (const [label, patch] of [
  ["Полный комплекс, поток 1000", { visitorsDay: 1000 }],
  ["Полный комплекс, поток 1500", { visitorsDay: 1500 }],
  ["Полный комплекс, поток 2000", { visitorsDay: 2000 }],
  ["Полный комплекс, поток 2700", { visitorsDay: 2700 }],
  ["Полный, поток 2000 + ADR 11k + загр 70%", { visitorsDay: 2000, adr: 11000, occupancy: 70 }],
]) show(label, patch);

console.log("\n=== ГЛАВНЫЙ ВОПРОС: при каком потоке базовый комплекс выходит на 10% доходности? ===");
let found = null;
for (let v = 200; v <= 4000; v += 25) {
  const r = M.compute({ ...base, visitorsDay: v });
  if (r.yieldOnCost >= 10 && !found) { found = { v, r }; break; }
}
if (found) {
  console.log(`  Нужно ${found.v} посетителей в день (${(found.v * 365 / 1000).toFixed(0)} тыс. в год).`);
  console.log(`  Ориентиры: Big Buddha Пхукет ~1000/день, Белый храм Чианг Рай ~2700/день.`);
  console.log(`  → цель ${found.v < 1000 ? "ниже Big Buddha, реалистично" : found.v < 2700 ? "между Big Buddha и Белым храмом — амбициозно, но не фантастика" : "выше Белого храма — крайне амбициозно"}`);
} else {
  console.log("  Не достигается даже при 4000 посетителей/день.");
}
