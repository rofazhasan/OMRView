import * as fs from 'fs';

function parseTemplate(templateData: any): any {
  const bubbles: any[] = [];
  const template: any = templateData;

  for (const blockName in template.fieldBlocks) {
    const block = template.fieldBlocks[blockName];
    const [startX, startY] = block.origin;
    
    // Parse labels like ["q1..10"]
    const parsedLabels: string[] = [];
    block.fieldLabels.forEach((lbl: any) => {
      if (lbl.includes('..')) {
        const parts = lbl.match(/([a-zA-Z_]+)(\d+)\.\.(\d+)/);
        if (parts) {
          const prefix = parts[1];
          const start = parseInt(parts[2], 10);
          const end = parseInt(parts[3], 10);
          for (let i = start; i <= end; i++) {
            parsedLabels.push(`${prefix}${i}`);
          }
        }
      } else {
        parsedLabels.push(lbl);
      }
    });

    const fieldType = block.fieldType || '';
    const isMCQ = fieldType.includes('MCQ');
    const optionsCount = block.bubbleValues ? block.bubbleValues.length : (isMCQ ? parseInt(fieldType.replace('QTYPE_MCQ', ''), 10) || 4 : 10);
    const optionValues = block.bubbleValues ? block.bubbleValues : (isMCQ ? ['A', 'B', 'C', 'D', 'E', 'F'].slice(0, optionsCount) : ['0','1','2','3','4','5','6','7','8','9']);

    const direction = block.direction || (fieldType.includes('INT') ? 'vertical' : 'horizontal');
    const isVertical = direction === 'vertical';

    parsedLabels.forEach((label, labelIndex) => {
      for (let optionIndex = 0; optionIndex < optionsCount; optionIndex++) {
        let x = startX;
        let y = startY;
        
        if (isVertical) {
          x += labelIndex * block.labelsGap;
          y += optionIndex * block.bubblesGap;
        } else {
          y += labelIndex * block.labelsGap;
          x += optionIndex * block.bubblesGap;
        }

        bubbles.push({
          x, y,
          label,
          value: optionValues[optionIndex]
        });
      }
    });
  }

  return { bubbles, template };
}

const data = JSON.parse(fs.readFileSync('/Users/md.rofazhasanrafiu/coding/OMRChecker/samples/sample6/template.json', 'utf8'));
try {
  parseTemplate(data);
  console.log('Success!');
} catch (err) {
  console.error('Error:', err);
}
