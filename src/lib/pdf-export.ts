import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { STAGE_LABELS, SEGMENT_LABELS, OPENING_TYPE_LABELS } from "@/lib/constants";
import { formatMXN, formatUSD, type FeasibilityInputs, type FeasibilityOutputs } from "@/lib/feasibility";
import { BRAND_STRATEGY_NOTES, LUXURY_PITCH_POINTS } from "@/lib/accor-brands";

// ─── Palette ────────────────────────────────────────────────────────────────
const C = {
  black:   [17,  17,  17]  as [number, number, number],
  gold:    [191, 155,  48]  as [number, number, number],
  white:   [255, 255, 255]  as [number, number, number],
  grey50:  [250, 250, 250]  as [number, number, number],
  grey100: [240, 240, 240]  as [number, number, number],
  grey300: [200, 200, 200]  as [number, number, number],
  grey500: [120, 120, 120]  as [number, number, number],
  grey700: [ 70,  70,  70]  as [number, number, number],
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function setFont(doc: jsPDF, size: number, style: "normal"|"bold"|"italic" = "normal", color = C.black) {
  doc.setFontSize(size);
  doc.setFont("helvetica", style);
  doc.setTextColor(...color);
}

function hRule(doc: jsPDF, y: number, color = C.gold, lw = 0.3) {
  doc.setDrawColor(...color);
  doc.setLineWidth(lw);
  doc.line(14, y, 196, y);
}

function sectionTitle(doc: jsPDF, text: string, y: number): number {
  setFont(doc, 8, "bold", C.gold);
  doc.text(text.toUpperCase(), 14, y);
  hRule(doc, y + 2);
  return y + 8;
}

function kpiBox(doc: jsPDF, x: number, y: number, w: number, h: number, label: string, value: string, sub?: string) {
  doc.setFillColor(...C.grey50);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "F");
  doc.setDrawColor(...C.grey300);
  doc.setLineWidth(0.2);
  doc.roundedRect(x, y, w, h, 1.5, 1.5, "S");
  setFont(doc, 6, "normal", C.grey500);
  doc.text(label.toUpperCase(), x + w / 2, y + 5, { align: "center" });
  setFont(doc, 10.5, "bold", C.black);
  doc.text(value, x + w / 2, y + 12, { align: "center" });
  if (sub) {
    setFont(doc, 6, "normal", C.grey500);
    doc.text(sub, x + w / 2, y + 17, { align: "center" });
  }
}

function addPageFooter(doc: jsPDF, pageNum: number, pageCount: number) {
  const PW = 210;
  doc.setFillColor(...C.black);
  doc.rect(0, 285, PW, 12, "F");
  doc.setFillColor(...C.gold);
  doc.rect(0, 284.5, PW, 0.8, "F");
  setFont(doc, 6, "normal", C.grey300);
  doc.text("AURORA DevOS MX  ·  Accor Development", 14, 292);
  doc.text(`Page ${pageNum} / ${pageCount}`, PW - 14, 292, { align: "right" });
}

