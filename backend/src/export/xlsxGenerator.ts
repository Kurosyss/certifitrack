import ExcelJS from "exceljs";
import { ProcessedDocument } from "../services/extractionService.js";

export async function generateXlsx(documents: ProcessedDocument[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "CertifiTrack Document Intelligence";
  workbook.lastModifiedBy = "CertifiTrack";
  workbook.created = new Date();
  workbook.modified = new Date();

  const sheet = workbook.addWorksheet("COI Tracker", {
    views: [{ state: "frozen", ySplit: 5, activeCell: "A6" }], // Freeze top 5 rows (Title + Metadata + Group + Subheaders)
    pageSetup: {
      orientation: "landscape",
      paperSize: 9, // A4
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
      showGridLines: true,
    }
  });

  // Column width definitions (28 standard fields)
  sheet.columns = [
    { key: "filename", width: 26 },       // A: Source File
    { key: "named_insured", width: 34 },   // B: Named Insured
    { key: "review_needed", width: 18 },   // C: Compliance State
    { key: "gl_policy", width: 18 },       // D: GL Policy #
    { key: "gl_carrier", width: 32 },      // E: GL Carrier
    { key: "gl_eff", width: 14 },          // F: GL Effective
    { key: "gl_exp", width: 14 },          // G: GL Expiration
    { key: "gl_occ", width: 22 },          // H: GL Each Occurrence
    { key: "gl_agg", width: 22 },          // I: GL General Aggregate
    { key: "auto_policy", width: 18 },     // J: Auto Policy #
    { key: "auto_carrier", width: 30 },    // K: Auto Carrier
    { key: "auto_eff", width: 14 },        // L: Auto Effective
    { key: "auto_exp", width: 14 },        // M: Auto Expiration
    { key: "auto_limit", width: 22 },      // N: Auto Combined Single Limit
    { key: "wc_policy", width: 18 },       // O: WC Policy #
    { key: "wc_carrier", width: 30 },      // P: WC Carrier
    { key: "wc_eff", width: 14 },          // Q: WC Effective
    { key: "wc_exp", width: 14 },          // R: WC Expiration
    { key: "wc_limit", width: 22 },        // S: WC Accident Limit
    { key: "umbrella_policy", width: 18 }, // T: Umbrella Policy #
    { key: "umbrella_carrier", width: 30 },// U: Umbrella Carrier
    { key: "umbrella_eff", width: 14 },    // V: Umbrella Effective
    { key: "umbrella_exp", width: 14 },    // W: Umbrella Expiration
    { key: "umbrella_limit", width: 22 },  // X: Umbrella Occurrence Limit
    { key: "addl_insd", width: 18 },       // Y: Additional Insured
    { key: "subr_wvd", width: 20 },        // Z: Waiver of Subrogation
    { key: "project", width: 42 },         // AA: Project / Operations
    { key: "holder", width: 34 },          // AB: Certificate Holder
  ];

  // ==========================================
  // ROW 1: TITLE BANNER
  // ==========================================
  const titleRow = sheet.getRow(1);
  titleRow.height = 30;
  sheet.mergeCells("A1:AB1");
  const titleCell = sheet.getCell("A1");
  titleCell.value = "CertifiTrack — Certificate of Insurance (COI) Extraction Report";
  titleCell.font = { name: "Calibri", size: 14, bold: true, color: { argb: "FFFFFFFF" } };
  titleCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF18181B" } // Dark Charcoal #18181B
  };
  titleCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  // ==========================================
  // ROW 2: REPORT METADATA
  // ==========================================
  const metaRow = sheet.getRow(2);
  metaRow.height = 20;
  sheet.mergeCells("A2:AB2");
  const metaCell = sheet.getCell("A2");
  const isoDate = new Date().toISOString().split("T")[0];
  const totalDocs = documents.length;
  const verifiedCount = documents.filter(d => d.segmentation.is_coi && !Object.values(d.extraction).some((f: any) => f?.review_required)).length;
  metaCell.value = `Generated: ${isoDate}  |  Processed Documents: ${totalDocs}  |  Verified Certificates: ${verifiedCount}  |  Report Schema: V4 Isolated Deterministic`;
  metaCell.font = { name: "Calibri", size: 9.5, italic: true, color: { argb: "FF71717A" } };
  metaCell.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFF4F4F5" }
  };
  metaCell.alignment = { vertical: "middle", horizontal: "left", indent: 1 };

  // ==========================================
  // ROW 3: SPACER ROW
  // ==========================================
  const spacerRow = sheet.getRow(3);
  spacerRow.height = 6;

  // ==========================================
  // ROW 4: GROUPED HEADER CATEGORIES
  // ==========================================
  const groupRow = sheet.getRow(4);
  groupRow.height = 22;

  const groups = [
    { start: "A", end: "C", title: "CERTIFICATE IDENTITY", bg: "FF27272A" },
    { start: "D", end: "I", title: "COMMERCIAL GENERAL LIABILITY", bg: "FF1E293B" },
    { start: "J", end: "N", title: "AUTOMOBILE LIABILITY", bg: "FF334155" },
    { start: "O", end: "S", title: "WORKERS' COMPENSATION", bg: "FF1E293B" },
    { start: "T", end: "X", title: "UMBRELLA / EXCESS LIABILITY", bg: "FF334155" },
    { start: "Y", end: "AB", title: "COMPLIANCE & ENDORSEMENTS", bg: "FF27272A" },
  ];

  for (const grp of groups) {
    sheet.mergeCells(`${grp.start}4:${grp.end}4`);
    const cell = sheet.getCell(`${grp.start}4`);
    cell.value = grp.title;
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: grp.bg }
    };
    cell.alignment = { vertical: "middle", horizontal: "center" };
  }

  // ==========================================
  // ROW 5: DETAILED COLUMN SUBHEADERS
  // ==========================================
  const headerRow = sheet.getRow(5);
  headerRow.height = 24;

  const fieldHeaders = [
    "Source File",
    "Named Insured",
    "Compliance State",
    "GL Policy #",
    "GL Carrier",
    "GL Effective",
    "GL Expiration",
    "Each Occurrence Limit",
    "General Aggregate Limit",
    "Auto Policy #",
    "Auto Carrier",
    "Auto Effective",
    "Auto Expiration",
    "Combined Single Limit (CSL)",
    "WC Policy #",
    "WC Carrier",
    "WC Effective",
    "WC Expiration",
    "Accident / Statutory Limit",
    "Umbrella Policy #",
    "Umbrella Carrier",
    "Umbrella Effective",
    "Umbrella Expiration",
    "Occurrence Limit",
    "Additional Insured",
    "Waiver of Subrogation",
    "Project / Operations",
    "Certificate Holder",
  ];

  for (let c = 0; c < fieldHeaders.length; c++) {
    const colLetter = String.fromCharCode(65 + (c < 26 ? c : 0));
    const cell = headerRow.getCell(c + 1);
    cell.value = fieldHeaders[c];
    cell.font = { name: "Calibri", size: 10, bold: true, color: { argb: "FF18181B" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE4E4E7" }
    };
    cell.alignment = { vertical: "middle", horizontal: c === 7 || c === 8 || c === 13 || c === 18 || c === 23 ? "right" : "left", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: "FFD4D4D8" } },
      bottom: { style: "medium", color: { argb: "FF71717A" } },
      left: { style: "thin", color: { argb: "FFD4D4D8" } },
      right: { style: "thin", color: { argb: "FFD4D4D8" } }
    };
  }

  // Enable AutoFilter on header row
  sheet.autoFilter = "A5:AB5";

  // Helper to format values cleanly
  const formatText = (field: any): string => {
    if (!field || field.value === null || field.value === undefined) {
      if (field?.reason_code && field.reason_code !== 'MISSING_FIELD') {
        return `[${field.reason_code}]`;
      }
      return "—";
    }
    if (typeof field.value === "boolean") {
      return field.value ? "YES" : "NO";
    }
    const str = String(field.value).trim();
    return str.length > 0 ? str : "—";
  };

  const formatNumber = (field: any): number | string => {
    if (typeof field?.value === "number") {
      return field.value;
    }
    if (typeof field === "number") {
      return field;
    }
    const str = formatText(field);
    const cleaned = str.replace(/[^0-9.]/g, "");
    const num = parseFloat(cleaned);
    return isNaN(num) || num <= 0 ? "—" : num;
  };

  // ==========================================
  // DATA ROWS (Starting Row 6)
  // ==========================================
  let currentRowIdx = 6;

  for (const doc of documents) {
    if (!doc.segmentation.is_coi) {
      const row = sheet.getRow(currentRowIdx);
      row.height = 22;
      row.getCell(1).value = doc.filename;
      row.getCell(2).value = "[Non-COI Document]";
      row.getCell(3).value = "NON-COI REJECTED";
      row.getCell(3).font = { color: { argb: "FFB91C1C" }, bold: true };
      row.getCell(27).value = "Document does not appear to be a Certificate of Liability Insurance.";
      
      for (let c = 1; c <= 28; c++) {
        const cell = row.getCell(c);
        if (!cell.value) cell.value = "—";
        cell.border = {
          bottom: { style: "thin", color: { argb: "FFE4E4E7" } },
          left: { style: "thin", color: { argb: "FFE4E4E7" } },
          right: { style: "thin", color: { argb: "FFE4E4E7" } }
        };
      }
      currentRowIdx++;
      continue;
    }

    const e = doc.extraction;
    const anyReview = Object.values(e).some((field: any) => field?.review_required === true);

    const row = sheet.getRow(currentRowIdx);
    row.height = 24;

    const isEven = currentRowIdx % 2 === 0;
    const rowBg = isEven ? "FFFFFFFF" : "FFFBFBFA"; // Subtle alternating zebra stripe

    // 1: Source File
    row.getCell(1).value = doc.filename;
    // 2: Named Insured
    row.getCell(2).value = formatText(e.named_insured);
    // 3: Compliance State
    const stateCell = row.getCell(3);
    stateCell.value = anyReview ? "ACTION REQUIRED" : "VERIFIED";
    stateCell.font = { 
      name: "Calibri", 
      size: 10, 
      bold: true, 
      color: { argb: anyReview ? "FFB45309" : "FF15803D" } 
    };

    // General Liability
    row.getCell(4).value = formatText(e.gl_policy_number);
    row.getCell(5).value = formatText(e.gl_carrier_name);
    row.getCell(6).value = formatText(e.gl_effective_date);
    row.getCell(7).value = formatText(e.gl_expiration_date);
    
    const glOccVal = formatNumber(e.gl_each_occurrence_limit);
    const glOccCell = row.getCell(8);
    glOccCell.value = glOccVal;
    if (typeof glOccVal === "number") glOccCell.numFmt = "$#,##0";

    const glAggVal = formatNumber(e.gl_general_aggregate_limit);
    const glAggCell = row.getCell(9);
    glAggCell.value = glAggVal;
    if (typeof glAggVal === "number") glAggCell.numFmt = "$#,##0";

    // Auto Liability
    row.getCell(10).value = formatText(e.auto_policy_number);
    row.getCell(11).value = formatText(e.auto_carrier_name);
    row.getCell(12).value = formatText(e.auto_effective_date);
    row.getCell(13).value = formatText(e.auto_expiration_date);

    const autoLimVal = formatNumber(e.auto_combined_single_limit);
    const autoLimCell = row.getCell(14);
    autoLimCell.value = autoLimVal;
    if (typeof autoLimVal === "number") autoLimCell.numFmt = "$#,##0";

    // Workers Comp
    row.getCell(15).value = formatText(e.wc_policy_number);
    row.getCell(16).value = formatText(e.wc_carrier_name);
    row.getCell(17).value = formatText(e.wc_effective_date);
    row.getCell(18).value = formatText(e.wc_expiration_date);

    const wcLimVal = formatNumber(e.wc_each_accident_limit);
    const wcLimCell = row.getCell(19);
    wcLimCell.value = wcLimVal;
    if (typeof wcLimVal === "number") wcLimCell.numFmt = "$#,##0";

    // Umbrella / Excess
    row.getCell(20).value = formatText(e.umbrella_policy_number);
    row.getCell(21).value = formatText(e.umbrella_carrier_name);
    row.getCell(22).value = formatText(e.umbrella_effective_date);
    row.getCell(23).value = formatText(e.umbrella_expiration_date);

    const umbLimVal = formatNumber(e.umbrella_each_occurrence_limit);
    const umbLimCell = row.getCell(24);
    umbLimCell.value = umbLimVal;
    if (typeof umbLimVal === "number") umbLimCell.numFmt = "$#,##0";

    // Compliance & Endorsements
    const addlCell = row.getCell(25);
    addlCell.value = formatText(e.additional_insured_indicated);
    if (addlCell.value === "YES") addlCell.font = { bold: true, color: { argb: "FF15803D" } };

    const subrCell = row.getCell(26);
    subrCell.value = formatText(e.waiver_of_subrogation_indicated);
    if (subrCell.value === "YES") subrCell.font = { bold: true, color: { argb: "FF15803D" } };

    row.getCell(27).value = formatText(e.description_of_operations);
    row.getCell(28).value = formatText(e.certificate_holder);

    // Apply clean styling, borders, and alignments across all 28 columns in the row
    for (let c = 1; c <= 28; c++) {
      const cell = row.getCell(c);
      if (!cell.font) {
        cell.font = { name: "Calibri", size: 10, color: { argb: "FF18181B" } };
      }
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: rowBg }
      };
      cell.border = {
        bottom: { style: "thin", color: { argb: "FFE4E4E7" } },
        left: { style: "thin", color: { argb: "FFE4E4E7" } },
        right: { style: "thin", color: { argb: "FFE4E4E7" } }
      };

      const isRightAligned = c === 8 || c === 9 || c === 14 || c === 19 || c === 24;
      const isCenterAligned = c === 3 || c === 6 || c === 7 || c === 12 || c === 13 || c === 17 || c === 18 || c === 22 || c === 23 || c === 25 || c === 26;
      cell.alignment = {
        vertical: "middle",
        horizontal: isRightAligned ? "right" : isCenterAligned ? "center" : "left",
        wrapText: c === 2 || c === 5 || c === 11 || c === 16 || c === 21 || c === 27 || c === 28
      };
    }

    currentRowIdx++;
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
