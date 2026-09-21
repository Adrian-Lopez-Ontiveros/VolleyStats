import type ExcelJS from "exceljs";
import { APP_NAME } from "@/lib/constants";
import { downloadBlob } from "@/lib/download-pdf";
import {
  sumPlayerRows,
  type MatchExcelPlayerRow,
  type MatchExcelReport,
  type TeamSkillTotals,
} from "@/lib/match-excel-report";


type Worksheet = ExcelJS.Worksheet;
type Workbook = ExcelJS.Workbook;

const NAVY = "FF0B1F3A";
const NAVY_MID = "FF123056";
const ORANGE = "FFF97316";
const WHITE = "FFFFFFFF";
const SLATE_50 = "FFF8FAFC";
const SLATE_100 = "FFF1F5F9";
const SLATE_200 = "FFE2E8F0";
const SLATE_500 = "FF64748B";
const SLATE_700 = "FF334155";
const EMERALD = "FF059669";
const EMERALD_SOFT = "FFD1FAE5";
const ROSE = "FFE11D48";
const ROSE_SOFT = "FFFFE4E6";
const AMBER_SOFT = "FFFEF3C7";
const LIME_SOFT = "FFECFCCB";
const SKY = "FF0284C7";
const SKY_SOFT = "FFE0F2FE";
const VIOLET = "FF7C3AED";
const CYAN = "FF0891B2";
const ORANGE_SOFT = "FFFED7AA";

const THIN = {
  style: "thin" as const,
  color: { argb: SLATE_200 },
};
const BORDER = { top: THIN, left: THIN, bottom: THIN, right: THIN };

const COL = {
  num: 1,
  name: 2,
  pos: 3,
  sets: 4,
  pts: 5,
  err: 6,
  bal: 7,
  atkPts: 8,
  atkCont: 9,
  atkErr: 10,
  atkAtt: 11,
  atkEff: 12,
  srvAce: 13,
  srvIn: 14,
  srvErr: 15,
  srvAtt: 16,
  srvPct: 17,
  blkPt: 18,
  blkTouch: 19,
  blkCont: 20,
  recG: 21,
  recM: 22,
  recB: 23,
  recE: 24,
  recT: 25,
  recAvg: 26,
  recPct: 27,
  defG: 28,
  defM: 29,
  defB: 30,
  defE: 31,
  defT: 32,
  defAvg: 33,
  defPct: 34,
} as const;

const LAST_COL = COL.defPct;

const GROUPS: { title: string; fill: string; font: string; start: number; end: number }[] = [
  { title: "JUGADOR", fill: NAVY, font: WHITE, start: 1, end: 7 },
  { title: "ATAQUE", fill: ORANGE, font: NAVY, start: 8, end: 12 },
  { title: "SAQUE", fill: VIOLET, font: WHITE, start: 13, end: 17 },
  { title: "BLOQUEO", fill: CYAN, font: NAVY, start: 18, end: 20 },
  { title: "RECEPCIÓN", fill: SKY, font: WHITE, start: 21, end: 27 },
  { title: "DEFENSA", fill: SLATE_700, font: WHITE, start: 28, end: 34 },
];

const SUBHEADERS = [
  "#",
  "Jugador",
  "Posición",
  "Sets",
  "Pts",
  "Err",
  "Bal",
  "Pts",
  "Cont",
  "Err",
  "Int",
  "Eff %",
  "Ace",
  "Dentro",
  "Err",
  "Int",
  "%",
  "Punto",
  "Toque",
  "Cont",
  "Buena",
  "Media",
  "Mala",
  "Err",
  "Total",
  "Media",
  "Eff %",
  "Buena",
  "Media",
  "Mala",
  "Err",
  "Total",
  "Media",
  "Eff %",
];

function fillSolid(argb: string) {
  return { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb } };
}

function font(opts: {
  color?: string;
  bold?: boolean;
  size?: number;
  name?: string;
  italic?: boolean;
}) {
  return {
    name: opts.name ?? "Calibri",
    size: opts.size ?? 11,
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    color: { argb: opts.color ?? NAVY },
  };
}

function align(horizontal: ExcelJS.Alignment["horizontal"], vertical: ExcelJS.Alignment["vertical"] = "middle") {
  return { horizontal, vertical, wrapText: true };
}

function paint(
  sheet: Worksheet,
  row: number,
  col: number,
  value: ExcelJS.CellValue,
  opts: {
    fill?: string;
    color?: string;
    bold?: boolean;
    size?: number;
    align?: ExcelJS.Alignment["horizontal"];
    numFmt?: string;
    border?: boolean;
    italic?: boolean;
  } = {}
) {
  const cell = sheet.getCell(row, col);
  cell.value = value;
  cell.font = font({
    color: opts.color ?? NAVY,
    bold: opts.bold,
    size: opts.size,
    italic: opts.italic,
  });
  cell.alignment = align(opts.align ?? "center");
  if (opts.fill) cell.fill = fillSolid(opts.fill);
  if (opts.border !== false) cell.border = BORDER;
  if (opts.numFmt) cell.numFmt = opts.numFmt;
  return cell;
}

function merge(sheet: Worksheet, r1: number, c1: number, r2: number, c2: number) {
  sheet.mergeCells(r1, c1, r2, c2);
}

function resultColors(label: MatchExcelReport["resultLabel"]) {
  if (label === "GANADO") return { fill: EMERALD, color: WHITE };
  if (label === "PERDIDO") return { fill: ROSE, color: WHITE };
  if (label === "EN JUEGO") return { fill: ORANGE, color: WHITE };
  if (label === "CANCELADO") return { fill: SLATE_500, color: WHITE };
  return { fill: SKY, color: WHITE };
}

function rateFill(rate: number | null) {
  if (rate === null) return WHITE;
  if (rate >= 0.8) return EMERALD_SOFT;
  if (rate >= 0.65) return LIME_SOFT;
  if (rate >= 0.5) return AMBER_SOFT;
  return ROSE_SOFT;
}

function avgFill(avg: number | null) {
  if (avg === null) return WHITE;
  if (avg >= 2.2) return EMERALD_SOFT;
  if (avg >= 1.7) return LIME_SOFT;
  if (avg >= 1.2) return AMBER_SOFT;
  return ROSE_SOFT;
}

function contributionFill(value: number) {
  if (value > 0) return EMERALD_SOFT;
  if (value < 0) return ROSE_SOFT;
  return SLATE_100;
}

function sheetName(name: string) {
  const cleaned = name.replace(/[:\\/?*[\]]/g, " ").replace(/\s+/g, " ").trim();
  return (cleaned || "Hoja").slice(0, 31);
}

function uniqueSheetName(workbook: Workbook, name: string) {
  const base = sheetName(name);
  let candidate = base;
  let i = 2;
  while (workbook.getWorksheet(candidate)) {
    const suffix = ` ${i}`;
    candidate = `${base.slice(0, 31 - suffix.length)}${suffix}`;
    i += 1;
  }
  return candidate;
}

