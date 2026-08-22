import ExcelJS from "exceljs";
import { ProcessedDocument } from "../services/extractionService.js";

export async function generateXlsx(documents: ProcessedDocument[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("COI Tracker", {
    views: [{ state: "frozen", ySplit: 1 }] // Frozen header
  });

  sheet.columns = [
    { header: "Source File", key: "filename", width: 25 },
    { header: "Review Needed", key: "review_needed", width: 15 },
    { header: "Subcontractor Name", key: "subcontractor_name", width: 30 },
    { header: "Carrier", key: "carrier", width: 30 },
    { header: "GL Eff Date", key: "gl_eff", width: 15 },
    { header: "GL Exp Date", key: "gl_exp", width: 15 },
    { header: "GL Occurrence", key: "gl_occ", width: 20 },
    { header: "GL Aggregate", key: "gl_agg", width: 20 },
    { header: "WC Eff Date", key: "wc_eff", width: 15 },
    { header: "WC Exp Date", key: "wc_exp", width: 15 },
    { header: "WC Limit", key: "wc_limit", width: 20 },
    { header: "Auto Eff Date", key: "auto_eff", width: 15 },
    { header: "Auto Exp Date", key: "auto_exp", width: 15 },
    { header: "Auto Limit", key: "auto_limit", width: 20 },
    { header: "Notes / Errors", key: "notes", width: 40 },
  ];

  // Formatting Header
  sheet.getRow(1).font = { bold: true };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E0E0' }
  };

  for (const doc of documents) {
    if (!doc.segmentation.is_coi) {
      sheet.addRow({
        filename: doc.filename,
        review_needed: "YES",
        notes: "Document does not appear to be a Certificate of Liability Insurance."
      });
      continue;
    }

    const e = doc.extraction;
    
    // Check if any field requires review
    const anyReview = Object.values(e).some((field: any) => field?.review_required === true);

    const formatValue = (field: any) => {
      if (!field || field.value === null) {
        if (field?.reason_code) return `[${field.reason_code}]`;
        return "";
      }
      return field.value;
    };

    const row = sheet.addRow({
      filename: doc.filename,
      review_needed: anyReview ? "YES" : "NO",
      subcontractor_name: formatValue(e.subcontractor_name),
      carrier: formatValue(e.carrier),
      gl_eff: formatValue(e.gl_effective_date),
      gl_exp: formatValue(e.gl_expiration_date),
      gl_occ: formatValue(e.gl_each_occurrence),
      gl_agg: formatValue(e.gl_aggregate),
      wc_eff: formatValue(e.wc_effective_date),
      wc_exp: formatValue(e.wc_expiration_date),
      wc_limit: formatValue(e.wc_limit),
      auto_eff: formatValue(e.auto_effective_date),
      auto_exp: formatValue(e.auto_expiration_date),
      auto_limit: formatValue(e.auto_limit),
      notes: ""
    });

    // Semantic status highlighting (very simple for MVP)
    if (anyReview) {
      row.getCell('review_needed').font = { color: { argb: 'FFFF0000' }, bold: true };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
