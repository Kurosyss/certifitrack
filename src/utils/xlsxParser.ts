/**
 * Pure Browser-compatible XLSX Row Reader for CertifiTrack
 * Parses the generated XLSX Blob in pure JS/Web APIs without any npm dependencies.
 */

export interface ParsedCoiRow {
  filename: string;
  named_insured: string;
  review_needed: string;
  gl_policy: string;
  gl_carrier: string;
  gl_eff: string;
  gl_exp: string;
  gl_occ: string | number;
  gl_agg: string | number;
  auto_policy: string;
  auto_carrier: string;
  auto_eff: string;
  auto_exp: string;
  auto_limit: string | number;
  wc_policy: string;
  wc_carrier: string;
  wc_eff: string;
  wc_exp: string;
  wc_limit: string | number;
  umbrella_policy: string;
  umbrella_carrier: string;
  umbrella_eff: string;
  umbrella_exp: string;
  umbrella_limit: string | number;
  addl_insd: string;
  subr_wvd: string;
  project: string;
  holder: string;
}

// Extract raw file streams from ZIP binary buffer
async function unzipEntries(buffer: Uint8Array): Promise<{ [path: string]: string }> {
  const entries: { [path: string]: string } = {};
  const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
  let offset = 0;

  while (offset < buffer.length - 30) {
    const sig = view.getUint32(offset, true);
    if (sig === 0x04034b50) { // Local file header
      const compression = view.getUint16(offset + 8, true);
      const compSize = view.getUint32(offset + 18, true);
      const nameLen = view.getUint16(offset + 26, true);
      const extraLen = view.getUint16(offset + 28, true);

      const nameBytes = buffer.subarray(offset + 30, offset + 30 + nameLen);
      const name = new TextDecoder().decode(nameBytes);
      const dataStart = offset + 30 + nameLen + extraLen;
      const compressedBytes = buffer.subarray(dataStart, dataStart + compSize);

      if (compression === 0) {
        entries[name] = new TextDecoder().decode(compressedBytes);
      } else if (compression === 8) {
        try {
          if (typeof DecompressionStream !== 'undefined') {
            const ds = new DecompressionStream('deflate-raw');
            const writer = ds.writable.getWriter();
            writer.write(compressedBytes);
            writer.close();
            const response = new Response(ds.readable);
            entries[name] = await response.text();
          }
        } catch (e) {
          console.warn('DecompressionStream error for ' + name, e);
        }
      }
      offset = dataStart + compSize;
    } else {
      offset++;
    }
  }

  return entries;
}

export async function parseXlsxBlob(blob: Blob): Promise<ParsedCoiRow[]> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const uint8 = new Uint8Array(arrayBuffer);
    const files = await unzipEntries(uint8);

    const sharedStringsXml = files['xl/sharedStrings.xml'] || '';
    const sheet1Xml = files['xl/worksheets/sheet1.xml'] || '';

    if (!sheet1Xml) {
      return [];
    }

    // Parse Shared Strings
    const sharedStrings: string[] = [];
    const parser = new DOMParser();
    if (sharedStringsXml) {
      const sstDoc = parser.parseFromString(sharedStringsXml, 'application/xml');
      const siNodes = sstDoc.getElementsByTagName('si');
      for (let i = 0; i < siNodes.length; i++) {
        sharedStrings.push(siNodes[i].textContent || '');
      }
    }

    // Parse Sheet 1
    const sheetDoc = parser.parseFromString(sheet1Xml, 'application/xml');
    const rowNodes = sheetDoc.getElementsByTagName('row');
    const rows: ParsedCoiRow[] = [];

    // Helper to get column letter to index (A -> 0, B -> 1, ...)
    function colToIndex(colStr: string): number {
      let index = 0;
      for (let i = 0; i < colStr.length; i++) {
        index = index * 26 + (colStr.charCodeAt(i) - 64);
      }
      return index - 1;
    }

    // Keys matching ExcelJS column order (1 to 28)
    const COLUMN_KEYS: (keyof ParsedCoiRow)[] = [
      'filename',
      'named_insured',
      'review_needed',
      'gl_policy',
      'gl_carrier',
      'gl_eff',
      'gl_exp',
      'gl_occ',
      'gl_agg',
      'auto_policy',
      'auto_carrier',
      'auto_eff',
      'auto_exp',
      'auto_limit',
      'wc_policy',
      'wc_carrier',
      'wc_eff',
      'wc_exp',
      'wc_limit',
      'umbrella_policy',
      'umbrella_carrier',
      'umbrella_eff',
      'umbrella_exp',
      'umbrella_limit',
      'addl_insd',
      'subr_wvd',
      'project',
      'holder',
    ];

    // Skip row 0 (Header row)
    for (let r = 1; r < rowNodes.length; r++) {
      const rowNode = rowNodes[r];
      const cNodes = rowNode.getElementsByTagName('c');
      const rowData: any = {};

      for (let c = 0; c < cNodes.length; c++) {
        const cNode = cNodes[c];
        const ref = cNode.getAttribute('r') || '';
        const colLetters = ref.replace(/[0-9]/g, '');
        const colIdx = colToIndex(colLetters);
        const colKey = COLUMN_KEYS[colIdx];

        if (!colKey) continue;

        const type = cNode.getAttribute('t');
        const vNode = cNode.getElementsByTagName('v')[0];
        let val = vNode ? vNode.textContent || '' : '';

        if (type === 's') {
          // Shared string reference index
          const stringIndex = parseInt(val, 10);
          val = sharedStrings[stringIndex] || '';
        }

        rowData[colKey] = val;
      }

      if (
        rowData.filename &&
        !rowData.filename.includes("Source File") &&
        !rowData.filename.includes("CertifiTrack") &&
        !rowData.filename.includes("CERTIFICATE IDENTITY") &&
        !rowData.filename.includes("Generated:")
      ) {
        rows.push(rowData as ParsedCoiRow);
      }
    }

    return rows;
  } catch (err) {
    console.warn('Could not parse XLSX client-side, falling back to header summary:', err);
    return [];
  }
}