// ─── Full Feasibility Analysis PDF ───────────────────────────────────────────
export function generateFeasibilityPDF(
  deal: any,
  inputs: FeasibilityInputs,
  outputs: FeasibilityOutputs,
  brands?: string[]
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const now = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });

  // ── COVER HEADER ────────────────────────────────────────────────────────────
  doc.setFillColor(...C.black);
  doc.rect(0, 0, PW, 52, "F");
  doc.setFillColor(...C.gold);
  doc.rect(0, 52, PW, 1.5, "F");

  setFont(doc, 22, "bold", C.white);
  doc.text("AURORA", 14, 20);
  setFont(doc, 7, "normal", C.gold);
  doc.text("ACCOR DEVELOPMENT PLATFORM  ·  MEXICO", 14, 27);

  setFont(doc, 9, "bold", C.white);
  doc.text("FEASIBILITY ANALYSIS MEMORANDUM", PW - 14, 20, { align: "right" });
  setFont(doc, 6.5, "normal", C.grey300);
  doc.text(`Generated: ${now}`, PW - 14, 27, { align: "right" });
  doc.text("CONFIDENTIAL — For Internal Use Only", PW - 14, 33, { align: "right" });

  setFont(doc, 13, "bold", C.white);
  doc.text(deal.name || "Untitled Deal", 14, 44);
  setFont(doc, 7.5, "normal", C.grey300);
  const subtitle = [deal.city, deal.state].filter(Boolean).join(", ");
  if (subtitle) doc.text(subtitle, 14, 50);

  let y = 62;

  // ── DEAL OVERVIEW ───────────────────────────────────────────────────────────
  y = sectionTitle(doc, "Deal Overview", y);
  autoTable(doc, {
    startY: y,
    body: [
      ["Stage", STAGE_LABELS[deal.stage] || deal.stage || "—", "Segment", SEGMENT_LABELS[deal.segment] || deal.segment || "—"],
      ["Opening Type", OPENING_TYPE_LABELS[deal.opening_type] || deal.opening_type || "—", "Room Count", `${inputs.rooms} keys`],
      ["Qualification Score", deal.score_total ? `${deal.score_total} / 100` : "—", "Location", [deal.city, deal.state].filter(Boolean).join(", ") || "—"],
    ],
    theme: "plain",
    styles: { fontSize: 7.5, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
    columnStyles: {
      0: { fontStyle: "bold", textColor: C.grey700 as any, cellWidth: 38 },
      1: { cellWidth: 55 },
      2: { fontStyle: "bold", textColor: C.grey700 as any, cellWidth: 38 },
      3: { cellWidth: 55 },
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── OPERATING ASSUMPTIONS ───────────────────────────────────────────────────
  y = sectionTitle(doc, "Operating Assumptions", y);
  autoTable(doc, {
    startY: y,
    head: [["Parameter", "Value", "Parameter", "Value"]],
    body: [
      ["ADR (stabilized)", formatMXN(inputs.adr), "ADR (USD)", formatUSD(inputs.adr, inputs.fxRate)],
      ["Stabilized Occupancy", `${(inputs.occupancy * 100).toFixed(0)}%`, "Ramp-up Period", `${inputs.rampUpYears} years`],
      ["F&B Revenue Mix", `${(inputs.fnbRevenuePct * 100).toFixed(0)}%`, "Other Revenue Mix", `${(inputs.otherRevenuePct * 100).toFixed(0)}%`],
      ["GOP Margin", `${(inputs.gopMargin * 100).toFixed(0)}%`, "FX Rate", `${inputs.fxRate} MXN/USD`],
      ["Base Management Fee", `${(inputs.baseFee * 100).toFixed(1)}% of Total Rev.`, "Incentive Fee", `${(inputs.incentiveFee * 100).toFixed(1)}% of GOP`],
      ["CAPEX / Key", formatMXN(inputs.capexPerKey), "FF&E / Key", formatMXN(inputs.ffePerKey)],
    ],
    theme: "plain",
    headStyles: { fillColor: C.grey100 as any, textColor: C.grey700 as any, fontSize: 7, fontStyle: "bold" },
    styles: { fontSize: 7.5, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    columnStyles: {
      0: { fontStyle: "bold", textColor: C.grey700 as any, cellWidth: 45 },
      1: { cellWidth: 48 },
      2: { fontStyle: "bold", textColor: C.grey700 as any, cellWidth: 45 },
      3: { cellWidth: 48 },
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── INVESTMENT SUMMARY KPIs ─────────────────────────────────────────────────
  y = sectionTitle(doc, "Investment Summary", y);
  const totalCapex = outputs.totalCapex;
  const y5noi = outputs.years[4]?.noi ?? 0;
  const yield5 = y5noi > 0 && totalCapex > 0 ? (y5noi / totalCapex * 100).toFixed(1) + "%" : "—";
  const kpiW = 44; const kpiH = 22; const kpiGap = 2; const kpiX0 = 14;
  kpiBox(doc, kpiX0, y, kpiW, kpiH, "Total CAPEX (MXN)", formatMXN(totalCapex));
  kpiBox(doc, kpiX0 + kpiW + kpiGap, y, kpiW, kpiH, "Total CAPEX (USD)", formatUSD(totalCapex, inputs.fxRate));
  kpiBox(doc, kpiX0 + (kpiW + kpiGap) * 2, y, kpiW, kpiH, "Simple Payback", `${outputs.simplePayback} yrs`);
  kpiBox(doc, kpiX0 + (kpiW + kpiGap) * 3, y, kpiW, kpiH, "Y5 NOI Yield", yield5, "vs. Total CAPEX");
  y += kpiH + 10;

  // ── 5-YEAR PROJECTION TABLE ─────────────────────────────────────────────────
  y = sectionTitle(doc, "5-Year P&L Projection (MXN)", y);
  autoTable(doc, {
    startY: y,
    head: [["Year", "Occ%", "Rooms Rev.", "Total Rev.", "GOP", "GOP%", "Mgmt Fees", "NOI"]],
    body: outputs.years.map(yr => [
      `Year ${yr.year}`,
      `${(yr.occupancy * 100).toFixed(0)}%`,
      formatMXN(yr.roomsRevenue),
      formatMXN(yr.totalRevenue),
      formatMXN(yr.gop),
      `${(inputs.gopMargin * 100).toFixed(0)}%`,
      formatMXN(yr.fees),
      formatMXN(yr.noi),
    ]),
    theme: "striped",
    headStyles: { fillColor: C.black as any, textColor: C.white as any, fontSize: 7, fontStyle: "bold" },
    styles: { fontSize: 7, cellPadding: { top: 2, bottom: 2, left: 3, right: 3 } },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 18 },
      1: { cellWidth: 14, halign: "center" },
      2: { cellWidth: 29, halign: "right" },
      3: { cellWidth: 29, halign: "right" },
      4: { cellWidth: 27, halign: "right" },
      5: { cellWidth: 14, halign: "center" },
      6: { cellWidth: 27, halign: "right" },
      7: { cellWidth: 28, halign: "right", fontStyle: "bold" },
    },
    alternateRowStyles: { fillColor: C.grey50 as any },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── SENSITIVITY ANALYSIS (new page if needed) ───────────────────────────────
  if (y > 210) { doc.addPage(); y = 20; }
  y = sectionTitle(doc, "Sensitivity Analysis — Y5 NOI Impact", y);
  const baseNoi5 = outputs.years[4]?.noi ?? 0;
  const occNoi5  = outputs.sensitivities.occDown10[4]?.noi ?? 0;
  const adrNoi5  = outputs.sensitivities.adrDown10[4]?.noi ?? 0;
  const fxNoi5   = outputs.sensitivities.fxShock[4]?.noi ?? 0;
  const pct = (v: number) => baseNoi5 > 0 ? `${((v - baseNoi5) / baseNoi5 * 100).toFixed(1)}%` : "—";

  autoTable(doc, {
    startY: y,
    head: [["Scenario", "Assumption", "Y5 NOI (MXN)", "Y5 NOI (USD)", "Payback", "NOI Δ"]],
    body: [
      ["Base Case", "Stabilized assumptions", formatMXN(baseNoi5), formatUSD(baseNoi5, inputs.fxRate), `${outputs.simplePayback} yrs`, "—"],
      ["Occ −10%", `Occupancy → ${(inputs.occupancy * 0.9 * 100).toFixed(0)}%`, formatMXN(occNoi5), formatUSD(occNoi5, inputs.fxRate), "—", pct(occNoi5)],
      ["ADR −10%", `ADR → ${formatMXN(inputs.adr * 0.9)}`, formatMXN(adrNoi5), formatUSD(adrNoi5, inputs.fxRate), "—", pct(adrNoi5)],
      ["CAPEX +15%", `CAPEX → ${formatMXN(outputs.sensitivities.capexUp15.totalCapex)}`, formatMXN(baseNoi5), "—", `${outputs.sensitivities.capexUp15.simplePayback} yrs`, "—"],
      ["FX +15%", `Rate → ${(inputs.fxRate * 1.15).toFixed(1)} MXN/USD`, formatMXN(fxNoi5), formatUSD(fxNoi5, inputs.fxRate * 1.15), "—", pct(fxNoi5)],
    ],
    theme: "plain",
    headStyles: { fillColor: C.grey100 as any, textColor: C.grey700 as any, fontSize: 7, fontStyle: "bold" },
    styles: { fontSize: 7, cellPadding: { top: 2.5, bottom: 2.5, left: 3, right: 3 } },
    columnStyles: {
      0: { fontStyle: "bold", cellWidth: 22 },
      1: { cellWidth: 54 },
      2: { cellWidth: 30, halign: "right" },
      3: { cellWidth: 30, halign: "right" },
      4: { cellWidth: 20, halign: "center" },
      5: { cellWidth: 16, halign: "center" },
    },
    bodyStyles: { lineColor: C.grey100 as any, lineWidth: 0.1 },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // ── ACCOR BRAND STRATEGY ────────────────────────────────────────────────────
  if (brands && brands.length > 0) {
    if (y > 210) { doc.addPage(); y = 20; }
    y = sectionTitle(doc, "Accor Brand Strategy & Recommendations", y);
    autoTable(doc, {
      startY: y,
      head: [["Brand", "Strategic Rationale", "Status"]],
      body: brands.map(b => [b, BRAND_STRATEGY_NOTES[b] || "—", "✓ Recommended"]),
      theme: "plain",
      headStyles: { fillColor: C.black as any, textColor: C.white as any, fontSize: 7.5, fontStyle: "bold" },
      styles: { fontSize: 7.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
      columnStyles: {
        0: { fontStyle: "bold", cellWidth: 42 },
        1: { cellWidth: 110, textColor: C.grey700 as any },
        2: { cellWidth: 28, halign: "center", fontStyle: "bold" },
      },
      alternateRowStyles: { fillColor: C.grey50 as any },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;

    if (y > 235) { doc.addPage(); y = 20; }
    setFont(doc, 7.5, "bold", C.grey700);
    doc.text("Key Value Propositions for Owner Conversation:", 14, y);
    y += 6;
    LUXURY_PITCH_POINTS.forEach((pt, i) => {
      setFont(doc, 7.5, "normal", C.black);
      doc.text(`${i + 1}.  ${pt}`, 18, y);
      y += 5;
    });
    y += 4;
  }

  // ── DISCLAIMER ──────────────────────────────────────────────────────────────
  if (y > 255) { doc.addPage(); y = 20; }
  doc.setFillColor(...C.grey100);
  doc.rect(14, y, 182, 18, "F");
  setFont(doc, 5.5, "normal", C.grey500);
  const disc = doc.splitTextToSize(
    "This document is prepared by Accor Development and contains forward-looking financial projections based on market assumptions. " +
    "All figures are estimates and subject to change. This memorandum is strictly confidential and intended solely for internal use " +
    "and authorized counterparties. Not for public distribution.",
    176
  );
  doc.text(disc, 17, y + 5);

  // ── FOOTER (all pages) ──────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, pageCount);
  }

  const safeName = (deal.name || "Deal").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${safeName}_Feasibility_Memo.pdf`);
}

// ─── Quick Deal Memo (from DealDetailDrawer) ─────────────────────────────────
export function generateDealPDF(deal: any, tasks: any[], feasibilityOutputs?: any, brands?: string[]) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const now = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric" });

  doc.setFillColor(...C.black);
  doc.rect(0, 0, PW, 40, "F");
  doc.setFillColor(...C.gold);
  doc.rect(0, 40, PW, 1.2, "F");

  setFont(doc, 18, "bold", C.white);
  doc.text("AURORA DevOS MX", 14, 15);
  setFont(doc, 7, "normal", C.gold);
  doc.text("INVESTMENT MEMO  ·  CONFIDENTIAL", 14, 22);
  setFont(doc, 11, "bold", C.white);
  doc.text(deal.name || "Deal", 14, 33);
  setFont(doc, 7, "normal", C.grey300);
  doc.text(now, PW - 14, 33, { align: "right" });

  let y = 52;

  y = sectionTitle(doc, "Deal Summary", y);
  autoTable(doc, {
    startY: y,
    body: [
      ["Location", [deal.city, deal.state].filter(Boolean).join(", ") || "—", "Stage", STAGE_LABELS[deal.stage] || deal.stage || "—"],
      ["Segment", SEGMENT_LABELS[deal.segment] || deal.segment || "—", "Opening", OPENING_TYPE_LABELS[deal.opening_type] || deal.opening_type || "—"],
      ["Score", deal.score_total ? `${deal.score_total}/100` : "—", "Rooms", `${deal.rooms_min || "?"}–${deal.rooms_max || "?"}`],
    ],
    theme: "plain",
    styles: { fontSize: 8, cellPadding: 2.5 },
    columnStyles: {
      0: { fontStyle: "bold", textColor: C.grey700 as any, cellWidth: 36 },
      1: { cellWidth: 55 },
      2: { fontStyle: "bold", textColor: C.grey700 as any, cellWidth: 36 },
      3: { cellWidth: 55 },
    },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  if (brands && brands.length > 0) {
    y = sectionTitle(doc, "Recommended Accor Brands", y);
    autoTable(doc, {
      startY: y,
      head: [["Brand", "Positioning"]],
      body: brands.map(b => [b, BRAND_STRATEGY_NOTES[b] || "—"]),
      theme: "plain",
      headStyles: { fillColor: C.grey100 as any, textColor: C.grey700 as any, fontSize: 7.5, fontStyle: "bold" },
      styles: { fontSize: 7.5, cellPadding: 2.5 },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 48 }, 1: { cellWidth: 130 } },
      alternateRowStyles: { fillColor: C.grey50 as any },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  if (feasibilityOutputs?.years?.length > 0) {
    y = sectionTitle(doc, "Financial Projection (5-Year)", y);
    autoTable(doc, {
      startY: y,
      head: [["Year", "Occ%", "Total Revenue", "GOP", "NOI"]],
      body: feasibilityOutputs.years.map((yr: any) => [
        `Y${yr.year}`,
        `${(yr.occupancy * 100).toFixed(0)}%`,
        formatMXN(yr.totalRevenue),
        formatMXN(yr.gop),
        formatMXN(yr.noi),
      ]),
      theme: "striped",
      headStyles: { fillColor: C.black as any, textColor: C.white as any, fontSize: 7, fontStyle: "bold" },
      styles: { fontSize: 7, cellPadding: 2 },
      alternateRowStyles: { fillColor: C.grey50 as any },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
    setFont(doc, 7, "bold", C.grey700);
    doc.text(`Total CAPEX: ${formatMXN(feasibilityOutputs.totalCapex)}  ·  Payback: ${feasibilityOutputs.simplePayback} years`, 14, y);
    y += 8;
  }

  const pending = (tasks || []).filter(t => t.status !== "done").slice(0, 5);
  if (pending.length > 0) {
    y = sectionTitle(doc, "Next Steps", y);
    autoTable(doc, {
      startY: y,
      head: [["Task", "Due"]],
      body: pending.map(t => [t.title, t.due_date || "—"]),
      theme: "plain",
      headStyles: { fillColor: C.grey100 as any, textColor: C.grey700 as any, fontSize: 7.5, fontStyle: "bold" },
      styles: { fontSize: 7.5, cellPadding: 2 },
      margin: { left: 14, right: 14 },
    });
  }

  doc.setFillColor(...C.black);
  doc.rect(0, 285, PW, 12, "F");
  doc.setFillColor(...C.gold);
  doc.rect(0, 284.5, PW, 0.8, "F");
  setFont(doc, 6, "normal", C.grey300);
  doc.text("AURORA DevOS MX  ·  Accor Development  ·  Confidential", 14, 292);
  doc.text(now, PW - 14, 292, { align: "right" });

  const safeName = (deal.name || "Deal").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${safeName}_Memo.pdf`);
}

// ─── IC Decision Center — Quick Memo (from decision_history only) ─────────────
/**
 * Generates an IC memo PDF directly from decision_history data.
 * No FeasibilityInputs/Outputs required — works standalone from the IC Center.
 */
export function generateICDecisionMemoPDF(decision: any) {
  const deal = decision.deal || {};
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const now = new Date().toLocaleDateString("fr-FR", {
    year: "numeric", month: "long", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  // Normalise hard gates (obj or array)
  const rawHG = decision.hard_gates_json;
  const hardGates: Array<{ name: string; passed: boolean; reason?: string }> =
    Array.isArray(rawHG)
      ? rawHG
      : rawHG && typeof rawHG === "object"
        ? Object.values(rawHG).map((v: any) => ({ name: v?.name ?? "", passed: Boolean(v?.passed), reason: v?.reason }))
        : [];

  const conditions: string[] = Array.isArray(decision.conditions_json) ? decision.conditions_json : [];
  const redFlags: string[] = Array.isArray(decision.red_flags_json) ? decision.red_flags_json : [];

  const icScore: number = decision.ic_score ?? 0;
  const confidence: string = decision.confidence ?? "—";
  const decisionKey: string = decision.decision ?? "no_go";

  const decisionLabel = decisionKey === "go" ? "GO"
    : decisionKey === "go_with_conditions" ? "GO — WITH CONDITIONS"
    : "NO-GO";
  const decisionColor: [number, number, number] = decisionKey === "go" ? [22, 163, 74]
    : decisionKey === "go_with_conditions" ? [202, 138, 4]
    : [220, 38, 38];

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...C.black);
  doc.rect(0, 0, PW, 58, "F");
  doc.setFillColor(...C.gold);
  doc.rect(0, 58, PW, 1.5, "F");

  setFont(doc, 20, "bold", C.white);
  doc.text("AURORA", 14, 17);
  setFont(doc, 6.5, "normal", C.gold);
  doc.text("ACCOR DEVELOPMENT PLATFORM  ·  IC DECISION MEMORANDUM", 14, 24);

  // Decision badge
  doc.setFillColor(...decisionColor);
  doc.roundedRect(PW - 72, 8, 58, 18, 2.5, 2.5, "F");
  setFont(doc, 10, "bold", C.white);
  doc.text(decisionLabel, PW - 43, 18.5, { align: "center" });
  setFont(doc, 6.5, "normal", C.white);
  doc.text(`IC Score: ${icScore} / 100  ·  ${confidence.toUpperCase()}`, PW - 43, 25.5, { align: "center" });

  setFont(doc, 13, "bold", C.white);
  doc.text(deal.name || "Deal", 14, 38);
  setFont(doc, 7.5, "normal", C.grey300);
  const sub = [deal.city, deal.state].filter(Boolean).join(", ");
  if (sub) doc.text(sub, 14, 45);
  setFont(doc, 6.5, "normal", C.grey500);
  const meta = [
    STAGE_LABELS[deal.stage] || deal.stage || "",
    SEGMENT_LABELS[deal.segment] || deal.segment || "",
    deal.rooms_min && deal.rooms_max ? `${deal.rooms_min}–${deal.rooms_max} keys` : "",
  ].filter(Boolean).join("  ·  ");
  if (meta) doc.text(meta, 14, 51);
  setFont(doc, 6, "normal", C.grey500);
  doc.text(`Issued ${now}  ·  CONFIDENTIAL — Internal use only`, PW - 14, 55, { align: "right" });

  let y = 68;

  // ── IC SCORE GAUGE ───────────────────────────────────────────────────────────
  y = sectionTitle(doc, "Résultat de l'Analyse IC", y);

  // Score segments (proportional breakdown 35/25/20/20)
  const scoreSegs = [
    { label: "Brand Écon. (35%)", value: Math.round(icScore * 0.35), max: 35, color: C.gold },
    { label: "Owner Écon. (25%)", value: Math.round(icScore * 0.25), max: 25, color: [59, 130, 246] as [number,number,number] },
    { label: "Localisation (20%)", value: Math.round(icScore * 0.20), max: 20, color: [16, 185, 129] as [number,number,number] },
    { label: "Exécution (20%)", value: Math.round(icScore * 0.20), max: 20, color: [168, 85, 247] as [number,number,number] },
  ];

  autoTable(doc, {
    startY: y,
    head: [["Critère", "Score", "Max", "Barre"]],
    body: scoreSegs.map(s => [s.label, s.value, s.max, ""]),
    theme: "plain",
    headStyles: { fillColor: C.grey100 as any, fontSize: 7, fontStyle: "bold", textColor: C.grey700 as any },
    styles: { fontSize: 7.5, cellPadding: { top: 3, bottom: 3, left: 4, right: 4 } },
    columnStyles: {
      0: { cellWidth: 70 },
      1: { cellWidth: 18, halign: "center", fontStyle: "bold" },
      2: { cellWidth: 14, halign: "center", textColor: C.grey500 as any },
      3: { cellWidth: 80 },
    },
    didDrawCell: (data: any) => {
      if (data.column.index === 3 && data.section === "body") {
        const seg = scoreSegs[data.row.index];
        const barX = data.cell.x + 2;
        const barY = data.cell.y + data.cell.height / 2 - 2;
        const barW = data.cell.width - 4;
        const barH = 4;
        // Background
        doc.setFillColor(230, 230, 230);
        doc.roundedRect(barX, barY, barW, barH, 1, 1, "F");
        // Fill
        const fillW = (seg.value / seg.max) * barW;
        doc.setFillColor(...seg.color);
        doc.roundedRect(barX, barY, fillW, barH, 1, 1, "F");
      }
    },
    bodyStyles: { lineColor: C.grey100 as any, lineWidth: 0.1 },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 5;

  // Total score line
  doc.setFillColor(icScore >= 75 ? 22 : icScore >= 60 ? 202 : 220, icScore >= 75 ? 163 : icScore >= 60 ? 138 : 38, icScore >= 75 ? 74 : icScore >= 60 ? 4 : 38);
  doc.roundedRect(14, y, 182, 8, 1.5, 1.5, "F");
  setFont(doc, 8, "bold", C.white);
  doc.text(`SCORE TOTAL IC : ${icScore} / 100`, PW / 2, y + 5.5, { align: "center" });
  y += 13;

  // Data completeness
  const completeness = Math.round(decision.data_completeness || 0);
  setFont(doc, 7, "normal", C.grey700);
  doc.text(`Data completeness: ${completeness}%`, 14, y);
  // mini bar
  doc.setFillColor(220, 220, 220);
  doc.roundedRect(70, y - 3.5, 100, 4, 1, 1, "F");
  doc.setFillColor(completeness >= 80 ? 22 : completeness >= 60 ? 202 : 220, completeness >= 80 ? 163 : completeness >= 60 ? 138 : 38, completeness >= 80 ? 74 : completeness >= 60 ? 4 : 38);
  doc.roundedRect(70, y - 3.5, completeness, 4, 1, 1, "F");
  y += 10;

  // ── HARD GATES ──────────────────────────────────────────────────────────────
  if (hardGates.length > 0) {
    y = sectionTitle(doc, "Hard Gates IC", y);
    autoTable(doc, {
      startY: y,
      head: [["Critère", "Statut", "Remarque"]],
      body: hardGates.map(g => [g.name, g.passed ? "✓ PASSÉ" : "✗ ÉCHOUÉ", g.reason || ""]),
      theme: "plain",
      headStyles: { fillColor: C.grey100 as any, fontSize: 7, fontStyle: "bold", textColor: C.grey700 as any },
      styles: { fontSize: 7, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 } },
      columnStyles: {
        0: { cellWidth: 75 },
        1: { cellWidth: 22, halign: "center", fontStyle: "bold" },
        2: { cellWidth: 85, textColor: C.grey500 as any },
      },
      bodyStyles: { lineColor: C.grey100 as any, lineWidth: 0.1 },
      didDrawCell: (data: any) => {
        if (data.column.index === 1 && data.section === "body") {
          const passed = hardGates[data.row.index]?.passed;
          doc.setTextColor(...(passed ? [22, 163, 74] : [220, 38, 38]) as [number, number, number]);
        }
      },
      margin: { left: 14, right: 14 },
    });
    y = (doc as any).lastAutoTable.finalY + 8;
  }

  // ── CONDITIONS & RED FLAGS ───────────────────────────────────────────────────
  if (conditions.length > 0 || redFlags.length > 0) {
    if (y > 220) { doc.addPage(); y = 20; }
    const combinedRows: [string, string][] = [
      ...conditions.map(c => ["Condition", c] as [string, string]),
      ...redFlags.map(r => ["🚩 Red Flag", r] as [string, string]),
    ];
    if (combinedRows.length > 0) {
      y = sectionTitle(doc, "Conditions & Red Flags", y);
      autoTable(doc, {
        startY: y,
        head: [["Type", "Détail"]],
        body: combinedRows,
        theme: "plain",
        headStyles: { fillColor: C.grey100 as any, fontSize: 7, fontStyle: "bold", textColor: C.grey700 as any },
        styles: { fontSize: 7, cellPadding: { top: 2.5, bottom: 2.5, left: 4, right: 4 } },
        columnStyles: {
          0: { cellWidth: 30, fontStyle: "bold" },
          1: { cellWidth: 152 },
        },
        bodyStyles: { lineColor: C.grey100 as any, lineWidth: 0.1 },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
  }

  // ── IC NARRATIVE ────────────────────────────────────────────────────────────
  if (decision.narrative_text) {
    if (y > 210) { doc.addPage(); y = 20; }
    y = sectionTitle(doc, "Investment Committee Narrative", y);
    doc.setFillColor(...C.grey50);
    const narrativeLines = doc.splitTextToSize(decision.narrative_text, 170);
    const narrativeH = narrativeLines.length * 4.5 + 8;
    doc.rect(14, y, 182, narrativeH, "F");
    doc.setDrawColor(...C.grey300);
    doc.setLineWidth(0.2);
    doc.rect(14, y, 182, narrativeH, "S");
    // Gold left accent bar
    doc.setFillColor(...C.gold);
    doc.rect(14, y, 1.5, narrativeH, "F");
    setFont(doc, 7.5, "normal", C.black);
    doc.text(narrativeLines, 19, y + 5);
    y += narrativeH + 8;
  }

  // ── RECOMMENDATION BOX ───────────────────────────────────────────────────────
  if (y > 240) { doc.addPage(); y = 20; }
  doc.setFillColor(...decisionColor);
  doc.setDrawColor(...decisionColor);
  doc.setLineWidth(0.3);
  doc.roundedRect(14, y, 182, 18, 2, 2, "F");
  setFont(doc, 9, "bold", C.white);
  doc.text(`IC Recommendation: ${decisionLabel}`, PW / 2, y + 7, { align: "center" });
  setFont(doc, 7, "normal", C.white);
  doc.text(`Score ${icScore}/100  ·  Confidence: ${confidence.toUpperCase()}  ·  Completeness: ${completeness}%`, PW / 2, y + 14, { align: "center" });
  y += 24;

  // ── DISCLAIMER ──────────────────────────────────────────────────────────────
  if (y > 255) { doc.addPage(); y = 20; }
  doc.setFillColor(...C.grey100);
  doc.rect(14, y, 182, 16, "F");
  setFont(doc, 5.5, "normal", C.grey500);
  const disc = doc.splitTextToSize(
    "This memorandum is prepared by Accor Development and contains a preliminary analysis based on available data. " +
    "All projections are estimates subject to revision. Strictly confidential — for internal use by the Investment Committee only.",
    176,
  );
  doc.text(disc, 17, y + 5);

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, pageCount);
  }

  const safeName = (deal.name || "Deal").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${safeName}_IC_Decision_Memo.pdf`);
}

// ─── IC Memo (IC-grade, full version) ────────────────────────────────────────
export function generateICMemo(
  deal: any,
  tasks: any[],
  inputs: FeasibilityInputs,
  outputs: FeasibilityOutputs,
  icDecision?: any,
  brands?: string[],
) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210;
  const now = new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });

  // ── DECISION BADGE ──────────────────────────────────────────────────────────
  const decisionLabel = icDecision?.decision === "go" ? "GO"
    : icDecision?.decision === "go_with_conditions" ? "GO — WITH CONDITIONS"
    : icDecision?.decision === "no_go" ? "NO-GO"
    : "NOT EVALUATED";
  const decisionColor: [number, number, number] = icDecision?.decision === "go" ? [22, 163, 74]
    : icDecision?.decision === "go_with_conditions" ? [202, 138, 4]
    : [220, 38, 38];

  // ── HEADER ──────────────────────────────────────────────────────────────────
  doc.setFillColor(...C.black);
  doc.rect(0, 0, PW, 58, "F");
  doc.setFillColor(...C.gold);
  doc.rect(0, 58, PW, 1.5, "F");

  setFont(doc, 20, "bold", C.white);
  doc.text("AURORA", 14, 17);
  setFont(doc, 6.5, "normal", C.gold);
  doc.text("ACCOR DEVELOPMENT PLATFORM  ·  INVESTMENT COMMITTEE MEMORANDUM", 14, 24);

  // Decision badge (right)
  doc.setFillColor(...decisionColor);
  doc.roundedRect(PW - 68, 10, 54, 14, 2, 2, "F");
  setFont(doc, 9, "bold", C.white);
  doc.text(decisionLabel, PW - 41, 19.5, { align: "center" });
  if (icDecision?.ic_score !== undefined) {
    setFont(doc, 6, "normal", C.white);
    doc.text(`IC Score: ${icDecision.ic_score} / 100  ·  ${icDecision.confidence?.toUpperCase() || ""}`, PW - 41, 25, { align: "center" });
  }

  setFont(doc, 13, "bold", C.white);
  doc.text(deal.name || "Deal", 14, 38);
  setFont(doc, 7.5, "normal", C.grey300);
  const sub = [deal.city, deal.state].filter(Boolean).join(", ");
  if (sub) doc.text(sub, 14, 45);
  setFont(doc, 6.5, "normal", C.grey500);
  doc.text(`${STAGE_LABELS[deal.stage] || ""}  ·  ${SEGMENT_LABELS[deal.segment] || ""}  ·  ${deal.rooms_min || "?"}–${deal.rooms_max || "?"} keys`, 14, 51);
  setFont(doc, 6, "normal", C.grey500);
  doc.text(`Issued ${now}  ·  CONFIDENTIAL — Internal use only`, PW - 14, 55, { align: "right" });

  let y = 68;

  // ── DEAL THESIS ──────────────────────────────────────────────────────────────
  if (brands && brands.length > 0) {
    y = sectionTitle(doc, "Deal Thesis", y);
    const thesis = [
      `Asset ${OPENING_TYPE_LABELS[deal.opening_type] || "new build"} positionné en ${SEGMENT_LABELS[deal.segment] || deal.segment} à ${deal.city}, ${deal.state}.`,
      `Marques recommandées: ${brands.slice(0, 3).join(" / ")}. Potentiel ADR stabilisé: ${formatMXN(inputs.adr)} / ${formatMXN(inputs.adr / inputs.fxRate)} USD.`,
      `NOI Année 5 estimé: ${formatMXN(outputs.years[4]?.noi || 0)} — Payback: ${outputs.simplePayback} ans — YoC: ${((outputs.years[4]?.noi || 0) / outputs.totalCapex * 100).toFixed(1)}%.`,
    ];
    thesis.forEach((line, i) => {
      if (i === 0) doc.setFillColor(...C.gold); else doc.setFillColor(...C.grey300);
      doc.circle(17, y - 1, 1, "F");
      setFont(doc, 7.5, "normal", C.black);
      const split = doc.splitTextToSize(line, 170);
      doc.text(split, 21, y);
      y += split.length * 5;
    });
    y += 4;
  }

  // ── KEY KPIs GRID ────────────────────────────────────────────────────────────
  y = sectionTitle(doc, "Key KPIs", y);
  const y5 = outputs.years[4];
  const totalCapex = outputs.totalCapex;
  const yoc = y5 && totalCapex > 0 ? (y5.noi / totalCapex * 100).toFixed(1) + "%" : "—";
  const revPar = y5 ? formatMXN(y5.roomsRevenue / (inputs.rooms * 365)) : "—";

  const kpiW = 30; const kpiH = 20; const kpiGap = 1.5; const kpiX0 = 14;
  const kpis: [string, string, string?][] = [
    ["Rooms", `${inputs.rooms}`, "keys"],
    ["ADR", formatMXN(inputs.adr), "MXN"],
    ["Occ.", `${(inputs.occupancy * 100).toFixed(0)}%`, "stabilisée"],
    ["RevPAR", revPar, "MXN"],
    ["GOP%", `${(inputs.gopMargin * 100).toFixed(0)}%`, "marge"],
    ["NOI Y5", formatMXN(y5?.noi || 0), "MXN"],
  ];
  kpis.forEach((k, i) => kpiBox(doc, kpiX0 + i * (kpiW + kpiGap), y, kpiW, kpiH, k[0], k[1], k[2]));
  y += kpiH + 3;

  const kpis2: [string, string, string?][] = [
    ["CAPEX/Key", formatMXN(inputs.capexPerKey), "MXN"],
    ["CAPEX Total", formatMXN(totalCapex), "MXN"],
    ["Fees Bruts", formatMXN(y5?.fees || 0), "MXN/an"],
    ["YoC", yoc, "vs CAPEX"],
    ["Payback", `${outputs.simplePayback} ans`, "simple"],
    ["IC Score", `${icDecision?.ic_score ?? "—"}`, "/100"],
  ];
  kpis2.forEach((k, i) => kpiBox(doc, kpiX0 + i * (kpiW + kpiGap), y, kpiW, kpiH, k[0], k[1], k[2]));
  y += kpiH + 8;

  // ── IC DECISION SECTION ──────────────────────────────────────────────────────
  if (icDecision) {
    y = sectionTitle(doc, "Recommandation IC", y);

    // Hard Gates
    const hg = (icDecision.hard_gates_json || []) as any[];
    if (hg.length > 0) {
      autoTable(doc, {
        startY: y,
        head: [["Gate", "Statut"]],
        body: hg.map((g: any) => [g.name, g.passed ? "✓ PASSÉ" : "✗ ÉCHOUÉ"]),
        theme: "plain",
        headStyles: { fillColor: C.grey100 as any, fontSize: 7, fontStyle: "bold", textColor: C.grey700 as any },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { cellWidth: 130 },
          1: { cellWidth: 46, halign: "center", fontStyle: "bold" },
        },
        bodyStyles: { lineColor: C.grey100 as any, lineWidth: 0.1 },
        didDrawCell: (data: any) => {
          if (data.column.index === 1 && data.row.raw[1]?.includes("ÉCHOUÉ")) {
            doc.setTextColor(...([220, 38, 38] as [number, number, number]));
          }
        },
        margin: { left: 14, right: 14 },
      });
      y = (doc as any).lastAutoTable.finalY + 5;
    }

    // Conditions
    const conditions = (icDecision.conditions_json || []) as string[];
    if (conditions.length > 0) {
      setFont(doc, 7.5, "bold", C.grey700);
      doc.text("Conditions de GO :", 14, y); y += 5;
      conditions.forEach((c: string) => {
        setFont(doc, 7, "normal", C.black);
        const lines = doc.splitTextToSize(`→  ${c}`, 176);
        doc.text(lines, 16, y);
        y += lines.length * 4.5;
      });
      y += 3;
    }

    // Red flags
    const redFlags = (icDecision.red_flags_json || []) as string[];
    if (redFlags.length > 0) {
      setFont(doc, 7.5, "bold", C.grey700);
      doc.text("Red Flags :", 14, y); y += 5;
      redFlags.slice(0, 3).forEach((rf: string) => {
        doc.setTextColor(220, 38, 38);
        setFont(doc, 7, "normal", [220, 38, 38] as any);
        const lines = doc.splitTextToSize(`⚠  ${rf}`, 176);
        doc.text(lines, 16, y);
        y += lines.length * 4.5;
      });
      y += 3;
    }
  }

  // ── SENSITIVITIES MINI TABLE ──────────────────────────────────────────────────
  if (y > 210) { doc.addPage(); y = 20; }
  y = sectionTitle(doc, "Analyse de Sensibilité", y);
  const baseNoi = outputs.years[4]?.noi || 0;
  autoTable(doc, {
    startY: y,
    head: [["Scénario", "NOI Y5 (MXN)", "NOI Y5 (USD)", "Variation"]],
    body: [
      ["Base", formatMXN(baseNoi), formatUSD(baseNoi, inputs.fxRate), "—"],
      ["Occ. −10%", formatMXN(outputs.sensitivities.occDown10[4]?.noi || 0), formatUSD(outputs.sensitivities.occDown10[4]?.noi || 0, inputs.fxRate),
        baseNoi > 0 ? `${(((outputs.sensitivities.occDown10[4]?.noi || 0) - baseNoi) / baseNoi * 100).toFixed(1)}%` : "—"],
      ["ADR −10%", formatMXN(outputs.sensitivities.adrDown10[4]?.noi || 0), formatUSD(outputs.sensitivities.adrDown10[4]?.noi || 0, inputs.fxRate),
        baseNoi > 0 ? `${(((outputs.sensitivities.adrDown10[4]?.noi || 0) - baseNoi) / baseNoi * 100).toFixed(1)}%` : "—"],
      ["FX +15%", formatMXN(outputs.sensitivities.fxShock[4]?.noi || 0), formatUSD(outputs.sensitivities.fxShock[4]?.noi || 0, inputs.fxRate * 1.15),
        baseNoi > 0 ? `${(((outputs.sensitivities.fxShock[4]?.noi || 0) - baseNoi) / baseNoi * 100).toFixed(1)}%` : "—"],
      ["CAPEX +15%", formatMXN(baseNoi), "—", `Payback → ${outputs.sensitivities.capexUp15.simplePayback} ans`],
    ],
    theme: "striped",
    headStyles: { fillColor: C.black as any, textColor: C.white as any, fontSize: 7, fontStyle: "bold" },
    styles: { fontSize: 7, cellPadding: 2 },
    alternateRowStyles: { fillColor: C.grey50 as any },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 30 }, 3: { halign: "center", cellWidth: 28 } },
    margin: { left: 14, right: 14 },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // ── NEXT ACTIONS ──────────────────────────────────────────────────────────────
  const pending = (tasks || []).filter(t => t.status !== "done").slice(0, 3);
  if (pending.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    y = sectionTitle(doc, "Prochaines Actions", y);
    pending.forEach((t, i) => {
      setFont(doc, 7.5, "normal", C.black);
      doc.text(`${i + 1}.  ${t.title}${t.due_date ? `  (échéance: ${new Date(t.due_date).toLocaleDateString("fr-FR")})` : ""}`, 16, y);
      y += 5.5;
    });
    y += 4;
  }

  // ── DISCLAIMER ──────────────────────────────────────────────────────────────
  if (y > 255) { doc.addPage(); y = 20; }
  doc.setFillColor(...C.grey100);
  doc.rect(14, y, 182, 16, "F");
  setFont(doc, 5.5, "normal", C.grey500);
  const disc = doc.splitTextToSize(
    "This memorandum is prepared by Accor Development and contains forward-looking financial projections based on market assumptions. " +
    "All data are estimates subject to revision. Confidential — for internal use only.",
    176
  );
  doc.text(disc, 17, y + 5);

  // ── FOOTER ──────────────────────────────────────────────────────────────────
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    addPageFooter(doc, i, pageCount);
  }

  const safeName = (deal.name || "Deal").replace(/[^a-zA-Z0-9]/g, "_");
  doc.save(`${safeName}_IC_Memo.pdf`);
}


