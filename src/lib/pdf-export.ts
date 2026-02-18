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
