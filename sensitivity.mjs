/* Анализ чувствительности: какой единственный рычаг сильнее всего двигает доходность.
   Берём базовый сценарий и дёргаем по одному параметру. */
import fs from "node:fs";
const src = fs.readFileSync("D:/church-cafe-phuket/model.js", "utf8");
const w = {};
new Function("window", src)(w);
const M = w.PhuketModel;
const base = M.presets.base;
const b = M.compute(base);

console.log(`БАЗА: доходность ${b.yieldOnCost.toFixed(1)}%, IRR ${b.irr?.toFixed(1)}%, окуп ${b.payback?.toFixed(1)} лет, CAPEX $${(b.capex / 36).toFixed(1)}M\n`);

const levers = [
  ["Номеров 30 → 50", { keys: 50 }],
  ["Номеров 30 → 70", { keys: 70 }],
  ["ADR 8000 → 11000", { adr: 11000 }],
  ["ADR 8000 → 14000", { adr: 14000 }],
  ["Загрузка 62 → 75%", { occupancy: 75 }],
  ["Посетителей 600 → 1500", { visitorsDay: 1500 }],
  ["Посетителей 600 → 2700 (уровень Белого храма)", { visitorsDay: 2700 }],
  ["Конверсия в кафе 30 → 45%", { cafeConversion: 45 }],
  ["Свадеб 6 → 14/мес", { eventsMonth: 14 }],
  ["Свадьба 250k → 400k", { eventAvg: 400 }],
  ["Земля 15M → 6M за рай", { landPricePerRai: 6 }],
  ["Арт-парк 45M → 25M", { artBudget: 25 }],
  ["Мерч 12 → 25% покупают", { merchShare: 25 }],
];

const rows = levers.map(([label, patch]) => {
  const r = M.compute({ ...base, ...patch });
  return {
    label,
    yield: r.yieldOnCost,
    delta: r.yieldOnCost - b.yieldOnCost,
    irr: r.irr,
    capex: r.capex / 36,
    payback: r.payback
  };
});

rows.sort((a, z) => z.delta - a.delta);

console.log("РЫЧАГ".padEnd(46) + "ДОХОДН.".padStart(9) + "Δ".padStart(8) + "IRR".padStart(9) + "CAPEX $M".padStart(10) + "ОКУП".padStart(8));
console.log("-".repeat(90));
for (const r of rows) {
  console.log(
    r.label.padEnd(46) +
    (r.yield.toFixed(1) + "%").padStart(9) +
    ((r.delta >= 0 ? "+" : "") + r.delta.toFixed(1)).padStart(8) +
    (r.irr === null ? "н/д" : r.irr.toFixed(1) + "%").padStart(9) +
    r.capex.toFixed(1).padStart(10) +
    (r.payback === null ? "никогда" : r.payback.toFixed(1)).padStart(8)
  );
}

console.log("\n=== КОМБИНАЦИЯ: что нужно, чтобы база вышла на инвестиционный уровень ===");
const combos = [
  ["50 номеров + ADR 11k", { keys: 50, adr: 11000 }],
  ["50 номеров + ADR 11k + загрузка 70%", { keys: 50, adr: 11000, occupancy: 70 }],
  ["50 ном + ADR 11k + загр 70% + 1500 посет", { keys: 50, adr: 11000, occupancy: 70, visitorsDay: 1500 }],
  ["То же + земля 8M/рай", { keys: 50, adr: 11000, occupancy: 70, visitorsDay: 1500, landPricePerRai: 8 }],
];
for (const [label, patch] of combos) {
  const r = M.compute({ ...base, ...patch });
  console.log(`${label.padEnd(46)} доходность ${r.yieldOnCost.toFixed(1)}%  IRR ${r.irr === null ? "н/д" : r.irr.toFixed(1) + "%"}  окуп ${r.payback === null ? "никогда" : r.payback.toFixed(1) + " лет"}  CAPEX $${(r.capex / 36).toFixed(1)}M`);
}
