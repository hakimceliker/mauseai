import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const required = [
  'docs/pilot/MOUSE_G10_PILOT_SCENARIOS.json',
  'docs/kpi/MOUSE_G10_KPI_CARDS.json',
  'docs/finance/MOUSE_G10_13_WEEK_CASH.csv',
  'docs/governance/st36/G10_RECONCILIATION.md',
];
const fail = (message) => { throw new Error(message); };
for (const file of required) {
  if (!fs.existsSync(path.join(root, file))) fail(`missing ${file}`);
}
const scenarios = JSON.parse(fs.readFileSync(path.join(root, required[0]), 'utf8'));
const kpis = JSON.parse(fs.readFileSync(path.join(root, required[1]), 'utf8'));
if (scenarios.scenarios.length !== 2) fail('expected exactly two pilot scenarios');
if (new Set(scenarios.scenarios.map((s) => s.id)).size !== 2) fail('pilot IDs must be unique');
if (kpis.cards.length !== 9) fail('expected nine atomic KPI cards');
for (const card of kpis.cards) {
  if (card.baseline !== null || card.target !== null) fail(`${card.id} must remain unresolved`);
}
function parseCsvRows(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (quoted) {
      if (character === '"') {
        if (text[index + 1] === '"') { field += '"'; index += 1; }
        else quoted = false;
      } else field += character;
    } else if (character === '"') quoted = true;
    else if (character === ',') { row.push(field); field = ''; }
    else if (character === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (character === '\r') { if (text[index + 1] !== '\n') { row.push(field); rows.push(row); row = []; field = ''; } }
    else field += character;
  }
  if (quoted) fail('cash CSV has an unterminated quoted field');
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const rows = parseCsvRows(fs.readFileSync(path.join(root, required[2]), 'utf8').trim());
if (rows.length !== 14) fail('cash model must contain header plus 13 weeks');
if (rows[0].length !== 16) fail('cash model header must contain 16 columns');
if (rows.slice(1).some((row, index) => row.length !== 16 || row[0] !== String(index + 1))) fail('cash rows must contain 16 columns and weeks 1..13');
console.log('G10 STRUCTURE_VALID');
console.log('G10 ACCEPTANCE: NOT_ACCEPTED_PENDING_PILOT_KPI_FINANCE_EVIDENCE');
