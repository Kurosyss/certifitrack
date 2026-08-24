const fs = require('fs');
const path = require('path');

function createPdf(lines) {
  let streamContent = 'BT\n/F1 10 Tf\n50 720 Td\n';
  lines.forEach((line, i) => {
    if (i > 0) {
      streamContent += '0 -18 Td\n';
    }
    const escaped = line.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
    streamContent += `(${escaped}) Tj\n`;
  });
  streamContent += 'ET';

  const streamLen = Buffer.byteLength(streamContent, 'utf-8');

  let pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> >> >> >>
endobj
4 0 obj
<< /Length ${streamLen} >>
stream
${streamContent}
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000280 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
${400 + streamLen}
%%EOF`;

  return Buffer.from(pdf, 'utf-8');
}

const fixturesDir = path.join(__dirname);

// 1. Fixture 1: Harborstone Mechanical Services LLC (Standard ACORD 25)
const doc1Lines = [
  'CERTIFICATE OF LIABILITY INSURANCE - ACORD 25 (2016/03)',
  'PRODUCER: Beacon Crest Risk & Insurance Agency LLC',
  'INSURED: Harborstone Mechanical Services LLC',
  'GL CARRIER: Meridian Harbor Insurance Company',
  'GL Policy #: GL-47Q8-9135',
  'GL EFF: 2026-01-15  GL EXP: 2027-01-15',
  'GL OCCURRENCE: $1,000,000  GL AGGREGATE: $2,000,000',
  'AUTO CARRIER: Meridian Harbor Insurance Company',
  'Auto Policy #: AL-26-44018',
  'Auto EFF: 2026-01-15  Auto EXP: 2027-01-15',
  'AUTO CSL: $1,000,000',
  'WC CARRIER: Summit Peak Indemnity Co.',
  'WC Policy #: WC-88210-26',
  'WC EFF: 2026-01-15  WC EXP: 2027-01-15',
  'WC EACH ACCIDENT: $1,000,000',
  'UMBRELLA CARRIER: Summit Peak Indemnity Co.',
  'Umbrella Policy #: UMB-77421',
  'Umbrella EFF: 2026-01-15  Umbrella EXP: 2027-01-15',
  'UMBRELLA EACH OCCURRENCE: $2,000,000',
  'ADDITIONAL INSURED: YES',
  'WAIVER OF SUBROGATION: YES',
  'PROJECT: Ridgeway Distribution Center Expansion',
  'CERTIFICATE HOLDER: Turner Construction Management'
];
fs.writeFileSync(path.join(fixturesDir, 'certifitrack_sample_coi_test.pdf'), createPdf(doc1Lines));

// 2. Fixture 2: Vanguard Electrical Contractors Inc
const doc2Lines = [
  'CERTIFICATE OF LIABILITY INSURANCE - ACORD 25 (2016/03)',
  'PRODUCER: Apex Northwest Brokerage Inc',
  'INSURED: Vanguard Electrical Contractors Inc',
  'GL CARRIER: Pacific Crest Casualty Co',
  'GL Policy #: GL-8821-4409',
  'GL EFF: 2026-04-01  GL EXP: 2027-04-01',
  'GL OCCURRENCE: $2,000,000  GL AGGREGATE: $4,000,000',
  'AUTO CARRIER: Pacific Crest Casualty Co',
  'Auto Policy #: AL-99-10293',
  'Auto EFF: 2026-04-01  Auto EXP: 2027-04-01',
  'AUTO CSL: $1,000,000',
  'WC CARRIER: Continental Mutual Assurance',
  'WC Policy #: WC-55412-99',
  'WC EFF: 2026-04-01  WC EXP: 2027-04-01',
  'WC EACH ACCIDENT: $1,000,000',
  'UMBRELLA CARRIER: Continental Mutual Assurance',
  'Umbrella Policy #: UMB-33901',
  'Umbrella EFF: 2026-04-01  Umbrella EXP: 2027-04-01',
  'UMBRELLA EACH OCCURRENCE: $5,000,000',
  'ADDITIONAL INSURED: YES',
  'WAIVER OF SUBROGATION: YES',
  'PROJECT: Metro Transit Line Extension - Substation 4',
  'CERTIFICATE HOLDER: City Transit Authority'
];
fs.writeFileSync(path.join(fixturesDir, 'certifitrack_sample_coi_test_2.pdf'), createPdf(doc2Lines));

// 3. Fixture 3: Multi-line layout variation
const doc3Lines = [
  'CERTIFICATE OF INSURANCE',
  'PRODUCER',
  'Cascade Risk Partners Inc',
  'INSURED',
  'Olympic Steel Structures LLC',
  'INSURER A: Northland Casualty Group',
  'COMMERCIAL GENERAL LIABILITY',
  'POLICY NUMBER: GL-9921-1002',
  'EFF DATE: 2026-06-01  EXP DATE: 2027-06-01',
  'EACH OCCURRENCE: $1,000,000',
  'GENERAL AGGREGATE: $2,000,000',
  'ADDL INSD: YES',
  'SUBR WVD: YES',
  'DESCRIPTION OF OPERATIONS: Phase 2 Structural Fabrication',
  'CERTIFICATE HOLDER',
  'Evergreen Industrial Holdings'
];
fs.writeFileSync(path.join(fixturesDir, 'coi_multiline_variation.pdf'), createPdf(doc3Lines));

// 4. Fixture 4: Valid COI missing ACORD 25 phrase
const doc4Lines = [
  'EVIDENCE OF COMMERCIAL LIABILITY INSURANCE',
  'INSURER AFFORDING COVERAGE: Liberty Mutual Specialty',
  'PRODUCER: Gallagher Commercial Insurance',
  'NAMED INSURED: Sierra Crest Engineering Corp',
  'POLICY NO: GL-5532-8819',
  'EFFECTIVE: 2026-03-15  EXPIRATION: 2027-03-15',
  'OCCURRENCE LIMIT: $3,000,000',
  'AGGREGATE LIMIT: $6,000,000',
  'PROJECT: Downtown Bridge Seismic Retrofit',
  'CERTIFICATE HOLDER: State Department of Transportation'
];
fs.writeFileSync(path.join(fixturesDir, 'coi_no_acord_phrase.pdf'), createPdf(doc4Lines));

// 5. Fixture 5: Auto, WC, and Umbrella Only (No GL)
const doc5Lines = [
  'CERTIFICATE OF INSURANCE - COMMERCIAL COVERAGES',
  'PRODUCER: Western States Insurance Brokers',
  'INSURED: Horizon Transport & Logistics LLC',
  'AUTO CARRIER: Fleet National Underwriters',
  'AUTO POLICY NO: AL-8832-1109',
  'AUTO EFF: 2026-05-01  AUTO EXP: 2027-05-01',
  'AUTO CSL: $2,000,000',
  'WC CARRIER: State Compensation Insurance Fund',
  'WC POLICY NO: WC-4412-9908',
  'WC EFF: 2026-05-01  WC EXP: 2027-05-01',
  'WC EACH ACCIDENT: $1,000,000',
  'UMBRELLA CARRIER: Fleet National Underwriters',
  'UMBRELLA POLICY NO: UMB-2219-01',
  'UMBRELLA EFF: 2026-05-01  UMBRELLA EXP: 2027-05-01',
  'UMBRELLA EACH OCCURRENCE: $5,000,000',
  'CERTIFICATE HOLDER: Logistics Hub Partners'
];
fs.writeFileSync(path.join(fixturesDir, 'coi_auto_wc_umbrella_only.pdf'), createPdf(doc5Lines));

// 6. Fixture 6: Partial / Ambiguous COI (Missing named insured -> review required)
const doc6Lines = [
  'CERTIFICATE OF LIABILITY INSURANCE',
  'PRODUCER: Midwest Risk Management Group',
  'INSURER A: Heartland Casualty Company',
  'POLICY NUMBER: GL-1122-3344',
  'EFF DATE: 2026-02-01  EXP DATE: 2027-02-01',
  'EACH OCCURRENCE: $1,000,000',
  'GENERAL AGGREGATE: $2,000,000',
  'CERTIFICATE HOLDER: Heartland Properties LLC'
];
fs.writeFileSync(path.join(fixturesDir, 'coi_partial_ambiguous.pdf'), createPdf(doc6Lines));

// 7. Fixture 7: Malformed / Corrupt Document
const malformedLines = [
  'INVOICE # 994812',
  'BILL TO: John Doe',
  'AMOUNT DUE: $500.00',
  'DUE DATE: 2026-10-15',
  'THANK YOU FOR YOUR BUSINESS'
];
fs.writeFileSync(path.join(fixturesDir, 'malformed_corrupt.pdf'), createPdf(malformedLines));

// 8. Fixture 8: Clearly Unrelated Invoice PDF
const invoiceLines = [
  'ACME SUPPLIES & SERVICES - COMMERCIAL INVOICE',
  'INVOICE NUMBER: INV-2026-8819',
  'CUSTOMER: Metro Retail Store #4',
  'DESCRIPTION: Industrial cleaning materials and supplies',
  'TOTAL AMOUNT: $1,420.50',
  'PAYMENT TERMS: Net 30 days',
  'REMIT PAYMENT TO: Acme Supplies Account # 9812-4410'
];
fs.writeFileSync(path.join(fixturesDir, 'invoice_non_coi.pdf'), createPdf(invoiceLines));

console.log('✅ Generated all 8 test fixtures successfully.');
