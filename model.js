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

  /* Удельная стоимость строительства, THB/м². Кафе и отель дороже — премиальная
     отделка и инженерия; церковь, школа и ретрит проще. */
  var SQM_COST = { cafe: 70000, church: 45000, office: 40000, school: 40000 };

  var PRESETS = {
    conservative: {
      landRai: 10, landPricePerRai: 12, keys: 25, costPerKey: 5.5, slopePremium: 12,
      cafeSqm: 700, artBudget: 30, contingency: 20,
      churchSqm: 600, officeSqm: 200, schoolSqm: 900,
      retreatRooms: 18, costPerRetreatRoom: 3, retreatBedsPerRoom: 2,
      retreatOccupancy: 45, retreatRate: 1400,
      students: 60, tuition: 90,
      adr: 6000, occupancy: 50, visitorsDay: 250, cafeConversion: 22, cafeCheck: 380,
      donationShare: 12, donationAvg: 70, merchShare: 8, merchAvg: 400,
      eventsMonth: 3, eventAvg: 180,
      staffPerKey: 1.4, otaShare: 65, otaCommission: 20, marketingPct: 6
    },
    base: {
      landRai: 13, landPricePerRai: 15, keys: 30, costPerKey: 6.5, slopePremium: 10,
      cafeSqm: 900, artBudget: 45, contingency: 15,
      churchSqm: 700, officeSqm: 250, schoolSqm: 1200,
      retreatRooms: 24, costPerRetreatRoom: 3.5, retreatBedsPerRoom: 2.2,
      retreatOccupancy: 58, retreatRate: 1800,
      students: 120, tuition: 120,
      adr: 8000, occupancy: 62, visitorsDay: 600, cafeConversion: 30, cafeCheck: 450,
      donationShare: 18, donationAvg: 100, merchShare: 12, merchAvg: 550,
      eventsMonth: 6, eventAvg: 250,
      staffPerKey: 1.6, otaShare: 60, otaCommission: 18, marketingPct: 5
    },
    optimistic: {
      landRai: 15, landPricePerRai: 20, keys: 40, costPerKey: 7.5, slopePremium: 8,
      cafeSqm: 1200, artBudget: 70, contingency: 12,
      churchSqm: 900, officeSqm: 300, schoolSqm: 1600,
      retreatRooms: 34, costPerRetreatRoom: 4, retreatBedsPerRoom: 2.4,
      retreatOccupancy: 70, retreatRate: 2400,
      students: 220, tuition: 180,
      adr: 11000, occupancy: 72, visitorsDay: 1400, cafeConversion: 38, cafeCheck: 550,
      donationShare: 25, donationAvg: 140, merchShare: 18, merchAvg: 700,
      eventsMonth: 11, eventAvg: 350,
      staffPerKey: 1.8, otaShare: 50, otaCommission: 16, marketingPct: 4
    }
  };

  /* ---------- Ядро расчёта ---------- */

  function compute(p) {
    // --- CAPEX, в млн THB ---
    // Каждое здание считается отдельно: у них разная удельная стоимость и разная роль
    // в возврате. Церковь, офис и школа денег инвестору не возвращают — но строятся.
    var num = function (v, d) { return typeof v === "number" && isFinite(v) ? v : d; };
    var churchSqm = num(p.churchSqm, 0), officeSqm = num(p.officeSqm, 0), schoolSqm = num(p.schoolSqm, 0);
    var retreatRooms = num(p.retreatRooms, 0), costPerRetreatRoom = num(p.costPerRetreatRoom, 3.5);

    var land = p.landRai * p.landPricePerRai;
    var hotelBase = p.keys * p.costPerKey;
    var retreatBase = retreatRooms * costPerRetreatRoom;
    var cafeBase = (p.cafeSqm * SQM_COST.cafe) / 1e6;
    var churchBase = (churchSqm * SQM_COST.church) / 1e6;
    var officeBase = (officeSqm * SQM_COST.office) / 1e6;
    var schoolBase = (schoolSqm * SQM_COST.school) / 1e6;

    var buildBase = hotelBase + retreatBase + cafeBase + churchBase + officeBase + schoolBase + p.artBudget;
    var slope = buildBase * (p.slopePremium / 100);
    var soft = (buildBase + slope) * 0.1; // проект, разрешения, EIA, юристы
    var preOpening = p.keys * 0.35 + retreatRooms * 0.15 + 6; // найм, обучение, маркетинг, оборотка
    var subtotal = land + buildBase + slope + soft + preOpening;
    var contingency = subtotal * (p.contingency / 100);
    var capex = subtotal + contingency;

    // Полезная площадь — от неё зависит порог EIA (4 000 м²).
    var totalSqm = p.cafeSqm + churchSqm + officeSqm + schoolSqm +
                   p.keys * 95 + retreatRooms * 55; // отель ~95 м²/номер всего, ретрит ~55

    // --- Выручка на стабилизированный год, в млн THB ---
    var roomNights = p.keys * 365 * (p.occupancy / 100);
    var revRooms = (roomNights * p.adr) / 1e6;

    // Ретрит-центр: считается по койко-местам, а не по номерам — группы селятся плотно.
    // Тариф с человека за ночь включает питание, поэтому в кафе они почти не идут.
    var retreatBeds = retreatRooms * num(p.retreatBedsPerRoom, 2.2);
    var bedNights = retreatBeds * 365 * (num(p.retreatOccupancy, 0) / 100);
    var revRetreat = (bedNights * num(p.retreatRate, 0)) / 1e6;

    // Школа: студенты × годовая плата (в тыс. THB). Библейские курсы, общеобразовательная
    // и коммерческая программа делят один корпус — поэтому одна строка, а не три.
    var revSchool = (num(p.students, 0) * num(p.tuition, 0) * 1000) / 1e6;

    // Кафе: гости отеля + часть гостей ретрита + конвертированные посетители арт-парка
    var hotelGuestCovers = roomNights * 1.6;
    var retreatCovers = bedNights * 0.3; // питание в основном в пакете ретрита
    var visitorCovers = p.visitorsDay * 365 * (p.cafeConversion / 100);
    var revCafe = ((hotelGuestCovers + retreatCovers + visitorCovers) * p.cafeCheck) / 1e6;

    var revDonation = (p.visitorsDay * 365 * (p.donationShare / 100) * p.donationAvg) / 1e6;
    var revMerch = (p.visitorsDay * 365 * (p.merchShare / 100) * p.merchAvg) / 1e6;
    // Выездные свадьбы — сильный фит: часовня, статуя и ангелы это готовый премиальный фон,
    // а гости свадьбы дают ночи в отеле. eventAvg задаётся в тыс. THB за мероприятие.
    var revEvents = (p.eventsMonth * 12 * (p.eventAvg || 250) * 1000) / 1e6;

    var revenue = revRooms + revRetreat + revSchool + revCafe + revDonation + revMerch + revEvents;

    // --- Операционные расходы, в млн THB ---
    // Себестоимость F&B считается только от выручки кафе, не от всей выручки.
    var cogsCafe = revCafe * 0.32;
    var cogsMerch = revMerch * 0.45;
    var cogsRetreat = revRetreat * 0.28; // питание и расходники в пакете ретрита

    // Преподаватели считаются отдельно: у школы своя штатка, ~1 на 12 учеников.
    var teachers = Math.ceil(num(p.students, 0) / 12);
    var staffCount = Math.round(p.keys * p.staffPerKey + retreatRooms * 0.5 + p.cafeSqm / 45 + 12) + teachers;
    var payroll = (staffCount * 25000 * 12) / 1e6; // средняя нагрузка THB 25k/мес с налогами

    var otaFees = revRooms * (p.otaShare / 100) * (p.otaCommission / 100);
    var utilities = revenue * 0.07;
    var marketing = revenue * (p.marketingPct / 100);
    var repairs = revenue * 0.04;
    var admin = revenue * 0.09;
    var artUpkeep = p.artBudget * 0.03; // обслуживание статуй и парка
    var ministry = 0.3; // координатор служения, ~THB 25k/мес
    // Церковь и офис выручки не дают, но их надо содержать: коммуналка, уборка, ремонт.
    var missionUpkeep = (churchBase + officeBase) * 0.04;

    var gopCosts = cogsCafe + cogsMerch + cogsRetreat + payroll + otaFees + utilities + marketing + repairs + admin;
    var gop = revenue - gopCosts;

    var mgmtFee = revenue * 0.03;
    var insurance = capex * 0.004;
    var ffeReserve = revenue * 0.03; // резерв на замену мебели и оборудования
    var ebitda = gop - mgmtFee - insurance - ffeReserve - artUpkeep - ministry - missionUpkeep;

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
    var fixedish = payroll + utilities + marketing + repairs + admin + mgmtFee + insurance + artUpkeep + ministry + missionUpkeep;
    var perRoomNight = p.adr * (1 - (p.otaShare / 100) * (p.otaCommission / 100));
    var nonRoomContribution = (revCafe - cogsCafe) + (revMerch - cogsMerch) +
                              (revRetreat - cogsRetreat) + revSchool + revDonation + revEvents;
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

    /* Какие здания возвращают деньги, а какие нет. Проект единый, финансирование
       не разделяется — но инвестор спросит об этом первым, и ответ должен быть готов. */
    var earningCapex = hotelBase + retreatBase + cafeBase;
    var missionCapex = churchBase + officeBase + schoolBase;

    return {
      capex: capex,
      capexParts: {
        land: land, hotel: hotelBase, retreat: retreatBase, cafe: cafeBase,
        church: churchBase, office: officeBase, school: schoolBase, art: p.artBudget,
        slope: slope, soft: soft, preOpening: preOpening, contingency: contingency
      },
      earningCapex: earningCapex,
      missionCapex: missionCapex,
      totalSqm: totalSqm,
      eiaTriggered: totalSqm >= 4000 || p.keys >= 80,
      retreatBeds: retreatBeds,
      teachers: teachers,
      revenue: revenue,
      revenueParts: {
        rooms: revRooms, retreat: revRetreat, cafe: revCafe, school: revSchool,
        donation: revDonation, merch: revMerch, events: revEvents
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