function setupSheet(sheet: Worksheet, frozenRows = 1, frozenCols = 0) {
  sheet.views = [
    {
      state: "frozen",
      xSplit: frozenCols,
      ySplit: frozenRows,
      showGridLines: false,
      activeCell: "A1",
    },
  ];
  sheet.pageSetup = {
    orientation: "landscape",
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    paperSize: 9,
    margins: { left: 0.3, right: 0.3, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
    printTitlesRow: `1:${Math.max(frozenRows, 1)}`,
  };
  sheet.headerFooter = {
    oddHeader: `&L${APP_NAME}&CInforme de partido&R&D`,
    oddFooter: "&C&P / &N",
  };
}

function rateValue(rate: number | null): number | string {
  return rate === null ? "" : rate;
}

function fileNameFor(report: MatchExcelReport) {
  const home = report.homeLabel.replace(/[\\/:*?"<>|]+/g, "").trim() || "Local";
  const away = report.awayLabel.replace(/[\\/:*?"<>|]+/g, "").trim() || "Visitante";
  return `${APP_NAME}-${home}-vs-${away}.xlsx`;
}

function writeMatchBanner(sheet: Worksheet, report: MatchExcelReport, lastCol = 12) {
  merge(sheet, 1, 1, 1, lastCol);
  paint(sheet, 1, 1, APP_NAME.toUpperCase(), {
    fill: NAVY,
    color: ORANGE,
    bold: true,
    size: 12,
    align: "left",
    border: false,
  });
  sheet.getRow(1).height = 22;
  for (let col = 2; col <= lastCol; col += 1) {
    sheet.getCell(1, col).fill = fillSolid(NAVY);
    sheet.getCell(1, col).border = BORDER;
  }

  const meta = [report.dateLabel, report.location, report.categoryLabel, report.round]
    .filter(Boolean)
    .join("  ·  ");
  merge(sheet, 2, 1, 2, lastCol);
  paint(sheet, 2, 1, meta, {
    fill: NAVY_MID,
    color: WHITE,
    size: 10,
    align: "left",
    border: false,
  });
  for (let col = 2; col <= lastCol; col += 1) {
    sheet.getCell(2, col).fill = fillSolid(NAVY_MID);
  }
  sheet.getRow(2).height = 18;

  const badge = resultColors(report.resultLabel);
  merge(sheet, 3, 1, 4, 2);
  paint(sheet, 3, 1, report.resultLabel, {
    fill: badge.fill,
    color: badge.color,
    bold: true,
    size: 16,
  });
  sheet.getCell(4, 1).fill = fillSolid(badge.fill);
  sheet.getCell(4, 2).fill = fillSolid(badge.fill);

  merge(sheet, 3, 3, 4, lastCol);
  const venue = report.clubIsHome ? "Local" : "Visitante";
  paint(sheet, 3, 3, `${report.opponentLabel}  [${venue}]`, {
    fill: WHITE,
    color: NAVY,
    bold: true,
    size: 22,
    align: "left",
  });
  sheet.getRow(3).height = 26;
  sheet.getRow(4).height = 18;
  for (let col = 4; col <= lastCol; col += 1) {
    sheet.getCell(3, col).fill = fillSolid(WHITE);
    sheet.getCell(4, col).fill = fillSolid(WHITE);
  }
}

function writeSetScores(sheet: Worksheet, report: MatchExcelReport, startRow: number) {
  paint(sheet, startRow, 1, "", { fill: SLATE_100, border: false });
  for (let i = 0; i < 5; i += 1) {
    paint(sheet, startRow, 2 + i, `SET ${i + 1}`, {
      fill: NAVY,
      color: WHITE,
      bold: true,
      size: 9,
    });
  }
  paint(sheet, startRow, 7, "TOTAL", { fill: ORANGE, color: NAVY, bold: true, size: 9 });

  paint(sheet, startRow + 1, 1, report.homeLabel, {
    fill: SLATE_100,
    bold: true,
    align: "left",
    size: 10,
  });
  paint(sheet, startRow + 2, 1, report.awayLabel, {
    fill: SLATE_100,
    bold: true,
    align: "left",
    size: 10,
  });

  for (let i = 0; i < 5; i += 1) {
    const set = report.setScores[i];
    const homeWin = set && set.home > set.away;
    const awayWin = set && set.away > set.home;
    paint(sheet, startRow + 1, 2 + i, set ? set.home : "", {
      fill: homeWin ? EMERALD_SOFT : WHITE,
      bold: Boolean(homeWin),
      size: 12,
    });
    paint(sheet, startRow + 2, 2 + i, set ? set.away : "", {
      fill: awayWin ? EMERALD_SOFT : WHITE,
      bold: Boolean(awayWin),
      size: 12,
    });
  }
  const homeTotalWin = report.homeSets > report.awaySets;
  paint(sheet, startRow + 1, 7, report.homeSets, {
    fill: homeTotalWin ? EMERALD : ROSE_SOFT,
    color: homeTotalWin ? WHITE : ROSE,
    bold: true,
    size: 14,
  });
  paint(sheet, startRow + 2, 7, report.awaySets, {
    fill: homeTotalWin ? ROSE_SOFT : EMERALD,
    color: homeTotalWin ? ROSE : WHITE,
    bold: true,
    size: 14,
  });
  sheet.getRow(startRow).height = 18;
  sheet.getRow(startRow + 1).height = 22;
  sheet.getRow(startRow + 2).height = 22;
  return startRow + 3;
}

function writePlayerHeaders(sheet: Worksheet, headerRow: number) {
  for (const group of GROUPS) {
    merge(sheet, headerRow, group.start, headerRow, group.end);
    paint(sheet, headerRow, group.start, group.title, {
      fill: group.fill,
      color: group.font,
      bold: true,
      size: 9,
    });
    for (let col = group.start; col <= group.end; col += 1) {
      const cell = sheet.getCell(headerRow, col);
      cell.fill = fillSolid(group.fill);
      cell.font = font({ color: group.font, bold: true, size: 9 });
      cell.border = BORDER;
      cell.alignment = align("center");
    }
  }
  sheet.getRow(headerRow).height = 18;
  for (let col = 1; col <= LAST_COL; col += 1) {
    const group = GROUPS.find((item) => col >= item.start && col <= item.end) ?? GROUPS[0];
    paint(sheet, headerRow + 1, col, SUBHEADERS[col - 1], {
      fill: group.fill,
      color: group.font,
      bold: true,
      size: 8,
    });
  }
  sheet.getRow(headerRow + 1).height = 18;
}

function writePlayerRow(
  sheet: Worksheet,
  row: number,
  player: MatchExcelPlayerRow,
  index: number | "total" | "pct",
  zebra: boolean
) {
  const isTotal = index === "total" || index === "pct";
  const baseFill = isTotal ? NAVY : zebra ? SLATE_50 : WHITE;
  const text = isTotal ? WHITE : NAVY;
  const nameFill =
    !isTotal && player.position === "libero" ? SKY_SOFT : baseFill;

  const values: ExcelJS.CellValue[] = [
    index === "total" || index === "pct" ? "" : player.jersey ?? "",
    index === "pct" ? "% por tipo" : player.name,
    index === "pct" ? "" : player.positionLabel,
    index === "pct" ? "" : player.setsPlayed || "",
    index === "pct" ? "" : player.points,
    index === "pct" ? "" : player.errors,
    index === "pct" ? "" : player.contribution,
    index === "pct" ? rateValue(player.attack.attempts ? player.attack.kills / player.attack.attempts : null) : player.attack.kills,
    index === "pct" ? rateValue(player.attack.attempts ? player.attack.continuations / player.attack.attempts : null) : player.attack.continuations,
    index === "pct" ? rateValue(player.attack.attempts ? player.attack.errors / player.attack.attempts : null) : player.attack.errors,
    index === "pct" ? "" : player.attack.attempts,
    rateValue(player.attack.efficiency),
    index === "pct" ? rateValue(player.serve.attempts ? player.serve.aces / player.serve.attempts : null) : player.serve.aces,
    index === "pct" ? rateValue(player.serve.attempts ? player.serve.inPlay / player.serve.attempts : null) : player.serve.inPlay,
    index === "pct" ? rateValue(player.serve.attempts ? player.serve.errors / player.serve.attempts : null) : player.serve.errors,
    index === "pct" ? "" : player.serve.attempts,
    rateValue(player.serve.successRate),
    index === "pct" ? "" : player.blockPoints,
    index === "pct" ? "" : player.blockTouches,
    index === "pct" ? "" : player.blockContinuations,
    index === "pct" ? rateValue(player.reception.total ? player.reception.good / player.reception.total : null) : player.reception.good,
    index === "pct" ? rateValue(player.reception.total ? player.reception.medium / player.reception.total : null) : player.reception.medium,
    index === "pct" ? rateValue(player.reception.total ? player.reception.bad / player.reception.total : null) : player.reception.bad,
    index === "pct" ? rateValue(player.reception.total ? player.reception.errors / player.reception.total : null) : player.reception.errors,
    index === "pct" ? "" : player.reception.total,
    index === "pct" ? "" : player.receptionAverage ?? "",
    rateValue(player.reception.successRate),
    index === "pct" ? rateValue(player.defense.total ? player.defense.good / player.defense.total : null) : player.defense.good,
    index === "pct" ? rateValue(player.defense.total ? player.defense.medium / player.defense.total : null) : player.defense.medium,
    index === "pct" ? rateValue(player.defense.total ? player.defense.bad / player.defense.total : null) : player.defense.bad,
    index === "pct" ? rateValue(player.defense.total ? player.defense.errors / player.defense.total : null) : player.defense.errors,
    index === "pct" ? "" : player.defense.total,
    index === "pct" ? "" : player.defenseAverage ?? "",
    rateValue(player.defense.successRate),
  ];

  const pctCols = new Set([12, 17, 27, 34]);
  if (index === "pct") {
    [8, 9, 10, 13, 14, 15, 21, 22, 23, 24, 28, 29, 30, 31].forEach((col) => pctCols.add(col));
  }
  const avgCols = new Set([26, 33]);

  for (let col = 1; col <= LAST_COL; col += 1) {
    let fill = col === 2 ? nameFill : baseFill;
    let color = text;
    let numFmt: string | undefined;
    const value = values[col - 1];
    if (!isTotal && typeof value === "number") {
      if (col === COL.bal) fill = contributionFill(player.contribution);
      if (col === COL.atkEff) fill = rateFill(player.attack.efficiency);
      if (col === COL.srvPct) fill = rateFill(player.serve.successRate);
      if (col === COL.recPct) fill = rateFill(player.reception.successRate);
      if (col === COL.defPct) fill = rateFill(player.defense.successRate);
      if (col === COL.recAvg) fill = avgFill(player.receptionAverage);
      if (col === COL.defAvg) fill = avgFill(player.defenseAverage);
    }
    if (pctCols.has(col) && value !== "") numFmt = "0%";
    if (avgCols.has(col) && typeof value === "number") numFmt = "0.0";
    if (col === COL.bal && index !== "pct" && typeof value === "number") numFmt = "+0;-0;0";
    if (col === COL.name) color = isTotal ? WHITE : NAVY;
    paint(sheet, row, col, value, {
      fill,
      color,
      bold: isTotal || col === COL.name || col === COL.pts,
      size: isTotal ? 9 : 10,
      align: col === COL.name || col === COL.pos ? "left" : "center",
      numFmt,
    });
  }
  sheet.getRow(row).height = isTotal ? 20 : 18;
}

function applyPlayerWidths(sheet: Worksheet) {
  const widths: Record<number, number> = {
    1: 5,
    2: 22,
    3: 12,
    4: 6,
    5: 6,
    6: 6,
    7: 6,
  };
  for (let col = 8; col <= LAST_COL; col += 1) widths[col] = 7;
  widths[12] = 8;
  widths[17] = 8;
  widths[26] = 8;
  widths[27] = 8;
  widths[33] = 8;
  widths[34] = 8;
  for (const [col, width] of Object.entries(widths)) {
    sheet.getColumn(Number(col)).width = width;
  }
}

function addDataBars(sheet: Worksheet, fromRow: number, toRow: number, col: number, color: string) {
  if (toRow < fromRow) return;
  sheet.addConditionalFormatting({
    ref: `${colLetter(col)}${fromRow}:${colLetter(col)}${toRow}`,
    rules: [
      {
        type: "dataBar",
        cfvo: [{ type: "min" }, { type: "max" }],
        color: { argb: color },
        showValue: true,
        gradient: true,
        priority: 1,
      } as unknown as ExcelJS.ConditionalFormattingRule,
    ],
  });
}

function colLetter(col: number) {
  let n = col;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

function writePlayerTable(
  sheet: Worksheet,
  startRow: number,
  players: MatchExcelPlayerRow[]
) {
  writePlayerHeaders(sheet, startRow);
  let row = startRow + 2;
  const firstData = row;
  players.forEach((player, index) => {
    writePlayerRow(sheet, row, player, index + 1, index % 2 === 1);
    row += 1;
  });
  const lastData = row - 1;
  const totals = sumPlayerRows(players);
  writePlayerRow(sheet, row, totals, "total", false);
  row += 1;
  writePlayerRow(sheet, row, totals, "pct", false);
  if (lastData >= firstData) {
    addDataBars(sheet, firstData, lastData, COL.pts, NAVY);
    addDataBars(sheet, firstData, lastData, COL.atkPts, ORANGE);
  }
  applyPlayerWidths(sheet);
  return row;
}

function teamMetricRows(report: MatchExcelReport) {
  const home = report.home;
  const away = report.away;
  return [
    ["Puntos de set", home.setPoints, away.setPoints],
    ["Puntos de ataque", home.origins.attack, away.origins.attack],
    ["Puntos de bloqueo", home.origins.block, away.origins.block],
    ["Aces", home.origins.ace, away.origins.ace],
    ["Puntos por error rival", home.origins.opponentError, away.origins.opponentError],
    ["Otros puntos", home.origins.other, away.origins.other],
    ["Errores propios", home.ownErrors, away.ownErrors],
    ["Eff. ataque", home.attack.efficiency, away.attack.efficiency, "pct"],
    ["Intentos de ataque", home.attack.attempts, away.attack.attempts],
    ["Acierto saque", home.serve.successRate, away.serve.successRate, "pct"],
    ["Aces (saque)", home.serve.aces, away.serve.aces],
    ["Errores de saque", home.serve.errors, away.serve.errors],
    ["Eff. recepción", home.reception.successRate, away.reception.successRate, "pct"],
    ["Media recepción (0-3)", home.receptionAverage, away.receptionAverage, "avg"],
    ["Eff. defensa", home.defense.successRate, away.defense.successRate, "pct"],
    ["Media defensa (0-3)", home.defenseAverage, away.defenseAverage, "avg"],
    ["Puntos recibiendo", home.possession.sideOut.rate, away.possession.sideOut.rate, "pct"],
    ["Puntos con el saque", home.possession.breakPoint.rate, away.possession.breakPoint.rate, "pct"],
  ] as [string, number | null, number | null, string?][];
}

function writeResumen(workbook: Workbook, report: MatchExcelReport, charts: ChartPng[]) {
  const sheet = workbook.addWorksheet("Resumen", {
    properties: { tabColor: { argb: ORANGE } },
  });
  setupSheet(sheet, 4, 0);
  sheet.getColumn(1).width = 28;
  for (let col = 2; col <= 12; col += 1) sheet.getColumn(col).width = 12;
  writeMatchBanner(sheet, report, 12);
  writeSetScores(sheet, report, 6);

  paint(sheet, 10, 1, "Cómo se entendió el partido", {
    fill: NAVY,
    color: WHITE,
    bold: true,
    size: 11,
    align: "left",
  });
  merge(sheet, 10, 1, 10, 12);
  for (let col = 2; col <= 12; col += 1) sheet.getCell(10, col).fill = fillSolid(NAVY);
  let row = 11;
  for (const line of report.narrative) {
    merge(sheet, row, 1, row, 12);
    paint(sheet, row, 1, line, { fill: SLATE_50, align: "left", size: 11, border: false });
    sheet.getRow(row).height = 18;
    row += 1;
  }

  row += 1;
  paint(sheet, row, 1, "Claves si no viste el partido", {
    fill: ORANGE,
    color: NAVY,
    bold: true,
    size: 11,
    align: "left",
  });
  merge(sheet, row, 1, row, 12);
  row += 1;
  if (report.insights.length === 0) {
    merge(sheet, row, 1, row, 12);
    paint(sheet, row, 1, "Todavía no hay suficientes acciones para extraer claves.", {
      align: "left",
      italic: true,
    });
    row += 1;
  } else {
    for (const line of report.insights) {
      merge(sheet, row, 1, row, 12);
      paint(sheet, row, 1, `•  ${line}`, { fill: ORANGE_SOFT, align: "left", size: 11 });
      sheet.getRow(row).height = 20;
      row += 1;
    }
  }

  row += 1;
  paint(sheet, row, 1, "Comparativa de equipos", {
    fill: NAVY,
    color: WHITE,
    bold: true,
    align: "left",
  });
  merge(sheet, row, 1, row, 4);
  paint(sheet, row, 2, report.homeLabel, { fill: NAVY, color: WHITE, bold: true });
  paint(sheet, row, 3, report.awayLabel, { fill: NAVY, color: WHITE, bold: true });
  paint(sheet, row, 4, "Ventaja", { fill: NAVY, color: WHITE, bold: true });
  row += 1;
  for (const [label, homeVal, awayVal, kind] of teamMetricRows(report)) {
    const homeBetter =
      kind === "pct" || kind === "avg"
        ? (homeVal ?? -1) > (awayVal ?? -1)
        : label.includes("Errores")
          ? (homeVal ?? 0) < (awayVal ?? 0)
          : (homeVal ?? 0) > (awayVal ?? 0);
    const awayBetter =
      kind === "pct" || kind === "avg"
        ? (awayVal ?? -1) > (homeVal ?? -1)
        : label.includes("Errores")
          ? (awayVal ?? 0) < (homeVal ?? 0)
          : (awayVal ?? 0) > (homeVal ?? 0);
    paint(sheet, row, 1, label, { fill: SLATE_100, align: "left", bold: true, size: 10 });
    paint(sheet, row, 2, kind === "pct" ? rateValue(homeVal) : homeVal ?? "", {
      fill: homeBetter ? EMERALD_SOFT : WHITE,
      bold: homeBetter,
      numFmt: kind === "pct" ? "0%" : kind === "avg" ? "0.0" : undefined,
    });
    paint(sheet, row, 3, kind === "pct" ? rateValue(awayVal) : awayVal ?? "", {
      fill: awayBetter ? EMERALD_SOFT : WHITE,
      bold: awayBetter,
      numFmt: kind === "pct" ? "0%" : kind === "avg" ? "0.0" : undefined,
    });
    const edge =
      homeVal == null && awayVal == null
        ? ""
        : homeBetter
          ? report.homeLabel
          : awayBetter
            ? report.awayLabel
            : "Igual";
    paint(sheet, row, 4, edge, {
      fill: edge === "Igual" ? SLATE_50 : EMERALD_SOFT,
      size: 9,
    });
    row += 1;
  }

  row += 1;
  paint(sheet, row, 1, `Destacados · ${report.clubLabel}`, {
    fill: NAVY,
    color: WHITE,
    bold: true,
    align: "left",
  });
  merge(sheet, row, 1, row, 4);
  row += 1;
  paint(sheet, row, 1, "Dato", { fill: SLATE_700, color: WHITE, bold: true, align: "left" });
  paint(sheet, row, 2, "Valor", { fill: SLATE_700, color: WHITE, bold: true });
  paint(sheet, row, 3, "Detalle", { fill: SLATE_700, color: WHITE, bold: true, align: "left" });
  merge(sheet, row, 3, row, 4);
  row += 1;
  for (const item of report.highlights) {
    paint(sheet, row, 1, item.label, { fill: SLATE_50, align: "left", bold: true, size: 10 });
    paint(sheet, row, 2, item.value, { bold: true, size: 12 });
    merge(sheet, row, 3, row, 4);
    paint(sheet, row, 3, item.detail, { align: "left", size: 10 });
    row += 1;
  }

  if (report.notes) {
    row += 1;
    paint(sheet, row, 1, "Notas del partido", {
      fill: SLATE_700,
      color: WHITE,
      bold: true,
      align: "left",
    });
    merge(sheet, row, 1, row, 12);
    row += 1;
    merge(sheet, row, 1, row + 1, 12);
    paint(sheet, row, 1, report.notes, { align: "left", size: 10 });
    row += 2;
  }

  row += 2;
  charts.slice(0, 2).forEach((chart, index) => {
    const imageId = workbook.addImage({ base64: chart.base64, extension: "png" });
    sheet.addImage(imageId, {
      tl: { col: index * 6, row: row - 1 },
      ext: { width: 460, height: 240 },
      editAs: "oneCell",
    });
  });
  for (let i = 0; i < 16; i += 1) sheet.getRow(row + i).height = 18;
  return sheet;
}

function writeTeamPlayersSheet(
  workbook: Workbook,
  report: MatchExcelReport,
  side: "home" | "away"
) {
  const label = side === "home" ? report.homeLabel : report.awayLabel;
  const players = side === "home" ? report.homePlayers : report.awayPlayers;
  const sheet = workbook.addWorksheet(uniqueSheetName(workbook, label), {
    properties: { tabColor: { argb: side === "home" ? NAVY : SKY } },
  });
  setupSheet(sheet, 12, 3);
  writeMatchBanner(sheet, report, LAST_COL);
  writeSetScores(sheet, report, 6);
  paint(sheet, 10, 1, `Estadísticas de ${side === "home" ? report.homeName : report.awayName}`, {
    fill: NAVY,
    color: WHITE,
    bold: true,
    align: "left",
    size: 11,
  });
  merge(sheet, 10, 1, 10, LAST_COL);
  writePlayerTable(sheet, 11, players);
  sheet.autoFilter = {
    from: { row: 12, column: 1 },
    to: { row: 12 + Math.max(players.length, 1), column: LAST_COL },
  };
}

function writeSetsSheet(workbook: Workbook, report: MatchExcelReport) {
  const sheet = workbook.addWorksheet("Sets", { properties: { tabColor: { argb: CYAN } } });
  setupSheet(sheet, 2, 1);
  sheet.getColumn(1).width = 28;
  for (let col = 2; col <= 8; col += 1) sheet.getColumn(col).width = 14;

  const headers = ["Dato", ...report.sets.map((set) => `Set ${set.setNumber}`), "Partido"];
  headers.forEach((label, index) => {
    paint(sheet, 1, index + 1, label, { fill: NAVY, color: WHITE, bold: true, size: 10 });
  });

  const rows: { label: string; pick: (skills: TeamSkillTotals) => number | null; pct?: boolean }[] = [
    { label: `${report.homeLabel} · puntos`, pick: (s) => s.setPoints },
    { label: `${report.awayLabel} · puntos`, pick: (s) => s.setPoints },
    { label: `${report.homeLabel} · ataque`, pick: (s) => s.attack.efficiency, pct: true },
    { label: `${report.awayLabel} · ataque`, pick: (s) => s.attack.efficiency, pct: true },
    { label: `${report.homeLabel} · saque`, pick: (s) => s.serve.successRate, pct: true },
    { label: `${report.awayLabel} · saque`, pick: (s) => s.serve.successRate, pct: true },
    { label: `${report.homeLabel} · recepción`, pick: (s) => s.reception.successRate, pct: true },
    { label: `${report.awayLabel} · recepción`, pick: (s) => s.reception.successRate, pct: true },
    { label: `${report.homeLabel} · defensa`, pick: (s) => s.defense.successRate, pct: true },
    { label: `${report.awayLabel} · defensa`, pick: (s) => s.defense.successRate, pct: true },
    { label: `${report.homeLabel} · recibiendo`, pick: (s) => s.possession.sideOut.rate, pct: true },
    { label: `${report.awayLabel} · con saque`, pick: (s) => s.possession.breakPoint.rate, pct: true },
    { label: `${report.homeLabel} · errores`, pick: (s) => s.ownErrors },
    { label: `${report.awayLabel} · errores`, pick: (s) => s.ownErrors },
  ];

  rows.forEach((item, index) => {
    const row = index + 2;
    const isHome = item.label.startsWith(report.homeLabel);
    paint(sheet, row, 1, item.label, { fill: SLATE_100, align: "left", bold: true, size: 10 });
    report.sets.forEach((set, setIndex) => {
      const skills = isHome ? set.homeSkills : set.awaySkills;
      const value = item.pick(skills);
      paint(sheet, row, setIndex + 2, item.pct ? rateValue(value) : value ?? "", {
        numFmt: item.pct ? "0%" : undefined,
        fill: item.pct ? rateFill(value) : WHITE,
      });
    });
    const party = isHome ? report.home : report.away;
    const value = item.pick(party);
    paint(sheet, row, report.sets.length + 2, item.pct ? rateValue(value) : value ?? "", {
      numFmt: item.pct ? "0%" : undefined,
      fill: NAVY,
      color: WHITE,
      bold: true,
    });
  });
}

function writeRotationsSheet(workbook: Workbook, report: MatchExcelReport) {
  const sheet = workbook.addWorksheet("Rotaciones", {
    properties: { tabColor: { argb: VIOLET } },
  });
  setupSheet(sheet, 2, 1);
  const headers = ["Equipo", "Rotación", "PF", "PC", "Dif", "Recibiendo", "Con saque", "Err", "Eff. ataque"];
  headers.forEach((label, index) => {
    paint(sheet, 1, index + 1, label, { fill: NAVY, color: WHITE, bold: true, size: 10 });
    sheet.getColumn(index + 1).width = index === 0 ? 18 : 12;
  });
  let row = 2;
  const blocks = [
    { label: report.homeLabel, rows: report.homeRotations },
    { label: report.awayLabel, rows: report.awayRotations },
  ];
  for (const block of blocks) {
    for (const item of block.rows) {
      const active = item.pointsFor + item.pointsAgainst + item.attack.attempts + item.errors > 0;
      const diff = item.pointsFor - item.pointsAgainst;
      paint(sheet, row, 1, block.label, { align: "left", fill: row % 2 ? WHITE : SLATE_50 });
      paint(sheet, row, 2, `R${item.rotation}`, { bold: true, fill: row % 2 ? WHITE : SLATE_50 });
      paint(sheet, row, 3, item.pointsFor, { fill: row % 2 ? WHITE : SLATE_50 });
      paint(sheet, row, 4, item.pointsAgainst, { fill: row % 2 ? WHITE : SLATE_50 });
      paint(sheet, row, 5, active ? diff : "", {
        fill: !active ? SLATE_50 : diff > 0 ? EMERALD_SOFT : diff < 0 ? ROSE_SOFT : SLATE_50,
        numFmt: "+0;-0;0",
        bold: true,
      });
      paint(sheet, row, 6, rateValue(item.sideOut.rate), {
        numFmt: "0%",
        fill: rateFill(item.sideOut.rate),
      });
      paint(sheet, row, 7, rateValue(item.breakPoint.rate), {
        numFmt: "0%",
        fill: rateFill(item.breakPoint.rate),
      });
      paint(sheet, row, 8, item.errors, { fill: row % 2 ? WHITE : SLATE_50 });
      paint(sheet, row, 9, rateValue(item.attack.efficiency), {
        numFmt: "0%",
        fill: rateFill(item.attack.efficiency),
      });
      row += 1;
    }
  }
}

function writeActionsSheet(workbook: Workbook, report: MatchExcelReport) {
  const sheet = workbook.addWorksheet("Acciones", {
    properties: { tabColor: { argb: SLATE_700 } },
  });
  setupSheet(sheet, 1, 2);
  const headers = ["Hora", "Set", "Marcador", "Equipo", "Jugador", "Acción", "Punto para"];
  const widths = [12, 8, 12, 16, 26, 22, 16];
  headers.forEach((label, index) => {
    paint(sheet, 1, index + 1, label, { fill: NAVY, color: WHITE, bold: true, size: 10 });
    sheet.getColumn(index + 1).width = widths[index];
  });
  report.actions.forEach((action, index) => {
    const row = index + 2;
    const fill = action.scoresPoint ? (row % 2 ? WHITE : SLATE_50) : SLATE_50;
    paint(sheet, row, 1, action.time, { fill, size: 9 });
    paint(sheet, row, 2, action.setNumber, { fill, bold: true });
    paint(sheet, row, 3, `${action.homeScore}-${action.awayScore}`, { fill, bold: action.scoresPoint });
    paint(sheet, row, 4, action.team, { fill, align: "left" });
    paint(sheet, row, 5, action.player, { fill, align: "left" });
    paint(sheet, row, 6, action.action, {
      fill: action.scoresPoint ? fill : AMBER_SOFT,
      align: "left",
    });
    paint(sheet, row, 7, action.scoringTeam, {
      fill: action.scoringTeam === report.homeLabel ? EMERALD_SOFT : action.scoringTeam ? ROSE_SOFT : fill,
      align: "left",
    });
  });
  if (report.actions.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: report.actions.length + 1, column: 7 },
    };
  }
}

function writeGlossarySheet(workbook: Workbook, report: MatchExcelReport) {
  const sheet = workbook.addWorksheet("Glosario", {
    properties: { tabColor: { argb: SLATE_500 } },
  });
  setupSheet(sheet, 1, 1);
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 90;
  paint(sheet, 1, 1, "Término", { fill: NAVY, color: WHITE, bold: true, align: "left" });
  paint(sheet, 1, 2, "Qué significa en FuenlaStats", {
    fill: NAVY,
    color: WHITE,
    bold: true,
    align: "left",
  });
  report.glossary.forEach((item, index) => {
    const row = index + 2;
    paint(sheet, row, 1, item.term, { fill: SLATE_100, bold: true, align: "left" });
    paint(sheet, row, 2, item.meaning, { align: "left" });
    sheet.getRow(row).height = 28;
  });
}

function writeChartsSheet(
  workbook: Workbook,
  report: MatchExcelReport,
  charts: ChartPng[]
) {
  const sheet = workbook.addWorksheet("Gráficos", {
    properties: { tabColor: { argb: ORANGE } },
  });
  setupSheet(sheet, 1, 0);
  sheet.getColumn(1).width = 22;
  for (let col = 2; col <= 8; col += 1) sheet.getColumn(col).width = 14;
  paint(sheet, 1, 1, "Gráficos y datos para interpretar el partido", {
    fill: NAVY,
    color: WHITE,
    bold: true,
    align: "left",
    size: 14,
  });
  merge(sheet, 1, 1, 1, 8);

  let row = 3;
  paint(sheet, row, 1, "Marcador por set", { fill: ORANGE, color: NAVY, bold: true, align: "left" });
  merge(sheet, row, 1, row, 4);
  row += 1;
  paint(sheet, row, 1, "Set", { fill: SLATE_700, color: WHITE, bold: true });
  paint(sheet, row, 2, report.homeLabel, { fill: SLATE_700, color: WHITE, bold: true });
  paint(sheet, row, 3, report.awayLabel, { fill: SLATE_700, color: WHITE, bold: true });
  row += 1;
  report.setScores.forEach((set, index) => {
    paint(sheet, row, 1, `Set ${index + 1}`, { align: "left", fill: SLATE_50 });
    paint(sheet, row, 2, set.home, { fill: set.home > set.away ? EMERALD_SOFT : WHITE });
    paint(sheet, row, 3, set.away, { fill: set.away > set.home ? EMERALD_SOFT : WHITE });
    row += 1;
  });

  row += 2;
  paint(sheet, row, 1, "Origen de los puntos", { fill: ORANGE, color: NAVY, bold: true, align: "left" });
  merge(sheet, row, 1, row, 4);
  row += 1;
  paint(sheet, row, 1, "Origen", { fill: SLATE_700, color: WHITE, bold: true, align: "left" });
  paint(sheet, row, 2, report.homeLabel, { fill: SLATE_700, color: WHITE, bold: true });
  paint(sheet, row, 3, report.awayLabel, { fill: SLATE_700, color: WHITE, bold: true });
  row += 1;
  const origins: [string, number, number][] = [
    ["Ataque", report.home.origins.attack, report.away.origins.attack],
    ["Bloqueo", report.home.origins.block, report.away.origins.block],
    ["Ace", report.home.origins.ace, report.away.origins.ace],
    ["Error rival", report.home.origins.opponentError, report.away.origins.opponentError],
    ["Otro", report.home.origins.other, report.away.origins.other],
  ];
  for (const [label, home, away] of origins) {
    paint(sheet, row, 1, label, { align: "left", fill: SLATE_50 });
    paint(sheet, row, 2, home);
    paint(sheet, row, 3, away);
    row += 1;
  }

  row += 2;
  const clubPlayers = report.clubIsHome ? report.homePlayers : report.awayPlayers;
  paint(sheet, row, 1, `Puntos por jugador · ${report.clubLabel}`, {
    fill: ORANGE,
    color: NAVY,
    bold: true,
    align: "left",
  });
  merge(sheet, row, 1, row, 5);
  row += 1;
  ["Jugador", "Pts", "Err", "Bal", "Eff. ataque"].forEach((label, index) => {
    paint(sheet, row, index + 1, label, { fill: SLATE_700, color: WHITE, bold: true });
  });
  row += 1;
  const top = [...clubPlayers].sort((a, b) => b.points - a.points).slice(0, 12);
  const dataStart = row;
  for (const player of top) {
    paint(sheet, row, 1, player.name, { align: "left" });
    paint(sheet, row, 2, player.points);
    paint(sheet, row, 3, player.errors);
    paint(sheet, row, 4, player.contribution, {
      fill: contributionFill(player.contribution),
      numFmt: "+0;-0;0",
    });
    paint(sheet, row, 5, rateValue(player.attack.efficiency), {
      numFmt: "0%",
      fill: rateFill(player.attack.efficiency),
    });
    row += 1;
  }
  if (top.length) addDataBars(sheet, dataStart, row - 1, 2, ORANGE);

  row += 2;
  paint(sheet, row, 1, "Calidad de recepción (buenas / medias / malas / errores)", {
    fill: ORANGE,
    color: NAVY,
    bold: true,
    align: "left",
  });
  merge(sheet, row, 1, row, 6);
  row += 1;
  ["Equipo", "Buena", "Media", "Mala", "Error", "Eff %"].forEach((label, index) => {
    paint(sheet, row, index + 1, label, { fill: SLATE_700, color: WHITE, bold: true });
  });
  row += 1;
  for (const [label, skills] of [
    [report.homeLabel, report.home],
    [report.awayLabel, report.away],
  ] as const) {
    paint(sheet, row, 1, label, { align: "left", fill: SLATE_50 });
    paint(sheet, row, 2, skills.reception.good, { fill: EMERALD_SOFT });
    paint(sheet, row, 3, skills.reception.medium, { fill: AMBER_SOFT });
    paint(sheet, row, 4, skills.reception.bad, { fill: ORANGE_SOFT });
    paint(sheet, row, 5, skills.reception.errors, { fill: ROSE_SOFT });
    paint(sheet, row, 6, rateValue(skills.reception.successRate), {
      numFmt: "0%",
      fill: rateFill(skills.reception.successRate),
    });
    row += 1;
  }

  if (charts.length) {
    let anchor = 2;
    charts.forEach((chart, index) => {
      const imageId = workbook.addImage({ base64: chart.base64, extension: "png" });
      const col = index % 2 === 0 ? 7 : 12;
      sheet.addImage(imageId, {
        tl: { col, row: anchor },
        ext: { width: chart.width, height: chart.height },
        editAs: "oneCell",
      });
      if (index % 2 === 1) anchor += Math.ceil(chart.height / 18) + 1;
    });
  }
}

type ChartPng = {
  base64: string;
  width: number;
  height: number;
};

function canDraw() {
  return typeof document !== "undefined";
}

function canvas2d(width: number, height: number) {
  const canvas = document.createElement("canvas");
  const dpr = 2;
  canvas.width = width * dpr;
  canvas.height = height * dpr;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.scale(dpr, dpr);
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  return { canvas, ctx, width, height };
}

function toBase64(canvas: HTMLCanvasElement) {
  return canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
}

function roundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function drawTitle(ctx: CanvasRenderingContext2D, title: string, width: number) {
  ctx.fillStyle = "#0B1F3A";
  ctx.font = "bold 16px Segoe UI, Calibri, sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(title, 20, 28);
  ctx.fillStyle = "#F97316";
  ctx.fillRect(20, 36, Math.min(180, width - 40), 3);
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  series: { label: string; color: string }[],
  x: number,
  y: number
) {
  ctx.font = "12px Segoe UI, Calibri, sans-serif";
  let cursor = x;
  for (const item of series) {
    ctx.fillStyle = item.color;
    roundedRect(ctx, cursor, y - 9, 10, 10, 2);
    ctx.fill();
    ctx.fillStyle = "#334155";
    ctx.textAlign = "left";
    ctx.fillText(item.label, cursor + 14, y);
    cursor += ctx.measureText(item.label).width + 32;
  }
}

function groupedBarChart(opts: {
  title: string;
  categories: string[];
  series: { label: string; values: number[]; color: string }[];
  width?: number;
  height?: number;
}): ChartPng | null {
  const width = opts.width ?? 640;
  const height = opts.height ?? 320;
  const drawn = canvas2d(width, height);
  if (!drawn) return null;
  const { canvas, ctx } = drawn;
  drawTitle(ctx, opts.title, width);
  drawLegend(ctx, opts.series, 20, 58);
  const left = 48;
  const right = width - 20;
  const top = 78;
  const bottom = height - 42;
  const max = Math.max(1, ...opts.series.flatMap((item) => item.values));
  const groupCount = Math.max(opts.categories.length, 1);
  const groupW = (right - left) / groupCount;
  const barW = Math.min(28, (groupW * 0.7) / Math.max(opts.series.length, 1));
  ctx.strokeStyle = "#E2E8F0";
  ctx.lineWidth = 1;
  for (let i = 0; i <= 4; i += 1) {
    const y = bottom - ((bottom - top) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
    ctx.fillStyle = "#64748B";
    ctx.font = "10px Segoe UI, Calibri, sans-serif";
    ctx.textAlign = "right";
    ctx.fillText(String(Math.round((max * i) / 4)), left - 6, y + 3);
  }
  opts.categories.forEach((label, index) => {
    opts.series.forEach((serie, s) => {
      const value = serie.values[index] ?? 0;
      const h = ((bottom - top) * value) / max;
      const x =
        left +
        index * groupW +
        (groupW - barW * opts.series.length) / 2 +
        s * barW;
      ctx.fillStyle = serie.color;
      roundedRect(ctx, x, bottom - h, barW - 4, h, 3);
      ctx.fill();
      if (value > 0) {
        ctx.fillStyle = "#0B1F3A";
        ctx.font = "bold 10px Segoe UI, Calibri, sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(String(value), x + (barW - 4) / 2, bottom - h - 4);
      }
    });
    ctx.fillStyle = "#334155";
    ctx.font = "11px Segoe UI, Calibri, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, left + index * groupW + groupW / 2, bottom + 16);
  });
  return { base64: toBase64(canvas), width, height };
}

function horizontalBarChart(opts: {
  title: string;
  labels: string[];
  values: number[];
  color: string;
  width?: number;
  height?: number;
}): ChartPng | null {
  const width = opts.width ?? 640;
  const height = opts.height ?? Math.max(240, 90 + opts.labels.length * 28);
  const drawn = canvas2d(width, height);
  if (!drawn) return null;
  const { canvas, ctx } = drawn;
  drawTitle(ctx, opts.title, width);
  const left = 150;
  const right = width - 48;
  const top = 56;
  const bottom = height - 20;
  const max = Math.max(1, ...opts.values);
  const rowH = (bottom - top) / Math.max(opts.labels.length, 1);
  opts.labels.forEach((label, index) => {
    const y = top + index * rowH + 6;
    const value = opts.values[index] ?? 0;
    const w = ((right - left) * value) / max;
    ctx.fillStyle = "#334155";
    ctx.font = "12px Segoe UI, Calibri, sans-serif";
    ctx.textAlign = "right";
    const short = label.length > 18 ? `${label.slice(0, 17)}…` : label;
    ctx.fillText(short, left - 8, y + 12);
    ctx.fillStyle = "#F1F5F9";
    roundedRect(ctx, left, y, right - left, 16, 4);
    ctx.fill();
    ctx.fillStyle = opts.color;
    roundedRect(ctx, left, y, Math.max(w, value > 0 ? 6 : 0), 16, 4);
    ctx.fill();
    ctx.fillStyle = "#0B1F3A";
    ctx.font = "bold 11px Segoe UI, Calibri, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(String(value), left + Math.max(w, 8) + 6, y + 12);
  });
  return { base64: toBase64(canvas), width, height };
}

function stackedBarChart(opts: {
  title: string;
  categories: string[];
  series: { label: string; values: number[]; color: string }[];
  width?: number;
  height?: number;
}): ChartPng | null {
  const width = opts.width ?? 640;
  const height = opts.height ?? 320;
  const drawn = canvas2d(width, height);
  if (!drawn) return null;
  const { canvas, ctx } = drawn;
  drawTitle(ctx, opts.title, width);
  drawLegend(ctx, opts.series, 20, 58);
  const left = 48;
  const right = width - 20;
  const top = 78;
  const bottom = height - 42;
  const totals = opts.categories.map((_, index) =>
    opts.series.reduce((sum, serie) => sum + (serie.values[index] ?? 0), 0)
  );
  const max = Math.max(1, ...totals);
  const groupW = (right - left) / Math.max(opts.categories.length, 1);
  const barW = Math.min(64, groupW * 0.5);
  ctx.strokeStyle = "#E2E8F0";
  for (let i = 0; i <= 4; i += 1) {
    const y = bottom - ((bottom - top) * i) / 4;
    ctx.beginPath();
    ctx.moveTo(left, y);
    ctx.lineTo(right, y);
    ctx.stroke();
  }
  opts.categories.forEach((label, index) => {
    let y = bottom;
    const x = left + index * groupW + (groupW - barW) / 2;
    opts.series.forEach((serie) => {
      const value = serie.values[index] ?? 0;
      const h = ((bottom - top) * value) / max;
      y -= h;
      ctx.fillStyle = serie.color;
      ctx.fillRect(x, y, barW, h);
    });
    ctx.fillStyle = "#334155";
    ctx.font = "11px Segoe UI, Calibri, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(label, left + index * groupW + groupW / 2, bottom + 16);
  });
  return { base64: toBase64(canvas), width, height };
}

function renderCharts(report: MatchExcelReport): ChartPng[] {
  if (!canDraw()) return [];
  const charts: ChartPng[] = [];
  const setChart = groupedBarChart({
    title: "Marcador por set",
    categories: report.setScores.map((set, index) => `Set ${index + 1}`),
    series: [
      { label: report.homeLabel, values: report.setScores.map((set) => set.home), color: "#0B1F3A" },
      { label: report.awayLabel, values: report.setScores.map((set) => set.away), color: "#F97316" },
    ],
  });
  if (setChart) charts.push(setChart);
  const originChart = groupedBarChart({
    title: "Origen de los puntos",
    categories: ["Ataque", "Bloqueo", "Ace", "Error rival", "Otro"],
    series: [
      {
        label: report.homeLabel,
        values: [
          report.home.origins.attack,
          report.home.origins.block,
          report.home.origins.ace,
          report.home.origins.opponentError,
          report.home.origins.other,
        ],
        color: "#0B1F3A",
      },
      {
        label: report.awayLabel,
        values: [
          report.away.origins.attack,
          report.away.origins.block,
          report.away.origins.ace,
          report.away.origins.opponentError,
          report.away.origins.other,
        ],
        color: "#F97316",
      },
    ],
  });
  if (originChart) charts.push(originChart);
  const clubPlayers = report.clubIsHome ? report.homePlayers : report.awayPlayers;
  const top = [...clubPlayers].filter((player) => player.points > 0).sort((a, b) => b.points - a.points).slice(0, 8);
  if (top.length) {
    const pointsChart = horizontalBarChart({
      title: `Puntos · ${report.clubLabel}`,
      labels: top.map((player) => player.name),
      values: top.map((player) => player.points),
      color: "#F97316",
    });
    if (pointsChart) charts.push(pointsChart);
  }
  const recChart = stackedBarChart({
    title: "Calidad de recepción",
    categories: [report.homeLabel, report.awayLabel],
    series: [
      {
        label: "Buena",
        values: [report.home.reception.good, report.away.reception.good],
        color: "#059669",
      },
      {
        label: "Media",
        values: [report.home.reception.medium, report.away.reception.medium],
        color: "#F59E0B",
      },
      {
        label: "Mala",
        values: [report.home.reception.bad, report.away.reception.bad],
        color: "#FB923C",
      },
      {
        label: "Error",
        values: [report.home.reception.errors, report.away.reception.errors],
        color: "#E11D48",
      },
    ],
  });
  if (recChart) charts.push(recChart);

  const clubRotations = report.clubIsHome ? report.homeRotations : report.awayRotations;
  const activeRots = clubRotations.filter(
    (row) => row.pointsFor + row.pointsAgainst > 0
  );
  if (activeRots.length) {
    const rotChart = groupedBarChart({
      title: `Rotaciones · ${report.clubLabel}`,
      categories: activeRots.map((row) => `R${row.rotation}`),
      series: [
        { label: "A favor", values: activeRots.map((row) => row.pointsFor), color: "#059669" },
        { label: "En contra", values: activeRots.map((row) => row.pointsAgainst), color: "#E11D48" },
      ],
    });
    if (rotChart) charts.push(rotChart);
  }
  return charts;
}

function unwrapExcelJS(mod: unknown): typeof ExcelJS {
  const record = mod as { default?: unknown; Workbook?: unknown };
  const inner = (record.default ?? record) as { default?: unknown; Workbook?: unknown };
  const resolved = (inner.Workbook ? inner : inner.default) as typeof ExcelJS | undefined;
  if (typeof resolved?.Workbook !== "function") {
    throw new Error("No se pudo cargar el motor de Excel");
  }
  return resolved;
}

async function loadExcelJS(): Promise<typeof ExcelJS> {
  if (typeof window !== "undefined") {
    // Browser bundle: no types, but avoids Node `fs` in the client graph.
    const mod = await import("exceljs/dist/exceljs.min.js");
    return unwrapExcelJS(mod);
  }
  const mod = await import("exceljs");
  return unwrapExcelJS(mod);
}

export async function buildMatchExcelWorkbook(report: MatchExcelReport) {
  const ExcelJSMod = await loadExcelJS();
  const workbook = new ExcelJSMod.Workbook();
  workbook.creator = APP_NAME;
  workbook.company = "CV Fuenlabrada";
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.title = report.title;
  workbook.description = report.narrative.join(" ");

  const charts = renderCharts(report);
  writeResumen(workbook, report, charts);
  writeTeamPlayersSheet(workbook, report, "home");
  writeTeamPlayersSheet(workbook, report, "away");
  writeChartsSheet(workbook, report, charts);
  writeSetsSheet(workbook, report);
  writeRotationsSheet(workbook, report);
  writeActionsSheet(workbook, report);
  writeGlossarySheet(workbook, report);
  return workbook;
}

export async function downloadMatchExcel(report: MatchExcelReport) {
  const workbook = await buildMatchExcelWorkbook(report);
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  downloadBlob(blob, fileNameFor(report));
}
