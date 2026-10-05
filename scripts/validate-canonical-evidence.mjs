import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const root = process.cwd();
const registerPath = path.join(root, 'docs', 'governance', 'st36', 'MAUSEAI_Ana_Kayit.json');
const contractPath = path.join(root, 'docs', 'governance', 'st36', 'EVIDENCE_REGISTER_GATE.md');
const register = JSON.parse(fs.readFileSync(registerPath, 'utf8'));
const failures = [];

if (!fs.existsSync(contractPath)) {
  failures.push('canonical evidence contract is missing');
} else {
  const contract = fs.readFileSync(contractPath, 'utf8');
  if (!contract.includes('LETFON 01–40')) failures.push('LETFON 01–40 acceptance contract is missing');
  if (!contract.includes('G0–G12')) failures.push('canonical G0–G12 taxonomy is missing from evidence contract');
  if (!contract.includes('independent reviewer or Judge')) failures.push('independent review/Judge closure rule is missing');
}

if (register.repo !== 'hakimceliker/mauseai') failures.push('canonical repository mismatch');

const expectedGates = Array.from({ length: 13 }, (_, index) => `G${index}`);
const gateIds = Array.isArray(register.gates) ? register.gates.map((gate) => gate.id) : [];
if (gateIds.join(',') !== expectedGates.join(',')) failures.push('gate register must contain G0-G12 in canonical order');

const validGateIds = new Set(expectedGates);
const canonicalStatuses = new Set(['PLANNED', 'IN_PROGRESS', 'VERIFIED', 'PARTIAL', 'BLOCKED', 'NOT_RUN', 'ACCEPTED', 'REJECTED']);
for (const gate of register.gates ?? []) {
  if (!canonicalStatuses.has(String(gate.status ?? '').toUpperCase())) {
    failures.push(`${gate.id}: non-canonical gate status ${gate.status ?? '[missing]'}`);
  }
}

for (const task of register.tasks ?? []) {
  if (!/^((MOUSE|PLAN)-[0-9]{3}|MAU-ADAPT-[0-9]{3})$/.test(String(task.id ?? ''))) {
    failures.push(`task ${task.id ?? '[missing]'}: canonical task id is required`);
  }
  if (!Array.isArray(task.gate_ids) || task.gate_ids.length < 1 || task.gate_ids.some((gateId) => !validGateIds.has(gateId))) {
    failures.push(`${task.id ?? '[missing]'}: gate_ids must contain only canonical G0-G12 values`);
  }
}

for (const gate of register.gates ?? []) {
  const status = String(gate.status ?? '').toUpperCase();
  if (['ACCEPTED', 'PASS', 'GEÇTİ', 'CLOSED'].includes(status) && (!gate.evidence || !gate.acceptor || !gate.accepted_at)) {
    failures.push(`${gate.id}: acceptance requires evidence, acceptor, and accepted_at`);
  }
}

for (const source of register.sources ?? []) {
  if (!/^[a-f0-9]{64}$/i.test(String(source.sha256 ?? '')) || Number(source.bytes) <= 0) {
    failures.push(`${source.id}: source hash and byte size are required`);
  }
}

const runtimeVerified = register.runtime_verified === true;
const overall = String(register.latest_repository_verification?.overall_acceptance ?? '');
const claimsProductionAcceptance = /\b(PRODUCTION[- ]READY|ACCEPTED|TAMAMLANDI)\b/i.test(overall)
  && !/NOT PRODUCTION[- ]READY/i.test(overall);
if (!runtimeVerified && claimsProductionAcceptance) {
  failures.push('runtime_verified=false cannot coexist with production acceptance');
}

if (failures.length > 0) {
  console.error('CANONICAL EVIDENCE: FAIL');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exitCode = 1;
} else {
  console.log(`CANONICAL EVIDENCE: PASS (${register.gates?.length ?? 0} gates, ${register.sources?.length ?? 0} sources)`);
  console.log(`overall_acceptance: ${overall}`);
  console.log(`runtime_verified: ${runtimeVerified}`);
}
