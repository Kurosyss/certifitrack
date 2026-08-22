import type { V4Extraction, DocumentSegmentation } from './schema.js';

export type ValidationCatches = {
  date_format: number;
  date_order: number;
  date_range: number;
  limit_range: number;
  source_required: number;
  zero_duration: number;
  non_coi: number;
};

export function validateExtraction(
  extraction: V4Extraction, 
  segmentation: DocumentSegmentation
): {
  validatedData: V4Extraction;
  catches: ValidationCatches;
} {
  const catches: ValidationCatches = {
    date_format: 0,
    date_order: 0,
    date_range: 0,
    limit_range: 0,
    source_required: 0,
    zero_duration: 0,
    non_coi: 0
  };

  const fields = Object.keys(extraction) as (keyof V4Extraction)[];

  fields.forEach(field => {
    const obj = extraction[field] as any;
    
    // Check if value exists
    if (obj.value !== null) {
      // Rule: SOURCE_REQUIRED and SOURCE_VALIDATION
      if (!obj.source_text || obj.source_text.trim() === '') {
        obj.value = null;
        obj.review_required = true;
        obj.reason_code = 'INSUFFICIENT_EVIDENCE';
        catches.source_required++;
      } else {
        // Enforce coverage isolation
        let expectedSectionText = '';
        if (field.startsWith('gl_')) expectedSectionText = segmentation.gl_section_text || '';
        else if (field.startsWith('wc_')) expectedSectionText = segmentation.wc_section_text || '';
        else if (field.startsWith('auto_')) expectedSectionText = segmentation.auto_section_text || '';
        else if (field.startsWith('umbrella_')) expectedSectionText = segmentation.umbrella_excess_section_text || '';
        
        if (expectedSectionText && !expectedSectionText.includes(obj.source_text)) {
          obj.value = null;
          obj.review_required = true;
          obj.reason_code = 'UNSUPPORTED_COVERAGE';
          catches.source_required++;
        }
      }

      // Rules for dates
      if (field.includes('date')) {
        // Rule: DATE_FORMAT
        if (typeof obj.value === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(obj.value)) {
          obj.value = null; // Unsalvageable format without inference
          obj.review_required = true;
          obj.reason_code = 'AMBIGUOUS_VALUE';
          catches.date_format++;
        } else if (typeof obj.value === 'string') {
          // Rule: DATE_RANGE
          const year = parseInt(obj.value.substring(0, 4), 10);
          if (year < 2020 || year > 2035) {
            obj.value = null;
            obj.review_required = true;
            obj.reason_code = 'AMBIGUOUS_VALUE';
            catches.date_range++;
          }
        }
      }

      // Rules for limits
      if (field.includes('limit') || field.includes('occurrence') || field.includes('aggregate')) {
        // Rule: LIMIT_RANGE
        if (typeof obj.value === 'number') {
          if (obj.value <= 0 || obj.value >= 1000000000) { // arbitrary 1B cap
            obj.value = null;
            obj.review_required = true;
            obj.reason_code = 'AMBIGUOUS_VALUE';
            catches.limit_range++;
          }
        }
      }
    }
  });

  // Cross-field date rules
  const coverages = ['gl', 'wc', 'auto', 'umbrella'];
  for (const cov of coverages) {
    const effField = `${cov}_effective_date` as keyof V4Extraction;
    const expField = `${cov}_expiration_date` as keyof V4Extraction;
    
    const effObj = extraction[effField] as any;
    const expObj = extraction[expField] as any;

    if (effObj.value && expObj.value) {
      const eff = new Date(effObj.value);
      const exp = new Date(expObj.value);
      
      // Rule: DATE_ORDER
      if (eff > exp) {
        effObj.value = null;
        effObj.review_required = true;
        effObj.reason_code = 'CONFLICTING_VALUES';
        expObj.value = null;
        expObj.review_required = true;
        expObj.reason_code = 'CONFLICTING_VALUES';
        catches.date_order++;
      }
      
      // Rule: ZERO_DURATION
      if (eff.getTime() === exp.getTime()) {
        effObj.value = null;
        effObj.review_required = true;
        effObj.reason_code = 'CONFLICTING_VALUES';
        expObj.value = null;
        expObj.review_required = true;
        expObj.reason_code = 'CONFLICTING_VALUES';
        catches.zero_duration++;
      }
    }

    // Rule: CHECKED_BUT_BLANK
    const indicatedField = `${cov}_coverage_indicated` as keyof DocumentSegmentation;
    if (segmentation[indicatedField]) {
      const isBlank = Object.keys(extraction)
        .filter(k => k.startsWith(cov + '_'))
        .every(k => (extraction as any)[k].value === null);
        
      if (isBlank) {
        Object.keys(extraction).filter(k => k.startsWith(cov + '_')).forEach(k => {
          (extraction as any)[k].value = null;
          (extraction as any)[k].review_required = true;
          (extraction as any)[k].reason_code = 'CHECKED_BUT_BLANK';
        });
      }
    }
  }

  // Rule: NON_COI
  if (!segmentation.is_coi) {
    catches.non_coi++;
  }

  return { validatedData: extraction, catches };
}
