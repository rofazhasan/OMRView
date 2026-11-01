import type { BubblePoint, FieldBlock, Template, QuestionType } from '../types/omr';

export type { BubblePoint, FieldBlock, Template, QuestionType };

export const FIELD_TYPES: Record<string, { bubbleValues: string[]; direction: 'horizontal' | 'vertical' }> = {
  QTYPE_INT: {
    bubbleValues: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    direction: "vertical",
  },
  QTYPE_INT_FROM_1: {
    bubbleValues: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    direction: "vertical",
  },
  QTYPE_MCQ4: {
    bubbleValues: ["A", "B", "C", "D"],
    direction: "horizontal",
  },
  QTYPE_MCQ5: {
    bubbleValues: ["A", "B", "C", "D", "E"],
    direction: "horizontal",
  },
  QTYPE_MCQ4_RTL: {
    bubbleValues: ["D", "C", "B", "A"],
    direction: "horizontal",
  },
  QTYPE_MCQ5_RTL: {
    bubbleValues: ["E", "D", "C", "B", "A"],
    direction: "horizontal",
  },
};

export const TEMPLATE_DEFAULTS = {
  preProcessors: [{ name: 'CropOnMarkers' }],
  emptyValue: "",
  customLabels: {},
  outputColumns: [],
};

export function parseFieldString(fieldString: string): string[] {
  if (fieldString.includes('..')) {
    const match = fieldString.match(/([^.\d]*)(\d+)\.{2,3}(\d+)/);
    if (!match) {
      throw new Error(`Invalid range in fields string: '${fieldString}'`);
    }
    const prefix = match[1] || '';
    const start = parseInt(match[2], 10);
    const end = parseInt(match[3], 10);
    if (start >= end) {
      throw new Error(`Invalid range in fields string: '${fieldString}', start: ${start} is not less than end: ${end}`);
    }
    const result: string[] = [];
    for (let i = start; i <= end; i++) {
      result.push(`${prefix}${i}`);
    }
    return result;
  }
  return [fieldString];
}

export function parseFields(fieldLabels: string[]): string[] {
  const parsedFields: string[] = [];
  const fieldsSet = new Set<string>();

  for (const fieldString of fieldLabels) {
    const fieldsArray = parseFieldString(fieldString);
    for (const f of fieldsArray) {
      if (fieldsSet.has(f)) {
        throw new Error(`Given field string '${fieldString}' has overlapping field(s) with other fields`);
      }
      fieldsSet.add(f);
      parsedFields.push(f);
    }
  }
  return parsedFields;
}

export function parseTemplate(templateData: any): { bubbles: BubblePoint[]; template: Template } {
  if (!templateData || typeof templateData !== 'object') {
    throw new Error('Template data must be a valid JSON object');
  }

  if (!templateData.pageDimensions || !Array.isArray(templateData.pageDimensions) || templateData.pageDimensions.length !== 2) {
    throw new Error('Invalid or missing pageDimensions (expected [width, height])');
  }

  if (!templateData.bubbleDimensions || !Array.isArray(templateData.bubbleDimensions) || templateData.bubbleDimensions.length !== 2) {
    throw new Error('Invalid or missing bubbleDimensions (expected [width, height])');
  }

  if (!templateData.fieldBlocks || typeof templateData.fieldBlocks !== 'object') {
    throw new Error('Invalid or missing fieldBlocks dictionary');
  }

  const bubbles: BubblePoint[] = [];
  const template: Template = {
    ...TEMPLATE_DEFAULTS,
    ...templateData,
  };

  const globalEmptyVal = template.emptyValue || "";

  for (const blockName in template.fieldBlocks) {
    let block = template.fieldBlocks[blockName];

    if (block.fieldType && FIELD_TYPES[block.fieldType]) {
      block = {
        ...FIELD_TYPES[block.fieldType],
        ...block,
      };
    }

    block = {
      direction: "horizontal",
      emptyValue: globalEmptyVal,
      bubbleDimensions: template.bubbleDimensions,
      ...block,
    };

    const parsedFieldLabels = parseFields(block.fieldLabels || []);
    const bubbleValues = block.bubbleValues || [];
    const direction = block.direction;
    const h = direction === "vertical" ? 1 : 0;
    const v = direction === "vertical" ? 0 : 1;
    const bubblesGap = block.bubblesGap;
    const labelsGap = block.labelsGap;

    let leadPoint = [block.origin[0], block.origin[1]];

    for (const fieldLabel of parsedFieldLabels) {
      let bubblePoint = [...leadPoint];
      for (const bubbleValue of bubbleValues) {
        bubbles.push({
          x: Math.round(bubblePoint[0]),
          y: Math.round(bubblePoint[1]),
          label: fieldLabel,
          value: bubbleValue,
          section: block.section || blockName,
        });
        bubblePoint[h] += bubblesGap;
      }
      leadPoint[v] += labelsGap;
    }
  }

  const normalizedCustomLabels: Record<string, string[]> = {};
  if (template.customLabels) {
    for (const [key, val] of Object.entries(template.customLabels)) {
      normalizedCustomLabels[key] = parseFields(val);
    }
  }
  template.customLabels = normalizedCustomLabels;

  return { bubbles, template };
}

export function serializeTemplate(template: Template): string {
  return JSON.stringify(template, null, 2);
}

export function resolveConcatenatedFields(
  rawResponses: Record<string, string[]>,
  customLabels?: Record<string, string[]>,
  emptyValue: string = ""
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const [key, values] of Object.entries(rawResponses)) {
    result[key] = values.length > 1 ? `[${values.join('/')}]` : (values[0] || '');
  }

  if (customLabels) {
    for (const [groupName, rawList] of Object.entries(customLabels)) {
      // Auto-expand any unexpanded field strings like "roll1..7"
      const expandedList = parseFields(Array.isArray(rawList) ? rawList : [rawList]);
      const combined = expandedList.map(field => {
        const val = rawResponses[field];
        if (!val || val.length === 0) return emptyValue;
        if (val.length === 1) return val[0];
        return `[${val.join('/')}]`; // Visibly flag multi-marked digit without breaking string layout
      }).join('');
      result[groupName] = combined;
    }
  }

  return result;
}
