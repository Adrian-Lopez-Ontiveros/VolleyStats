import type ExcelJS from "exceljs";
import { APP_NAME } from "@/lib/constants";
import { downloadBlob } from "@/lib/download-pdf";
import {
  blockoutActionDetail,
  sumPlayerRows,
  type MatchExcelPlayerRow,
  type MatchExcelReport,
  type TeamSkillTotals,
} from "@/lib/match-excel-report";
import {
  attackActionLine,
  blockActionLine,
  defenseActionLine,
  receptionActionLine,
  serveActionLine,
} from "@/lib/volleyball-stats";


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
  atkKill: 12,
  atkEff: 13,
  atkEfi: 14,
  srvAce: 15,
  srvIn: 16,
  srvErr: 17,
  srvAtt: 18,
  srvAcePct: 19,
  srvPct: 20,
  srvErrPct: 21,
  blkPt: 22,
  blkCont: 23,
  blkTouch: 24,
  blkErr: 25,
  blkAtt: 26,
  blkEff: 27,
  recG: 28,
  recM: 29,
  recB: 30,
  recE: 31,
  recT: 32,
  recAvg: 33,
  recPerf: 34,
  recGoodPct: 35,
  recBadPct: 36,
  defG: 37,
  defM: 38,
  defB: 39,
  defE: 40,
  defT: 41,
  defAvg: 42,
  defPerf: 43,
  defGoodPct: 44,
  defBadPct: 45,
  errSrv: 46,
  errAtk: 47,
  errRec: 48,
  errDef: 49,
  errBlk: 50,
  errOther: 51,
  blkOut: 52,
} as const;

const LAST_COL = COL.blkOut;

