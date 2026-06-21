import * as fs from 'fs';
import { parseTemplate } from './src/core/templateParser';
const data = JSON.parse(fs.readFileSync('/Users/md.rofazhasanrafiu/coding/OMRChecker/samples/sample6/template.json', 'utf8'));
try {
  const result = parseTemplate(data);
  console.log(`Success! Parsed ${result.bubbles.length} bubbles.`);
} catch (err) {
  console.error('Error:', err);
}
