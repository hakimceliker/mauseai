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
if (kpis.cards.length !== 8) fail('expected eight atomic KPI cards');
for (const card of kpis.cards) {
  if (card.baseline !== null || card.target !== null) fail(`${card.id} must remain unresolved`);
}
const lines = fs.readFileSync(path.join(root, required[2]), 'utf8').trim().split(/\r?\n/);
if (lines.length !== 14) fail('cash model must contain header plus 13 weeks');
if (lines[0].split(',').length !== 16) fail('cash model header must contain 16 columns');
if (lines.slice(1).some((line, index) => line.split(',').length !== 16 || line.split(',')[0] !== String(index + 1))) fail('cash rows must contain 16 columns and weeks 1..13');
console.log('G10 STRUCTURE_VALID');
console.log('G10 ACCEPTANCE: NOT_ACCEPTED_PENDING_PILOT_KPI_FINANCE_EVIDENCE');
