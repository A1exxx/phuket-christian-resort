/* Автономная проверка движка финмодели до встраивания в документ.
   Загружает model.js в подставной window и прогоняет пресеты + крайние значения. */
import fs from "node:fs";

const src = fs.readFileSync("D:/church-cafe-phuket/model.js", "utf8");
const sandbox = { window: {} };
new Function("window", src)(sandbox.window);
const M = sandbox.window.PhuketModel;

if (!M) { console.error("FAIL: PhuketModel не экспортировался"); process.exit(1); }

const fmt = (n) => (n === null ? "н/д" : typeof n === "number" ? n.toFixed(1) : String(n));
let failures = 0;
function check(label, cond) {
  if (!cond) { console.log(`  ❌ ${label}`); failures++; }
  else console.log(`  ✅ ${label}`);
}

console.log("=== ПРЕСЕТЫ ===");
const results = {};
for (const name of ["conservative", "base", "optimistic"]) {
  const r = M.compute(M.presets[name]);
  results[name] = r;
  console.log(
    `\n${name.toUpperCase()}\n` +
    `  CAPEX      ${fmt(r.capex)} млн THB ($${fmt(r.capex / M.FX)}M)\n` +
    `  Выручка    ${fmt(r.revenue)} млн THB\n` +
    `  GOP        ${fmt(r.gop)} (${fmt(r.gopMargin)}%)\n` +
    `  EBITDA     ${fmt(r.ebitda)} (${fmt(r.ebitdaMargin)}%)\n` +
    `  Доходность на капитал ${fmt(r.yieldOnCost)}%  ← девелопмент целится в 8-12%\n` +
    `  Площадь    ${Math.round(r.totalSqm)} м² (EIA ${r.eiaTriggered ? "СРАБАТЫВАЕТ" : "не срабатывает"})\n` +
    `  CAPEX: доходные здания ${fmt(r.earningCapex)} / миссия ${fmt(r.missionCapex)} млн THB\n` +
    `  Выручка: отель ${fmt(r.revenueParts.rooms)} ретрит ${fmt(r.revenueParts.retreat)} кафе ${fmt(r.revenueParts.cafe)} школа ${fmt(r.revenueParts.school)}\n` +
    `  IRR        ${r.irr === null ? "не окупается" : fmt(r.irr) + "%"}\n` +
    `  Окупаемость ${r.payback === null ? "никогда" : fmt(r.payback) + " лет"}\n` +
    `  Мультипл.  ${fmt(r.multiple)}x\n` +
    `  Безубыт.загрузка ${fmt(r.breakEvenOcc)}%\n` +
    `  Персонал   ${r.staffCount}\n` +
    `  CAC        ${fmt(r.cac)} THB/посетитель, выручка с посетителя ${fmt(r.revPerVisitor)} THB`
  );
}

console.log("\n=== ЛОГИКА ПРЕСЕТОВ ===");
check("оптимистичный EBITDA > базового", results.optimistic.ebitda > results.base.ebitda);
check("базовый EBITDA > консервативного", results.base.ebitda > results.conservative.ebitda);
check("GOP-маржа в разумных пределах 20-60% (база)", results.base.gopMargin > 20 && results.base.gopMargin < 60);
check("EBITDA-маржа ниже GOP-маржи (база)", results.base.ebitdaMargin < results.base.gopMargin);
check("выручка с посетителя выше стоимости привлечения (база)", results.base.revPerVisitor > results.base.cac);

console.log("\n=== КРАЙНИЕ ЗНАЧЕНИЯ (ищем NaN, Infinity, падения) ===");
const edges = {
  "0 номеров": { ...M.presets.base, keys: 0 },
  "0 посетителей": { ...M.presets.base, visitorsDay: 0 },
  "100% загрузка": { ...M.presets.base, occupancy: 100 },
  "минимум всего": { landRai: 3, landPricePerRai: 3.5, keys: 0, costPerKey: 4.5, slopePremium: 0,
    cafeSqm: 400, artBudget: 15, contingency: 10, adr: 3000, occupancy: 40, visitorsDay: 100,
    cafeConversion: 10, cafeCheck: 300, donationShare: 5, donationAvg: 50, merchShare: 5,
    merchAvg: 200, eventsMonth: 0, staffPerKey: 1, otaShare: 0, otaCommission: 15, marketingPct: 2 },
  "максимум всего": { landRai: 15, landPricePerRai: 80, keys: 120, costPerKey: 9, slopePremium: 15,
    cafeSqm: 2000, artBudget: 150, contingency: 25, adr: 20000, occupancy: 85, visitorsDay: 3000,
    cafeConversion: 60, cafeCheck: 900, donationShare: 50, donationAvg: 500, merchShare: 30,
    merchAvg: 1500, eventsMonth: 20, staffPerKey: 2.5, otaShare: 100, otaCommission: 25, marketingPct: 9 }
};

for (const [label, params] of Object.entries(edges)) {
  let r;
  try { r = M.compute(params); }
  catch (e) { console.log(`  ❌ ${label}: ИСКЛЮЧЕНИЕ ${e.message}`); failures++; continue; }
  const nums = [r.capex, r.revenue, r.gop, r.ebitda, r.multiple, r.breakEvenOcc, r.cac, r.revPerVisitor];
  const bad = nums.filter((n) => !isFinite(n));
  if (bad.length) { console.log(`  ❌ ${label}: не-конечные значения (${bad.length})`); failures++; }
  else console.log(`  ✅ ${label}: CAPEX ${fmt(r.capex)}, EBITDA ${fmt(r.ebitda)}, IRR ${r.irr === null ? "н/д" : fmt(r.irr) + "%"}, безубыт ${fmt(r.breakEvenOcc)}%`);
}

console.log("\n=== ПРОВЕРКА IRR ===");
// Убыточный проект не должен давать положительный IRR.
const loss = M.compute({ ...M.presets.base, adr: 3000, occupancy: 40, visitorsDay: 100,
  cafeConversion: 10, landPricePerRai: 80, landRai: 15, costPerKey: 9 });
console.log(`  Заведомо убыточный: EBITDA ${fmt(loss.ebitda)}, IRR ${loss.irr === null ? "не окупается (верно)" : fmt(loss.irr) + "%"}, окупаемость ${loss.payback === null ? "никогда (верно)" : fmt(loss.payback)}`);
check("убыточный сценарий не даёт положительный IRR", loss.ebitda <= 0 ? (loss.irr === null || loss.irr < 0) : true);

// Сверка IRR: NPV по найденной ставке должен быть ~0.
const r = results.base;
if (r.irr !== null) {
  const rate = r.irr / 100;
  const npv = r.flows.reduce((s, f, i) => s + f / Math.pow(1 + rate, i), 0);
  console.log(`  NPV базового по ставке IRR = ${npv.toFixed(6)} (должен быть ~0)`);
  check("IRR действительно обнуляет NPV", Math.abs(npv) < 0.01);
}

console.log(failures === 0 ? "\n✅ ВСЕ ПРОВЕРКИ ПРОЙДЕНЫ" : `\n❌ ПРОВАЛЕНО ПРОВЕРОК: ${failures}`);
process.exit(failures === 0 ? 0 : 1);
