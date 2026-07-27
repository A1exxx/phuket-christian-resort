/* Финансовая модель христианского арт-курорта на Пхукете.
   Чистый vanilla JS, без зависимостей — артефакт должен быть самодостаточным.
   Все денежные величины внутри модели считаются в THB, наружу отдаются и в THB, и в USD. */
(function () {
  "use strict";

  var FX = 36; // THB за 1 USD
  var HORIZON = 10; // лет для IRR
  var EXIT_MULTIPLE = 8; // терминальная стоимость = EBITDA × 8

  /* Ramp-up: доля от стабилизированной выручки по годам.
     Ни один новый курорт не выходит на полную мощность в первый год. */
  var RAMP = [0.45, 0.7, 0.9, 1, 1, 1, 1, 1, 1, 1];

  var PRESETS = {
    conservative: {
      landRai: 5, landPricePerRai: 12, keys: 25, costPerKey: 5.5, slopePremium: 12,
      cafeSqm: 700, artBudget: 30, contingency: 20,
      adr: 6000, occupancy: 50, visitorsDay: 250, cafeConversion: 22, cafeCheck: 380,
      donationShare: 12, donationAvg: 70, merchShare: 8, merchAvg: 400,
      eventsMonth: 3, eventAvg: 180,
      staffPerKey: 1.4, otaShare: 65, otaCommission: 20, marketingPct: 6
    },
    base: {
      landRai: 6, landPricePerRai: 15, keys: 30, costPerKey: 6.5, slopePremium: 10,
      cafeSqm: 900, artBudget: 45, contingency: 15,
      adr: 8000, occupancy: 62, visitorsDay: 600, cafeConversion: 30, cafeCheck: 450,
      donationShare: 18, donationAvg: 100, merchShare: 12, merchAvg: 550,
      eventsMonth: 6, eventAvg: 250,
      staffPerKey: 1.6, otaShare: 60, otaCommission: 18, marketingPct: 5
    },
    optimistic: {
      landRai: 8, landPricePerRai: 20, keys: 40, costPerKey: 7.5, slopePremium: 8,
      cafeSqm: 1200, artBudget: 70, contingency: 12,
      adr: 11000, occupancy: 72, visitorsDay: 1400, cafeConversion: 38, cafeCheck: 550,
      donationShare: 25, donationAvg: 140, merchShare: 18, merchAvg: 700,
      eventsMonth: 11, eventAvg: 350,
      staffPerKey: 1.8, otaShare: 50, otaCommission: 16, marketingPct: 4
    }
  };

  /* ---------- Ядро расчёта ---------- */

  function compute(p) {
    // --- CAPEX, в млн THB ---
    var land = p.landRai * p.landPricePerRai;
    var hotelBase = p.keys * p.costPerKey;
    var cafeBase = (p.cafeSqm * 70000) / 1e6; // ~70k THB/м² для премиального многоэтажного
    var buildBase = hotelBase + cafeBase + p.artBudget;
    var slope = buildBase * (p.slopePremium / 100);
    var soft = (buildBase + slope) * 0.1; // проект, разрешения, EIA, юристы
    var preOpening = p.keys * 0.35 + 6; // найм, обучение, маркетинг запуска, оборотка
    var subtotal = land + buildBase + slope + soft + preOpening;
    var contingency = subtotal * (p.contingency / 100);
    var capex = subtotal + contingency;

    // --- Выручка на стабилизированный год, в млн THB ---
    var roomNights = p.keys * 365 * (p.occupancy / 100);
    var revRooms = (roomNights * p.adr) / 1e6;

    // Кафе: гости отеля + конвертированные посетители арт-парка
    var hotelGuestCovers = roomNights * 1.6; // завтрак + часть ужинов, на номер приходится >1 гостя
    var visitorCovers = p.visitorsDay * 365 * (p.cafeConversion / 100);
    var revCafe = ((hotelGuestCovers + visitorCovers) * p.cafeCheck) / 1e6;

    var revDonation = (p.visitorsDay * 365 * (p.donationShare / 100) * p.donationAvg) / 1e6;
    var revMerch = (p.visitorsDay * 365 * (p.merchShare / 100) * p.merchAvg) / 1e6;
    // Выездные свадьбы — сильный фит: часовня, статуя и ангелы это готовый премиальный фон,
    // а гости свадьбы дают ночи в отеле. eventAvg задаётся в тыс. THB за мероприятие.
    var revEvents = (p.eventsMonth * 12 * (p.eventAvg || 250) * 1000) / 1e6;

    var revenue = revRooms + revCafe + revDonation + revMerch + revEvents;

    // --- Операционные расходы, в млн THB ---
    // Себестоимость F&B считается только от выручки кафе, не от всей выручки.
    var cogsCafe = revCafe * 0.32;
    var cogsMerch = revMerch * 0.45;

    var staffCount = Math.round(p.keys * p.staffPerKey + p.cafeSqm / 45 + 12);
    var payroll = (staffCount * 25000 * 12) / 1e6; // средняя нагрузка THB 25k/мес с налогами

    var otaFees = revRooms * (p.otaShare / 100) * (p.otaCommission / 100);
    var utilities = revenue * 0.07;
    var marketing = revenue * (p.marketingPct / 100);
    var repairs = revenue * 0.04;
    var admin = revenue * 0.09;
    var artUpkeep = p.artBudget * 0.03; // обслуживание статуй и парка
    var ministry = 0.3; // координатор служения, ~THB 25k/мес

    var gopCosts = cogsCafe + cogsMerch + payroll + otaFees + utilities + marketing + repairs + admin;
    var gop = revenue - gopCosts;

    var mgmtFee = revenue * 0.03;
    var insurance = capex * 0.004;
    var ffeReserve = revenue * 0.03; // резерв на замену мебели и оборудования
    var ebitda = gop - mgmtFee - insurance - ffeReserve - artUpkeep - ministry;

    // --- Метрики возврата ---
    var flows = [-capex];
    for (var y = 0; y < HORIZON; y++) {
      var yearEbitda = ebitda * RAMP[y];
      if (y === HORIZON - 1) yearEbitda += ebitda * EXIT_MULTIPLE; // выход
      flows.push(yearEbitda);
    }

    var irr = solveIRR(flows);
    var totalReturn = flows.slice(1).reduce(function (a, b) { return a + b; }, 0);
    var multiple = capex > 0 ? totalReturn / capex : 0;
    var payback = simplePayback(capex, ebitda);

    // --- Точки безубыточности ---
    var fixedish = payroll + utilities + marketing + repairs + admin + mgmtFee + insurance + artUpkeep + ministry;
    var perRoomNight = p.adr * (1 - (p.otaShare / 100) * (p.otaCommission / 100));
    var nonRoomContribution = (revCafe - cogsCafe) + (revMerch - cogsMerch) + revDonation + revEvents;
    var breakEvenNights = perRoomNight > 0 ? ((fixedish - nonRoomContribution) * 1e6) / perRoomNight : 0;
    var breakEvenOccRaw = p.keys > 0 ? (breakEvenNights / (p.keys * 365)) * 100 : 0;
    // Отрицательное значение осмысленно (непрофильная выручка уже покрывает постоянные расходы),
    // но как процент загрузки читается неверно — отдаём 0 и флаг.
    var coveredWithoutRooms = breakEvenOccRaw <= 0;
    var breakEvenOcc = coveredWithoutRooms ? 0 : breakEvenOccRaw;

    // Стоимость привлечения посетителя: арт-парк как маркетинговый канал.
    // Амортизируем CAPEX арт-парка на 20 лет и добавляем годовое обслуживание.
    var annualVisitors = p.visitorsDay * 365;
    var artAnnualCost = p.artBudget / 20 + artUpkeep;
    var cac = annualVisitors > 0 ? (artAnnualCost * 1e6) / annualVisitors : 0;
    var revPerVisitor = annualVisitors > 0
      ? ((revCafe * (visitorCovers / Math.max(hotelGuestCovers + visitorCovers, 1)) + revDonation + revMerch) * 1e6) / annualVisitors
      : 0;

    return {
      capex: capex,
      capexParts: {
        land: land, hotel: hotelBase, cafe: cafeBase, art: p.artBudget,
        slope: slope, soft: soft, preOpening: preOpening, contingency: contingency
      },
      revenue: revenue,
      revenueParts: {
        rooms: revRooms, cafe: revCafe, donation: revDonation,
        merch: revMerch, events: revEvents
      },
      gop: gop,
      gopMargin: revenue > 0 ? (gop / revenue) * 100 : 0,
      ebitda: ebitda,
      ebitdaMargin: revenue > 0 ? (ebitda / revenue) * 100 : 0,
      irr: irr,
      multiple: multiple,
      payback: payback,
      breakEvenOcc: breakEvenOcc,
      coveredWithoutRooms: coveredWithoutRooms,
      yieldOnCost: capex > 0 ? (ebitda / capex) * 100 : 0,
      staffCount: staffCount,
      cac: cac,
      revPerVisitor: revPerVisitor,
      annualVisitors: annualVisitors,
      flows: flows
    };
  }

  /* IRR методом бисекции по NPV. Возвращает null, если знака перемены нет
     (проект не окупается ни при какой ставке) — это валидный результат, а не ошибка. */
  function solveIRR(flows) {
    function npv(rate) {
      var sum = 0;
      for (var i = 0; i < flows.length; i++) sum += flows[i] / Math.pow(1 + rate, i);
      return sum;
    }
    var lo = -0.95, hi = 5;
    var nLo = npv(lo), nHi = npv(hi);
    if (!isFinite(nLo) || !isFinite(nHi) || nLo * nHi > 0) return null;
    for (var i = 0; i < 200; i++) {
      var mid = (lo + hi) / 2;
      var nMid = npv(mid);
      if (Math.abs(nMid) < 1e-9) return mid * 100;
      if (nLo * nMid < 0) { hi = mid; nHi = nMid; } else { lo = mid; nLo = nMid; }
    }
    return ((lo + hi) / 2) * 100;
  }

  /* Простая окупаемость с учётом ramp-up. null = не окупается за горизонт. */
  function simplePayback(capex, ebitda) {
    if (ebitda <= 0) return null;
    var cum = 0;
    for (var y = 0; y < 25; y++) {
      var yearly = ebitda * (RAMP[y] !== undefined ? RAMP[y] : 1);
      if (cum + yearly >= capex) return y + (capex - cum) / yearly;
      cum += yearly;
    }
    return null;
  }

  window.PhuketModel = {
    compute: compute,
    presets: PRESETS,
    FX: FX,
    horizon: HORIZON,
    exitMultiple: EXIT_MULTIPLE
  };
})();
