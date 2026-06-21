export interface Template {
  pageDimensions: [number, number];
  bubbleDimensions: [number, number];
  fieldBlocks: Record<string, FieldBlock>;
  customLabels?: Record<string, string[]>;
  outputColumns?: string[];
  emptyValue?: string;
  preProcessors?: any[];
}

export interface FieldBlock {
  fieldType?: string; // e.g. QTYPE_MCQ4, QTYPE_INT
  origin: [number, number];
  fieldLabels: string[];
  bubblesGap: number;
  labelsGap: number;
  bubbleValues?: string[];
  direction?: string;
  bubbleDimensions?: [number, number];
  emptyValue?: string;
}

export interface BubblePoint {
  x: number;
  y: number;
  label: string;
  value: string;
}

const FIELD_TYPES: Record<string, any> = {
  QTYPE_INT: {
    bubbleValues: ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"],
    direction: "vertical",
  },
  QTYPE_INT_FROM_1: {
    bubbleValues: ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"],
    direction: "vertical",
  },
  QTYPE_MCQ4: { bubbleValues: ["A", "B", "C", "D"], direction: "horizontal" },
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

const TEMPLATE_DEFAULTS = {
  preProcessors: [],
  emptyValue: "",
  customLabels: {},
  outputColumns: [],
};

function parseFieldString(fieldString: string): string[] {
  if (fieldString.includes('..')) {
    // Regex matching python's r"([^\.\d]+)(\d+)\.{2,3}(\d+)"
    const match = fieldString.match(/([^.\d]+)(\d+)\.{2,3}(\d+)/);
    if (!match) {
      throw new Error(`Invalid range in fields string: '${fieldString}'`);
    }
    const prefix = match[1];
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

function parseFields(fieldLabels: string[]): string[] {
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

export function parseTemplate(templateData: any): { bubbles: BubblePoint[], template: Template } {
  const bubbles: BubblePoint[] = [];
  
  // Merge defaults
  const template: Template = {
    ...TEMPLATE_DEFAULTS,
    ...templateData
  };

  const globalEmptyVal = template.emptyValue || "";

  for (const blockName in template.fieldBlocks) {
    let block = template.fieldBlocks[blockName];

    // Pre-fill field block
    if (block.fieldType && FIELD_TYPES[block.fieldType]) {
      block = {
        ...FIELD_TYPES[block.fieldType],
        ...block
      };
    } else if (!block.fieldType) {
      block = { ...block, fieldType: "__CUSTOM__" };
    }

    block = {
      direction: "vertical",
      emptyValue: globalEmptyVal,
      bubbleDimensions: template.bubbleDimensions,
      ...block
    };

    const parsedFieldLabels = parseFields(block.fieldLabels);
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
          value: bubbleValue
        });
        bubblePoint[h] += bubblesGap;
      }
      leadPoint[v] += labelsGap;
    }
  }

  // Parse custom labels mapping so that evaluation can concatenate
  if (template.customLabels) {
    for (const [key, val] of Object.entries(template.customLabels)) {
      template.customLabels[key] = parseFields(val);
    }
  }

  return { bubbles, template };
}
