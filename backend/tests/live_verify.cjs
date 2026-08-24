const fs = require('fs');
const path = require('path');
const ExcelJS = require('exceljs');

const fixturesDir = path.join(__dirname, 'fixtures');

async function testUpload(filename, expectedStatus, expectedReview = false) {
  const filePath = path.join(fixturesDir, filename);
  const fileBuffer = fs.readFileSync(filePath);

  const form = new globalThis.FormData();
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });
  form.append('file', blob, filename);

  console.log(`\n========================================`);
  console.log(`TESTING UPLOAD: ${filename}`);
  console.log(`========================================`);

  const response = await fetch('http://127.0.0.1:3000/v1/extract', {
    method: 'POST',
    body: form,
  });

  console.log(`HTTP Status: ${response.status} (Expected: ${expectedStatus})`);

  if (response.status !== expectedStatus) {
    const text = await response.text();
    console.error(`❌ Unexpected status code. Response body:`, text);
    throw new Error(`Expected status ${expectedStatus}, got ${response.status}`);
  }

  if (response.status === 200) {
    const summaryHeader = response.headers.get('x-extraction-summary');
    console.log(`Raw X-Extraction-Summary Header:`, summaryHeader ? 'Present' : 'Missing');
    
    if (summaryHeader) {
      const summary = JSON.parse(decodeURIComponent(summaryHeader));
      console.log(`Parsed Summary JSON:`, JSON.stringify(summary, null, 2));

      const item = summary[0];
      if (item.reviewRequired !== expectedReview) {
        throw new Error(`Expected reviewRequired to be ${expectedReview}, got ${item.reviewRequired}`);
      }

      if (filename.includes('sample_coi_test.pdf')) {
        if (item.insured !== 'Harborstone Mechanical Services LLC') throw new Error(`Wrong insured: ${item.insured}`);
        if (item.carrier !== 'Meridian Harbor Insurance Company') throw new Error(`Wrong carrier: ${item.carrier}`);
        if (item.policyNumber !== 'GL-47Q8-9135') throw new Error(`Wrong policy: ${item.policyNumber}`);
        if (item.effectiveDate !== '2026-01-15') throw new Error(`Wrong eff date: ${item.effectiveDate}`);
        if (item.expirationDate !== '2027-01-15') throw new Error(`Wrong exp date: ${item.expirationDate}`);
        if (item.occurrenceLimit !== 1000000) throw new Error(`Wrong occ limit: ${item.occurrenceLimit}`);
        console.log(`✅ Assertions passed for Harborstone Mechanical Services LLC!`);
      } else if (filename.includes('sample_coi_test_2.pdf')) {
        if (item.insured !== 'Vanguard Electrical Contractors Inc') throw new Error(`Wrong insured: ${item.insured}`);
        if (item.carrier !== 'Pacific Crest Casualty Co') throw new Error(`Wrong carrier: ${item.carrier}`);
        if (item.policyNumber !== 'GL-8821-4409') throw new Error(`Wrong policy: ${item.policyNumber}`);
        console.log(`✅ Assertions passed for Vanguard Electrical Contractors Inc!`);
      } else if (filename.includes('coi_no_acord_phrase.pdf')) {
        if (item.insured !== 'Sierra Crest Engineering Corp') throw new Error(`Wrong insured: ${item.insured}`);
        if (item.policyNumber !== 'GL-5532-8819') throw new Error(`Wrong policy: ${item.policyNumber}`);
        console.log(`✅ Assertions passed for Sierra Crest Engineering Corp!`);
      } else if (filename.includes('coi_auto_wc_umbrella_only.pdf')) {
        if (item.insured !== 'Horizon Transport & Logistics LLC') throw new Error(`Wrong insured: ${item.insured}`);
        if (!['AL-8832-1109', 'WC-4412-9908'].includes(item.policyNumber)) throw new Error(`Wrong policy: ${item.policyNumber}`);
        console.log(`✅ Assertions passed for Horizon Transport & Logistics LLC!`);
      } else if (filename.includes('coi_partial_ambiguous.pdf')) {
        if (!item.reviewRequired) throw new Error('Expected reviewRequired to be true');
        console.log(`✅ Assertions passed for partial/ambiguous document review state!`);
      }
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer);
    const sheet = workbook.getWorksheet('COI Tracker');
    console.log(`XLSX Worksheet: "${sheet.name}", Row Count: ${sheet.rowCount}`);
    console.log(`✅ XLSX Workbook generated and verified!`);
  } else {
    const errorJson = await response.json();
    console.log(`Error Response JSON:`, errorJson);
    if (!errorJson.message) throw new Error('Missing error message in 422 response');
    console.log(`✅ Explicit error verified for non-COI document!`);
  }
}

async function run() {
  try {
    // 1. Valid Harborstone
    await testUpload('certifitrack_sample_coi_test.pdf', 200, false);
    // 2. Valid Vanguard
    await testUpload('certifitrack_sample_coi_test_2.pdf', 200, false);
    // 3. Multi-line variation
    await testUpload('coi_multiline_variation.pdf', 200, false);
    // 4. No ACORD 25 phrase
    await testUpload('coi_no_acord_phrase.pdf', 200, false);
    // 5. Auto/WC/Umbrella only
    await testUpload('coi_auto_wc_umbrella_only.pdf', 200, false);
    // 6. Partial / Ambiguous -> Review Required
    await testUpload('coi_partial_ambiguous.pdf', 200, true);
    // 7. Malformed PDF -> 422
    await testUpload('malformed_corrupt.pdf', 422);
    // 8. Invoice PDF -> 422
    await testUpload('invoice_non_coi.pdf', 422);

    console.log(`\n🎉 ALL 8 LIVE INTEGRATION TESTS PASSED WITH 100% EVIDENCE!`);
  } catch (err) {
    console.error(`\n❌ LIVE INTEGRATION TEST FAILED:`, err);
    process.exit(1);
  }
}

run();