const GROUPS: { title: string; fill: string; font: string; start: number; end: number }[] = [
  { title: "JUGADOR", fill: NAVY, font: WHITE, start: 1, end: 7 },
  { title: "ATAQUE", fill: ORANGE, font: NAVY, start: 8, end: 14 },
  { title: "SAQUE", fill: VIOLET, font: WHITE, start: 15, end: 21 },
  { title: "BLOQUEO", fill: CYAN, font: NAVY, start: 22, end: 27 },
  { title: "RECEPCIÓN", fill: SKY, font: WHITE, start: 28, end: 36 },
  { title: "DEFENSA", fill: SLATE_700, font: WHITE, start: 37, end: 45 },
  { title: "ERRORES POR TIPO", fill: ROSE_SOFT, font: NAVY, start: 46, end: 51 },
  { title: "BLOCK-OUT", fill: ROSE, font: WHITE, start: 52, end: 52 },
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
  "% Pto",
  "% Sin err",
  "Eficiencia",
  "Ace",
  "Dentro",
  "Err",
  "Int",
  "% Ace",
  "% En juego",
  "% Err",
  "Punto",
  "Cont",
  "Toque",
  "Err",
  "Int",
  "% Útil",
  "B",
  "M",
  "Ma",
  "Err",
  "Total",
  "Media 0-3",
  "% Perfecta",
  "% Positiva",
  "% Negativa",
  "B",
  "M",
  "Ma",
  "Err",
  "Total",
  "Media 0-3",
  "% Perfecta",
  "% Positiva",
  "% Negativa",
  "Saque",
  "Ataque",
  "Recep.",
  "Def.",
  "Bloq.",
  "Otros",
  "Veces",
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

/** Eficiencia (P−E)/I: ≥40 % muy buena, ≥25 % buena, ≥10 % justa. */
function efiFill(rate: number | null) {
  if (rate === null) return WHITE;
  if (rate >= 0.4) return EMERALD_SOFT;
  if (rate >= 0.25) return LIME_SOFT;
  if (rate >= 0.1) return AMBER_SOFT;
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

function clubPlayers(report: MatchExcelReport) {
  return report.clubIsHome ? report.homePlayers : report.awayPlayers;
}

function clubSkills(report: MatchExcelReport) {
  return report.clubIsHome ? report.home : report.away;
}

function clubRotations(report: MatchExcelReport) {
  return report.clubIsHome ? report.homeRotations : report.awayRotations;
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

  const pct = index === "pct";
  const share = (part: number, total: number) => rateValue(total ? part / total : null);
  const otherErrors = Math.max(
    0,
    player.errors -
      player.serve.errors -
      player.attack.errors -
      player.reception.errors -
      player.defense.errors -
      player.block.errors
  );
  const atkEfi = player.attack.attempts
    ? (player.attack.kills - player.attack.errors) / player.attack.attempts
    : null;
  const byCol: Partial<Record<keyof typeof COL, ExcelJS.CellValue>> = {
    num: isTotal ? "" : player.jersey ?? "",
    name: pct ? "% por tipo" : player.name,
    pos: pct ? "" : player.positionLabel,
    sets: pct ? "" : player.setsPlayed || "",
    pts: pct ? "" : player.points,
    err: pct ? "" : player.errors,
    bal: pct ? "" : player.contribution,
    atkPts: pct ? share(player.attack.kills, player.attack.attempts) : player.attack.kills,
    atkCont: pct ? share(player.attack.continuations, player.attack.attempts) : player.attack.continuations,
    atkErr: pct ? share(player.attack.errors, player.attack.attempts) : player.attack.errors,
    atkAtt: pct ? "" : player.attack.attempts,
    atkKill: share(player.attack.kills, player.attack.attempts),
    atkEff: rateValue(player.attack.efficiency),
    atkEfi: rateValue(atkEfi),
    srvAce: pct ? share(player.serve.aces, player.serve.attempts) : player.serve.aces,
    srvIn: pct ? share(player.serve.inPlay, player.serve.attempts) : player.serve.inPlay,
    srvErr: pct ? share(player.serve.errors, player.serve.attempts) : player.serve.errors,
    srvAtt: pct ? "" : player.serve.attempts,
    srvAcePct: share(player.serve.aces, player.serve.attempts),
    srvPct: rateValue(player.serve.successRate),
    srvErrPct: share(player.serve.errors, player.serve.attempts),
    blkPt: pct ? share(player.block.points, player.block.attempts) : player.block.points,
    blkCont: pct ? share(player.block.continuations, player.block.attempts) : player.block.continuations,
    blkTouch: pct ? share(player.block.touches, player.block.attempts) : player.block.touches,
    blkErr: pct ? share(player.block.errors, player.block.attempts) : player.block.errors,
    blkAtt: pct ? "" : player.block.attempts,
    blkEff: rateValue(player.block.efficiency),
    recG: pct ? share(player.reception.good, player.reception.total) : player.reception.good,
    recM: pct ? share(player.reception.medium, player.reception.total) : player.reception.medium,
    recB: pct ? share(player.reception.bad, player.reception.total) : player.reception.bad,
    recE: pct ? share(player.reception.errors, player.reception.total) : player.reception.errors,
    recT: pct ? "" : player.reception.total,
    recAvg: pct ? "" : player.receptionAverage ?? "",
    recPerf: share(player.reception.good, player.reception.total),
    recGoodPct: rateValue(player.reception.positiveRate),
    recBadPct: rateValue(player.reception.negativeRate),
    defG: pct ? share(player.defense.good, player.defense.total) : player.defense.good,
    defM: pct ? share(player.defense.medium, player.defense.total) : player.defense.medium,
    defB: pct ? share(player.defense.bad, player.defense.total) : player.defense.bad,
    defE: pct ? share(player.defense.errors, player.defense.total) : player.defense.errors,
    defT: pct ? "" : player.defense.total,
    defAvg: pct ? "" : player.defenseAverage ?? "",
    defPerf: share(player.defense.good, player.defense.total),
    defGoodPct: rateValue(player.defense.positiveRate),
    defBadPct: rateValue(player.defense.negativeRate),
    errSrv: pct ? share(player.serve.errors, player.errors) : player.serve.errors,
    errAtk: pct ? share(player.attack.errors, player.errors) : player.attack.errors,
    errRec: pct ? share(player.reception.errors, player.errors) : player.reception.errors,
    errDef: pct ? share(player.defense.errors, player.errors) : player.defense.errors,
    errBlk: pct ? share(player.block.errors, player.errors) : player.block.errors,
    errOther: pct ? share(otherErrors, player.errors) : otherErrors,
    blkOut: pct ? "" : player.blockouts,
  };
  const values: ExcelJS.CellValue[] = [];
  for (const [key, col] of Object.entries(COL) as [keyof typeof COL, number][]) {
    values[col - 1] = byCol[key] ?? "";
  }

  const pctCols = new Set<number>([
    COL.atkKill,
    COL.atkEff,
    COL.atkEfi,
    COL.srvAcePct,
    COL.srvPct,
    COL.srvErrPct,
    COL.blkEff,
    COL.recPerf,
    COL.recGoodPct,
    COL.recBadPct,
    COL.defPerf,
    COL.defGoodPct,
    COL.defBadPct,
  ]);
  if (pct) {
    [
      COL.atkPts, COL.atkCont, COL.atkErr,
      COL.srvAce, COL.srvIn, COL.srvErr,
      COL.blkPt, COL.blkCont, COL.blkTouch, COL.blkErr,
      COL.recG, COL.recM, COL.recB, COL.recE,
      COL.defG, COL.defM, COL.defB, COL.defE,
      COL.errSrv, COL.errAtk, COL.errRec, COL.errDef, COL.errBlk, COL.errOther,
    ].forEach((col) => pctCols.add(col));
  }
  const avgCols = new Set<number>([COL.recAvg, COL.defAvg]);

  for (let col = 1; col <= LAST_COL; col += 1) {
    let fill = col === 2 ? nameFill : baseFill;
    let color = text;
    let numFmt: string | undefined;
    const value = values[col - 1];
    if (!isTotal && typeof value === "number") {
      if (col === COL.bal) fill = contributionFill(player.contribution);
      if (col === COL.atkEff) fill = rateFill(player.attack.efficiency);
      if (col === COL.atkEfi) fill = efiFill(atkEfi);
      if (col === COL.recPerf) fill = efiFill(player.reception.goodRate);
      if (col === COL.defPerf) fill = efiFill(player.defense.goodRate);
      if (col >= COL.errSrv && col <= COL.errOther && typeof value === "number" && value > 0) fill = ROSE_SOFT;
      if (col === COL.srvPct) fill = rateFill(player.serve.successRate);
      if (col === COL.blkEff) fill = rateFill(player.block.efficiency);
      if (col === COL.recGoodPct) fill = rateFill(player.reception.positiveRate);
      if (col === COL.recBadPct) {
        fill = rateFill(player.reception.negativeRate === null ? null : 1 - player.reception.negativeRate);
      }
      if (col === COL.defGoodPct) fill = rateFill(player.defense.positiveRate);
      if (col === COL.defBadPct) {
        fill = rateFill(player.defense.negativeRate === null ? null : 1 - player.defense.negativeRate);
      }
      if (col === COL.recAvg) fill = avgFill(player.receptionAverage);
      if (col === COL.defAvg) fill = avgFill(player.defenseAverage);
      if (col === COL.blkOut && player.blockouts > 0) fill = ROSE_SOFT;
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
  for (let col = 8; col <= LAST_COL; col += 1) {
    const label = SUBHEADERS[col - 1] ?? "";
    widths[col] = Math.max(6.5, Math.min(11, label.length + 2));
  }
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
    addDataBars(sheet, firstData, lastData, COL.blkOut, ROSE);
  }
  applyPlayerWidths(sheet);
  return row;
}

function clubMetricRows(report: MatchExcelReport) {
  const club = clubSkills(report);
  return [
    ["Puntos de set", club.setPoints],
    ["Puntos de ataque", club.origins.attack],
    ["Puntos de bloqueo", club.origins.block],
    ["Aces", club.origins.ace],
    ["Puntos por error rival", club.origins.opponentError],
    ["Otros puntos", club.origins.other],
    ["Errores propios", club.ownErrors],
    ["Ataque", attackActionLine(club.attack), "text"],
    ["Eff. ataque", club.attack.efficiency, "pct"],
    ["Saque", serveActionLine(club.serve), "text"],
    ["Acierto saque", club.serve.successRate, "pct"],
    ["Bloqueo", blockActionLine(club.block), "text"],
    ["Eff. bloqueo", club.block.efficiency, "pct"],
    ["Block-outs del rival", club.blockouts],
    ["A quién", blockoutActionDetail(clubPlayers(report)), "text"],
    ["Recepción", receptionActionLine(club.reception), "text"],
    ["% buenas recepción", club.reception.positiveRate, "pct"],
    ["% malas recepción", club.reception.negativeRate, "bad"],
    ["Media recepción (0-3)", club.receptionAverage, "avg"],
    ["Defensa", defenseActionLine(club.defense), "text"],
    ["% buenas defensa", club.defense.positiveRate, "pct"],
    ["% malas defensa", club.defense.negativeRate, "bad"],
    ["Media defensa (0-3)", club.defenseAverage, "avg"],
    ["Puntos recibiendo", club.possession.sideOut.rate, "pct"],
    ["Puntos con el saque", club.possession.breakPoint.rate, "pct"],
  ] as [string, number | string | null, "pct" | "bad" | "avg" | "text" | undefined][];
}

function otherErrorsOf(skills: TeamSkillTotals) {
  return Math.max(
    0,
    skills.ownErrors -
      skills.serve.errors -
      skills.attack.errors -
      skills.reception.errors -
      skills.defense.errors -
      skills.block.errors
  );
}

function ratio(part: number, total: number) {
  return total ? part / total : null;
}

type CompareRow = {
  label: string;
  pick: (skills: TeamSkillTotals) => number | null;
  kind?: "pct" | "bad" | "avg" | "efi";
  section?: string;
};

const COMPARE_ROWS: CompareRow[] = [
  { section: "Puntos", label: "Puntos totales", pick: (s) => s.setPoints },
  { label: "Puntos de ataque", pick: (s) => s.origins.attack },
  { label: "Puntos de bloqueo", pick: (s) => s.origins.block },
  { label: "Aces", pick: (s) => s.origins.ace },
  { label: "Puntos por error del rival", pick: (s) => s.origins.opponentError },
  { label: "Otros puntos", pick: (s) => s.origins.other },
  { section: "Errores propios", label: "Errores propios (total)", pick: (s) => s.ownErrors },
  { label: "Errores de saque", pick: (s) => s.serve.errors },
  { label: "Errores de ataque", pick: (s) => s.attack.errors },
  { label: "Errores de recepción", pick: (s) => s.reception.errors },
  { label: "Errores de defensa", pick: (s) => s.defense.errors },
  { label: "Errores de bloqueo", pick: (s) => s.block.errors },
  { label: "Otros errores", pick: (s) => otherErrorsOf(s) },
  { label: "Block-outs sufridos", pick: (s) => s.blockouts },
  { section: "Ataque", label: "Intentos de ataque", pick: (s) => s.attack.attempts },
  { label: "% Punto en ataque", pick: (s) => ratio(s.attack.kills, s.attack.attempts), kind: "pct" },
  { label: "% Ataque sin error", pick: (s) => s.attack.efficiency, kind: "pct" },
  { label: "Eficiencia de ataque (P−E)/I", pick: (s) => ratio(s.attack.kills - s.attack.errors, s.attack.attempts), kind: "efi" },
  { section: "Saque", label: "Saques", pick: (s) => s.serve.attempts },
  { label: "% Ace", pick: (s) => ratio(s.serve.aces, s.serve.attempts), kind: "efi" },
  { label: "% Saque en juego", pick: (s) => s.serve.successRate, kind: "pct" },
  { label: "% Error de saque", pick: (s) => ratio(s.serve.errors, s.serve.attempts), kind: "bad" },
  { section: "Bloqueo", label: "Acciones de bloqueo", pick: (s) => s.block.attempts },
  { label: "% Bloqueo útil", pick: (s) => s.block.efficiency, kind: "pct" },
  { section: "Recepción", label: "Recepciones", pick: (s) => s.reception.total },
  { label: "% Recepción perfecta", pick: (s) => s.reception.goodRate, kind: "efi" },
  { label: "% Recepción positiva", pick: (s) => s.reception.positiveRate, kind: "pct" },
  { label: "% Recepción negativa", pick: (s) => s.reception.negativeRate, kind: "bad" },
  { label: "Media recepción (0-3)", pick: (s) => s.receptionAverage, kind: "avg" },
  { section: "Defensa", label: "Defensas", pick: (s) => s.defense.total },
  { label: "% Defensa positiva", pick: (s) => s.defense.positiveRate, kind: "pct" },
  { label: "Media defensa (0-3)", pick: (s) => s.defenseAverage, kind: "avg" },
  { section: "Fases de juego", label: "% Puntos recibiendo (side-out)", pick: (s) => s.possession.sideOut.rate, kind: "pct" },
  { label: "% Puntos con el saque (break)", pick: (s) => s.possession.breakPoint.rate, kind: "pct" },
];

function compareCell(sheet: Worksheet, row: number, col: number, value: number | null, kind: CompareRow["kind"], strong = false) {
  const isRate = kind === "pct" || kind === "bad" || kind === "efi";
  paint(sheet, row, col, value === null ? "" : value, {
    fill:
      kind === "pct"
        ? rateFill(value)
        : kind === "bad"
          ? rateFill(value === null ? null : 1 - value)
          : kind === "efi"
            ? efiFill(value)
            : kind === "avg"
              ? avgFill(value)
              : WHITE,
    bold: strong,
    numFmt: isRate ? "0%" : kind === "avg" ? "0.00" : "0",
  });
}

function writeComparison(sheet: Worksheet, report: MatchExcelReport, startRow: number) {
  const club = clubSkills(report);
  const opp = report.clubIsHome ? report.away : report.home;
  let row = startRow;
  paint(sheet, row, 1, `Comparativa · ${report.clubLabel} vs ${report.opponentLabel}`, {
    fill: NAVY,
    color: WHITE,
    bold: true,
    align: "left",
  });
  paint(sheet, row, 2, report.clubLabel, { fill: NAVY, color: ORANGE, bold: true });
  paint(sheet, row, 3, report.opponentLabel, { fill: NAVY, color: WHITE, bold: true });
  paint(sheet, row, 4, "Dif.", { fill: NAVY, color: WHITE, bold: true });
  row += 1;
  for (const item of COMPARE_ROWS) {
    if (item.section) {
      merge(sheet, row, 1, row, 4);
      paint(sheet, row, 1, item.section.toUpperCase(), {
        fill: SLATE_700,
        color: WHITE,
        bold: true,
        size: 9,
        align: "left",
      });
      row += 1;
    }
    const a = item.pick(club);
    const b = item.pick(opp);
    paint(sheet, row, 1, item.label, { fill: SLATE_100, align: "left", bold: true, size: 10 });
    compareCell(sheet, row, 2, a, item.kind, true);
    compareCell(sheet, row, 3, b, item.kind);
    const diff = a === null || b === null ? null : a - b;
    const isRate = item.kind === "pct" || item.kind === "bad" || item.kind === "efi";
    paint(sheet, row, 4, diff === null ? "" : diff, {
      numFmt: isRate ? "+0%;-0%;0%" : item.kind === "avg" ? "+0.00;-0.00;0.00" : "+0;-0;0",
      size: 9,
      color: SLATE_500,
    });
    row += 1;
  }
  return row;
}

function writeResumen(workbook: Workbook, report: MatchExcelReport, charts: ChartPng[]) {
  const sheet = workbook.addWorksheet("Resumen", {
    properties: { tabColor: { argb: ORANGE } },
  });
  setupSheet(sheet, 4, 0);
  sheet.getColumn(1).width = 28;
  for (let col = 2; col <= 12; col += 1) sheet.getColumn(col).width = 14;
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
  paint(sheet, row, 1, `Estadísticas · ${report.clubLabel}`, {
    fill: NAVY,
    color: WHITE,
    bold: true,
    align: "left",
  });
  merge(sheet, row, 1, row, 2);
  paint(sheet, row, 2, "Valor", { fill: NAVY, color: WHITE, bold: true });
  row += 1;
  for (const [label, value, kind] of clubMetricRows(report)) {
    const numeric = typeof value === "number" ? value : null;
    paint(sheet, row, 1, label, { fill: SLATE_100, align: "left", bold: true, size: 10 });
    paint(sheet, row, 2, kind === "pct" || kind === "bad" ? rateValue(numeric) : value ?? "", {
      fill:
        kind === "pct"
          ? rateFill(numeric)
          : kind === "bad"
            ? rateFill(numeric === null ? null : 1 - numeric)
            : WHITE,
      bold: true,
      align: kind === "text" ? "left" : "center",
      numFmt: kind === "pct" || kind === "bad" ? "0%" : kind === "avg" ? "0.0" : undefined,
    });
    if (kind === "text") {
      merge(sheet, row, 2, row, 12);
      sheet.getRow(row).height = 36;
    }
    row += 1;
  }

  row += 1;
  row = writeComparison(sheet, report, row);

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
  setupSheet(sheet, 1, 1);
  sheet.getColumn(1).width = 30;
  for (let col = 2; col <= report.sets.length + 3; col += 1) sheet.getColumn(col).width = 15;

  const clubScore = (set: { home: number; away: number }) =>
    report.clubIsHome ? `${set.home}-${set.away}` : `${set.away}-${set.home}`;
  const headers = [
    `Dato · ${report.clubLabel}`,
    ...report.sets.map((set) => `Set ${set.setNumber} (${clubScore(set)})`),
    `Partido ${report.clubLabel}`,
    `Partido ${report.opponentLabel}`,
  ];
  headers.forEach((label, index) => {
    paint(sheet, 1, index + 1, label, {
      fill: NAVY,
      color: WHITE,
      bold: true,
      size: 10,
      align: index === 0 ? "left" : "center",
    });
  });
  sheet.getRow(1).height = 22;

  const rows: {
    label: string;
    pick: (skills: TeamSkillTotals) => number | null;
    pct?: boolean;
    invert?: boolean;
    avg?: boolean;
  }[] = [
    { label: "Puntos", pick: (s) => s.setPoints },
    { label: "Puntos de ataque", pick: (s) => s.origins.attack },
    { label: "Puntos de bloqueo", pick: (s) => s.origins.block },
    { label: "Aces", pick: (s) => s.origins.ace },
    { label: "Puntos por error rival", pick: (s) => s.origins.opponentError },
    { label: "Errores propios", pick: (s) => s.ownErrors },
    { label: "  · de saque", pick: (s) => s.serve.errors },
    { label: "  · de ataque", pick: (s) => s.attack.errors },
    { label: "  · de recepción", pick: (s) => s.reception.errors },
    { label: "  · de defensa", pick: (s) => s.defense.errors },
    { label: "  · de bloqueo", pick: (s) => s.block.errors },
    { label: "  · otros", pick: (s) => otherErrorsOf(s) },
    { label: "Block-outs sufridos", pick: (s) => s.blockouts },
    { label: "Ataques (intentos)", pick: (s) => s.attack.attempts },
    { label: "% Punto en ataque", pick: (s) => ratio(s.attack.kills, s.attack.attempts), pct: true },
    { label: "% Ataque sin error", pick: (s) => s.attack.efficiency, pct: true },
    { label: "Eficiencia ataque (P−E)/I", pick: (s) => ratio(s.attack.kills - s.attack.errors, s.attack.attempts), pct: true },
    { label: "Saques", pick: (s) => s.serve.attempts },
    { label: "% Saque en juego", pick: (s) => s.serve.successRate, pct: true },
    { label: "% Error de saque", pick: (s) => ratio(s.serve.errors, s.serve.attempts), pct: true, invert: true },
    { label: "Bloqueos (acciones)", pick: (s) => s.block.attempts },
    { label: "% Bloqueo útil", pick: (s) => s.block.efficiency, pct: true },
    { label: "Recepciones", pick: (s) => s.reception.total },
    { label: "% Recepción perfecta", pick: (s) => s.reception.goodRate, pct: true },
    { label: "% Recepción positiva", pick: (s) => s.reception.positiveRate, pct: true },
    { label: "% Recepción negativa", pick: (s) => s.reception.negativeRate, pct: true, invert: true },
    { label: "Media recepción (0-3)", pick: (s) => s.receptionAverage, avg: true },
    { label: "% Defensa positiva", pick: (s) => s.defense.positiveRate, pct: true },
    { label: "% Defensa negativa", pick: (s) => s.defense.negativeRate, pct: true, invert: true },
    { label: "% Puntos recibiendo", pick: (s) => s.possession.sideOut.rate, pct: true },
    { label: "% Puntos con el saque", pick: (s) => s.possession.breakPoint.rate, pct: true },
  ];

  const fmt = (item: (typeof rows)[number]) =>
    item.pct ? "0%" : item.avg ? "0.00" : "0";
  rows.forEach((item, index) => {
    const row = index + 2;
    const zebra = index % 2 === 1 ? SLATE_50 : WHITE;
    paint(sheet, row, 1, item.label, { fill: SLATE_100, align: "left", bold: !item.label.startsWith(" "), size: 10 });
    report.sets.forEach((set, setIndex) => {
      const skills = report.clubIsHome ? set.homeSkills : set.awaySkills;
      const value = item.pick(skills);
      paint(sheet, row, setIndex + 2, value ?? "", {
        numFmt: fmt(item),
        fill: item.pct ? rateFill(item.invert && value !== null ? 1 - value : value) : item.avg ? avgFill(value) : zebra,
      });
    });
    const value = item.pick(clubSkills(report));
    paint(sheet, row, report.sets.length + 2, value ?? "", {
      numFmt: fmt(item),
      fill: NAVY,
      color: WHITE,
      bold: true,
    });
    const oppValue = item.pick(report.clubIsHome ? report.away : report.home);
    paint(sheet, row, report.sets.length + 3, oppValue ?? "", {
      numFmt: fmt(item),
      fill: SLATE_100,
      color: NAVY,
    });
  });
}

function writeSetPlayersSheet(workbook: Workbook, report: MatchExcelReport) {
  const sheet = workbook.addWorksheet("Sets · Jugadores", {
    properties: { tabColor: { argb: SKY } },
  });
  setupSheet(sheet, 0, 3);
  let row = 1;
  for (const set of report.sets) {
    const score = report.clubIsHome ? `${set.home}-${set.away}` : `${set.away}-${set.home}`;
    const won = set.winner === null ? null : (set.winner === "home") === report.clubIsHome;
    merge(sheet, row, 1, row, LAST_COL);
    paint(sheet, row, 1, `SET ${set.setNumber}  ·  ${report.clubLabel} ${score} ${report.opponentLabel}${won === null ? "" : won ? "  ·  GANADO" : "  ·  PERDIDO"}`, {
      fill: won === null ? NAVY : won ? EMERALD : ROSE,
      color: WHITE,
      bold: true,
      size: 11,
      align: "left",
    });
    sheet.getRow(row).height = 22;
    row += 1;
    if (set.clubPlayers.length === 0) {
      merge(sheet, row, 1, row, LAST_COL);
      paint(sheet, row, 1, "Sin acciones individuales apuntadas en este set.", { italic: true, align: "left" });
      row += 2;
      continue;
    }
    row = writePlayerTable(sheet, row, set.clubPlayers) + 2;
  }
  if (report.sets.length === 0) {
    paint(sheet, 1, 1, "Todavía no hay sets jugados.", { italic: true, align: "left" });
  }
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
  const blocks = [{ label: report.clubLabel, rows: clubRotations(report) }];
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
  const actions = report.actions.filter((action) => action.team === report.clubLabel);
  actions.forEach((action, index) => {
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
      fill: action.scoringTeam === report.clubLabel ? EMERALD_SOFT : action.scoringTeam ? ROSE_SOFT : fill,
      align: "left",
    });
  });
  if (actions.length > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: actions.length + 1, column: 7 },
    };
  }
}

