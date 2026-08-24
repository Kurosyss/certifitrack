import ExcelJS from "exceljs";
import { ProcessedDocument } from "../services/ExtractionService.js";

export async function generateXlsx(documents: ProcessedDocument[]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("COI Tracker", {
    views: [{ state: "frozen", ySplit: 1 }] // Frozen header
  });

  sheet.columns = [
    { header: "Source File", key: "filename", width: 25 },
    { header: "Named Insured", key: "named_insured", width: 30 },
    { header: "Compliance / Review", key: "review_needed", width: 20 },
    { header: "GL Policy #", key: "gl_policy", width: 18 },
    { header: "GL Carrier", key: "gl_carrier", width: 28 },
    { header: "GL Eff Date", key: "gl_eff", width: 14 },
    { header: "GL Exp Date", key: "gl_exp", width: 14 },
    { header: "GL Each Occurrence", key: "gl_occ", width: 20 },
    { header: "GL Aggregate", key: "gl_agg", width: 20 },
    { header: "Auto Policy #", key: "auto_policy", width: 18 },
    { header: "Auto Carrier", key: "auto_carrier", width: 28 },
    { header: "Auto Eff Date", key: "auto_eff", width: 14 },
    { header: "Auto Exp Date", key: "auto_exp", width: 14 },
    { header: "Auto Limit (CSL)", key: "auto_limit", width: 18 },
    { header: "WC Policy #", key: "wc_policy", width: 18 },
    { header: "WC Carrier", key: "wc_carrier", width: 28 },
    { header: "WC Eff Date", key: "wc_eff", width: 14 },
    { header: "WC Exp Date", key: "wc_exp", width: 14 },
    { header: "WC Limit", key: "wc_limit", width: 18 },
    { header: "Umbrella Policy #", key: "umbrella_policy", width: 18 },
    { header: "Umbrella Carrier", key: "umbrella_carrier", width: 28 },
    { header: "Umbrella Eff Date", key: "umbrella_eff", width: 14 },
    { header: "Umbrella Exp Date", key: "umbrella_exp", width: 14 },
    { header: "Umbrella Occurrence", key: "umbrella_limit", width: 20 },
    { header: "Additional Insured", key: "addl_insd", width: 18 },
    { header: "Waiver of Subrogation", key: "subr_wvd", width: 20 },
    { header: "Project / Operations", key: "project", width: 35 },
    { header: "Certificate Holder", key: "holder", width: 30 },
  ];

  // Header styling
  const headerRow = sheet.getRow(1);
  headerRow.font = { bold: true, color: { argb: "FF09090B" } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF4F4F5' }
  };
  headerRow.height = 24;

  for (const doc of documents) {
    if (!doc.segmentation.is_coi) {
      sheet.addRow({
        filename: doc.filename,
        named_insured: "[Non-COI Document]",
        review_needed: "REVIEW: NON-COI",
        project: "Document does not appear to be a Certificate of Liability Insurance."
      });
      continue;
    }

    const e = doc.extraction;
    
    // Check if any critical field requires review
    const anyReview = Object.values(e).some((field: any) => field?.review_required === true);

    const formatVal = (field: any) => {
      if (!field || field.value === null || field.value === undefined) {
        if (field?.reason_code && field.reason_code !== 'MISSING_FIELD') {
          return `[${field.reason_code}]`;
        }
        return "";
      }
      if (typeof field.value === "boolean") {
        return field.value ? "YES" : "NO";
      }
      return field.value;
    };

    const row = sheet.addRow({
      filename: doc.filename,
      named_insured: formatVal(e.named_insured),
      review_needed: anyReview ? "ACTION REQUIRED" : "VERIFIED",
      gl_policy: formatVal(e.gl_policy_number),
      gl_carrier: formatVal(e.gl_carrier_name),
      gl_eff: formatVal(e.gl_effective_date),
      gl_exp: formatVal(e.gl_expiration_date),
      gl_occ: typeof e.gl_each_occurrence_limit?.value === "number" ? e.gl_each_occurrence_limit.value : formatVal(e.gl_each_occurrence_limit),
      gl_agg: typeof e.gl_general_aggregate_limit?.value === "number" ? e.gl_general_aggregate_limit.value : formatVal(e.gl_general_aggregate_limit),
      auto_policy: formatVal(e.auto_policy_number),
      auto_carrier: formatVal(e.auto_carrier_name),
      auto_eff: formatVal(e.auto_effective_date),
      auto_exp: formatVal(e.auto_expiration_date),
      auto_limit: typeof e.auto_combined_single_limit?.value === "number" ? e.auto_combined_single_limit.value : formatVal(e.auto_combined_single_limit),
      wc_policy: formatVal(e.wc_policy_number),
      wc_carrier: formatVal(e.wc_carrier_name),
      wc_eff: formatVal(e.wc_effective_date),
      wc_exp: formatVal(e.wc_expiration_date),
      wc_limit: typeof e.wc_each_accident_limit?.value === "number" ? e.wc_each_accident_limit.value : formatVal(e.wc_each_accident_limit),
      umbrella_policy: formatVal(e.umbrella_policy_number),
      umbrella_carrier: formatVal(e.umbrella_carrier_name),
      umbrella_eff: formatVal(e.umbrella_effective_date),
      umbrella_exp: formatVal(e.umbrella_expiration_date),
      umbrella_limit: typeof e.umbrella_each_occurrence_limit?.value === "number" ? e.umbrella_each_occurrence_limit.value : formatVal(e.umbrella_each_occurrence_limit),
      addl_insd: formatVal(e.additional_insured_indicated),
      subr_wvd: formatVal(e.waiver_of_subrogation_indicated),
      project: formatVal(e.description_of_operations),
      holder: formatVal(e.certificate_holder),
    });

    if (anyReview) {
      row.getCell('review_needed').font = { color: { argb: 'FFB91C1C' }, bold: true };
    } else {
      row.getCell('review_needed').font = { color: { argb: 'FF15803D' }, bold: true };
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(buffer);
}
