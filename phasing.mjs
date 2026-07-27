/* Порядок стройки под утверждённый состав из шести зданий.
   Вопрос: что строить первым, чтобы проект не утонул в капитале до первой выручки. */
import fs from "node:fs";
const src = fs.readFileSync("D:/church-cafe-phuket/model.js", "utf8");
const w = {};
new Function("window", src)(w);
const M = w.PhuketModel;
const base = M.presets.base;

const OFF = { keys: 0, retreatRooms: 0, schoolSqm: 0, students: 0, tuition: 0 };

function run(label, patch, note) {
  const r = M.compute({ ...base, ...patch });
  console.log(
    label.padEnd(46) +
    `$${(r.capex / 36).toFixed(1)}M`.padStart(9) +
    `${r.yieldOnCost.toFixed(1)}%`.padStart(9) +
    `${r.irr === null ? "н/д" : r.irr.toFixed(1) + "%"}`.padStart(9) +
    `${r.payback === null ? "никогда" : r.payback.toFixed(1)}`.padStart(10) +
    `${Math.round(r.totalSqm)}`.padStart(8) +
    (note ? "  " + note : "")
  );
  return r;
}

console.log("СОСТАВ".padEnd(46) + "CAPEX".padStart(9) + "ДОХОДН".padStart(9) + "IRR".padStart(9) + "ОКУП".padStart(10) + "М²".padStart(8));
console.log("-".repeat(97));

run("Всё сразу (6 зданий)", {});
run("Без школы", { schoolSqm: 0, students: 0, tuition: 0 });
run("Без отеля", { keys: 0 });
run("Без отеля и школы", { keys: 0, schoolSqm: 0, students: 0, tuition: 0 });
run("Только магнит: арт+кафе+церковь", { ...OFF, officeSqm: 0 });
run("Магнит + офис церкви", OFF);
run("Магнит + ретрит", { ...OFF, retreatRooms: 24 });
run("Магнит + ретрит + школа", { keys: 0 });

console.log("\n=== ТО ЖЕ ПРИ ПОТОКЕ 1500/ДЕНЬ (реалистичная цель) ===");
console.log("СОСТАВ".padEnd(46) + "CAPEX".padStart(9) + "ДОХОДН".padStart(9) + "IRR".padStart(9) + "ОКУП".padStart(10) + "М²".padStart(8));
console.log("-".repeat(97));
const V = { visitorsDay: 1500 };
run("Всё сразу (6 зданий)", V);
run("Без школы", { ...V, schoolSqm: 0, students: 0, tuition: 0 });
run("Магнит + ретрит", { ...V, ...OFF, retreatRooms: 24 });
run("Магнит + ретрит + школа", { ...V, keys: 0 });
run("Только магнит: арт+кафе+церковь", { ...V, ...OFF, officeSqm: 0 });

console.log("\n=== ВКЛАД КАЖДОГО ЗДАНИЯ (базовый сценарий, поток 600) ===");
const full = M.compute(base);
const blocks = [
  ["Отель", { keys: 0 }],
  ["Ретрит-центр", { retreatRooms: 0 }],
  ["Школа", { schoolSqm: 0, students: 0, tuition: 0 }],
  ["Церковь", { churchSqm: 0 }],
  ["Офис церкви", { officeSqm: 0 }],
  ["Кафе", { cafeSqm: 0 }],
];
console.log("ЗДАНИЕ".padEnd(20) + "БЕЗ НЕГО ДОХОДН".padStart(17) + "ЭФФЕКТ".padStart(10) + "ВЕРДИКТ".padStart(24));
console.log("-".repeat(71));
const rows = blocks.map(([name, patch]) => {
  const r = M.compute({ ...base, ...patch });
  return { name, y: r.yieldOnCost, delta: r.yieldOnCost - full.yieldOnCost };
});
rows.sort((a, b) => b.delta - a.delta);
for (const r of rows) {
  const verdict = r.delta > 0.4 ? "тянет доходность вниз" : r.delta < -0.4 ? "создаёт доходность" : "почти нейтрально";
  console.log(
    r.name.padEnd(20) +
    `${r.y.toFixed(1)}%`.padStart(17) +
    `${r.delta >= 0 ? "+" : ""}${r.delta.toFixed(1)}`.padStart(10) +
    verdict.padStart(24)
  );
}
console.log(`\nБаза целиком: ${full.yieldOnCost.toFixed(1)}%`);
console.log("«Тянет вниз» = без этого здания доходность выше. Это не значит «не строить» —");
console.log("значит, здание финансируется миссией, а не ожиданием возврата.");