function writeGlossarySheet(workbook: Workbook, report: MatchExcelReport) {
  const sheet = workbook.addWorksheet("Leyenda", {
    properties: { tabColor: { argb: SLATE_500 } },
  });
  setupSheet(sheet, 1, 1);
  sheet.getColumn(1).width = 28;
  sheet.getColumn(2).width = 90;
  paint(sheet, 1, 1, "Abreviatura / dato", { fill: NAVY, color: WHITE, bold: true, align: "left" });
  paint(sheet, 1, 2, "Qué significa y cómo se calcula", {
    fill: NAVY,
    color: WHITE,
    bold: true,
    align: "left",
  });
  report.glossary.forEach((item, index) => {
    const row = index + 2;
    paint(sheet, row, 1, item.term, { fill: SLATE_100, bold: true, align: "left" });
    paint(sheet, row, 2, item.meaning, { align: "left" });
    sheet.getRow(row).height = item.meaning.length > 110 ? 44 : 28;
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
  paint(sheet, row, 2, report.clubLabel, { fill: SLATE_700, color: WHITE, bold: true });
  row += 1;
  const club = clubSkills(report);
  const origins: [string, number][] = [
    ["Ataque", club.origins.attack],
    ["Bloqueo", club.origins.block],
    ["Ace", club.origins.ace],
    ["Error rival", club.origins.opponentError],
    ["Otro", club.origins.other],
  ];
  for (const [label, value] of origins) {
    paint(sheet, row, 1, label, { align: "left", fill: SLATE_50 });
    paint(sheet, row, 2, value);
    row += 1;
  }

  row += 2;
  const players = clubPlayers(report);
  paint(sheet, row, 1, `Puntos por jugador · ${report.clubLabel}`, {
    fill: ORANGE,
    color: NAVY,
    bold: true,
    align: "left",
  });
  merge(sheet, row, 1, row, 6);
  row += 1;
  ["Jugador", "Pts", "Err", "Bal", "Eff. ataque", "Block-outs"].forEach((label, index) => {
    paint(sheet, row, index + 1, label, { fill: SLATE_700, color: WHITE, bold: true });
  });
  row += 1;
  const top = [...players].sort((a, b) => b.points - a.points).slice(0, 12);
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
    paint(sheet, row, 6, player.blockouts, {
      fill: player.blockouts > 0 ? ROSE_SOFT : WHITE,
    });
    row += 1;
  }
  if (top.length) addDataBars(sheet, dataStart, row - 1, 2, ORANGE);

  const blocked = [...players]
    .filter((player) => player.blockouts > 0)
    .sort((a, b) => b.blockouts - a.blockouts || a.name.localeCompare(b.name, "es"));
  if (blocked.length > 0) {
    row += 2;
    paint(sheet, row, 1, `Block-outs del rival · ${report.clubLabel}`, {
      fill: ROSE,
      color: WHITE,
      bold: true,
      align: "left",
    });
    merge(sheet, row, 1, row, 3);
    row += 1;
    ["Jugador", "Block-outs"].forEach((label, index) => {
      paint(sheet, row, index + 1, label, { fill: SLATE_700, color: WHITE, bold: true, align: index === 0 ? "left" : "center" });
    });
    row += 1;
    const blockoutStart = row;
    for (const player of blocked) {
      paint(sheet, row, 1, player.name, { align: "left", fill: row % 2 ? WHITE : SLATE_50 });
      paint(sheet, row, 2, player.blockouts, { fill: ROSE_SOFT, bold: true });
      row += 1;
    }
    addDataBars(sheet, blockoutStart, row - 1, 2, ROSE);
  }

  row += 2;
  paint(sheet, row, 1, "Calidad de recepción (buenas y medias / malas y errores)", {
    fill: ORANGE,
    color: NAVY,
    bold: true,
    align: "left",
  });
  merge(sheet, row, 1, row, 7);
  row += 1;
  ["Equipo", "Buena", "Media", "Mala", "Error", "% buenas", "% malas"].forEach((label, index) => {
    paint(sheet, row, index + 1, label, { fill: SLATE_700, color: WHITE, bold: true });
  });
  row += 1;
  paint(sheet, row, 1, report.clubLabel, { align: "left", fill: SLATE_50 });
  paint(sheet, row, 2, club.reception.good, { fill: EMERALD_SOFT });
  paint(sheet, row, 3, club.reception.medium, { fill: AMBER_SOFT });
  paint(sheet, row, 4, club.reception.bad, { fill: ORANGE_SOFT });
  paint(sheet, row, 5, club.reception.errors, { fill: ROSE_SOFT });
  paint(sheet, row, 6, rateValue(club.reception.positiveRate), {
    numFmt: "0%",
    fill: rateFill(club.reception.positiveRate),
  });
  paint(sheet, row, 7, rateValue(club.reception.negativeRate), {
    numFmt: "0%",
    fill: rateFill(club.reception.negativeRate === null ? null : 1 - club.reception.negativeRate),
  });
  row += 1;

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
  const club = clubSkills(report);
  const originChart = groupedBarChart({
    title: `Origen de los puntos · ${report.clubLabel}`,
    categories: ["Ataque", "Bloqueo", "Ace", "Error rival", "Otro"],
    series: [
      {
        label: report.clubLabel,
        values: [
          club.origins.attack,
          club.origins.block,
          club.origins.ace,
          club.origins.opponentError,
          club.origins.other,
        ],
        color: "#0B1F3A",
      },
    ],
  });
  if (originChart) charts.push(originChart);
  const players = clubPlayers(report);
  const top = [...players].filter((player) => player.points > 0).sort((a, b) => b.points - a.points).slice(0, 8);
  if (top.length) {
    const pointsChart = horizontalBarChart({
      title: `Puntos · ${report.clubLabel}`,
      labels: top.map((player) => player.name),
      values: top.map((player) => player.points),
      color: "#F97316",
    });
    if (pointsChart) charts.push(pointsChart);
  }
  const blocked = [...players]
    .filter((player) => player.blockouts > 0)
    .sort((a, b) => b.blockouts - a.blockouts || a.name.localeCompare(b.name, "es"))
    .slice(0, 8);
  if (blocked.length) {
    const blockoutChart = horizontalBarChart({
      title: `Block-outs del rival · ${report.clubLabel}`,
      labels: blocked.map((player) => player.name),
      values: blocked.map((player) => player.blockouts),
      color: "#E11D48",
    });
    if (blockoutChart) charts.push(blockoutChart);
  }
  const recChart = stackedBarChart({
    title: `Calidad de recepción · ${report.clubLabel}`,
    categories: [report.clubLabel],
    series: [
      { label: "Buena", values: [club.reception.good], color: "#059669" },
      { label: "Media", values: [club.reception.medium], color: "#F59E0B" },
      { label: "Mala", values: [club.reception.bad], color: "#FB923C" },
      { label: "Error", values: [club.reception.errors], color: "#E11D48" },
    ],
  });
  if (recChart) charts.push(recChart);

  const rotations = clubRotations(report);
  const activeRots = rotations.filter(
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
  writeTeamPlayersSheet(workbook, report, report.clubIsHome ? "home" : "away");
  writeChartsSheet(workbook, report, charts);
  writeSetsSheet(workbook, report);
  writeSetPlayersSheet(workbook, report);
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
