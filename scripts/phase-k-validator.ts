#!/usr/bin/env ts-node

/**
 * Phase K Validator - Final Acceptance Framework
 * Validates that all Phase B modules are properly consolidated into main
 * and reports closure-ready status. Local checks are necessary but are not
 * sufficient: live gates, independent review and stakeholder approval must be
 * explicitly supplied by the authorized acceptance environment.
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

interface ValidationResult {
  category: string;
  checks: {
    name: string;
    passed: boolean;
    details?: string;
  }[];
}

const REQUIRED_PHASES = [
  'phase-b1-contracts',
  'phase-b2-orchestrator',
  'phase-b3-planner',
  'phase-b4-agent-registry',
  'phase-b5-task-engine',
  'phase-b6-handoff',
  'phase-b7-router',
  'phase-b8-judge-gate',
  'phase-b9-permission',
  'phase-b10-recovery',
  'phase-b11-memory',
];

const REQUIRED_DIRECTORIES = [
  'src/core/judge',
  'src/core/evidence',
  'src/core/orchestrator',
  'src/core/planner',
  'src/core/task-engine',
  'src/core/routing',
  'src/core/approval',
  'src/core/permissions',
  'src/core/recovery',
  'src/core/contracts',
];

function getGitCommitHash(branch: string): string | null {
  try {
    return execSync(`git rev-parse ${branch} 2>/dev/null || echo ""`, {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
      .trim()
      .substring(0, 7);
  } catch {
    return null;
  }
}

function checkBranchMerged(branch: string): boolean {
  try {
    execSync(`git merge-base --is-ancestor ${branch} main`, {
      stdio: 'pipe',
    });
    return true;
  } catch {
    return false;
  }
}

function checkDirectoryExists(dir: string): boolean {
  const fullPath = path.join(process.cwd(), dir);
  return fs.existsSync(fullPath);
}

function countFilesInDirectory(dir: string): number {
  const fullPath = path.join(process.cwd(), dir);
  if (!fs.existsSync(fullPath)) return 0;
  let count = 0;
  const pending = [fullPath];
  while (pending.length > 0) {
    const current = pending.pop();
    if (!current) continue;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const entryPath = path.join(current, entry.name);
      if (entry.isDirectory()) pending.push(entryPath);
      else if (entry.isFile()) count += 1;
    }
  }
  return count;
}

function validatePhaseB(): ValidationResult {
  const checks = [];

  // Check each phase branch is merged
  for (const phase of REQUIRED_PHASES) {
    const branchName = `claude/${phase}`;
    const isMerged = checkBranchMerged(branchName);
    const hash = getGitCommitHash(branchName);

    checks.push({
      name: `${phase} merged into main`,
      passed: isMerged,
      details: isMerged ? `Branch SHA: ${hash}` : 'Branch not found or not merged',
    });
  }

  return {
    category: 'Phase B Consolidation',
    checks,
  };
}

function validateDirectories(): ValidationResult {
  const checks = [];

  for (const dir of REQUIRED_DIRECTORIES) {
    const exists = checkDirectoryExists(dir);
    const fileCount = exists ? countFilesInDirectory(dir) : 0;

    checks.push({
      name: `Directory exists: ${dir}`,
      passed: exists && fileCount > 0,
      details: exists ? `${fileCount} files found` : 'Directory not found',
    });
  }

  return {
    category: 'Core Module Directories',
    checks,
  };
}

function validateMainBranch(): ValidationResult {
  const checks = [];

  try {
    const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', {
      encoding: 'utf-8',
    })
      .trim();

    checks.push({
      name: 'On main branch',
      passed: currentBranch === 'main',
      details: `Current branch: ${currentBranch}`,
    });
  } catch {
    checks.push({
      name: 'On main branch',
      passed: false,
      details: 'Could not determine current branch',
    });
  }

  try {
    execSync('git diff-index --quiet HEAD --', {
      stdio: 'pipe',
    });
    checks.push({
      name: 'Working tree clean',
      passed: true,
      details: 'No uncommitted changes',
    });
  } catch {
    checks.push({
      name: 'Working tree clean',
      passed: false,
      details: 'Working tree has uncommitted changes',
    });
  }

  return {
    category: 'Repository State',
    checks,
  };
}

function validateTypeScript(): ValidationResult {
  const checks = [];

  try {
    execSync('npm run build', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    checks.push({
      name: 'Next.js build',
      passed: true,
      details: 'Build successful',
    });
  } catch {
    checks.push({
      name: 'Next.js build',
      passed: false,
      details: 'Build failed; inspect the build log before accepting Phase K.',
    });
  }

  return {
    category: 'Build Verification',
    checks,
  };
}

function validateBuildArtifacts(): ValidationResult {
  const checks = [];

  const requiredDirs = ['.next', 'node_modules'];
  for (const dir of requiredDirs) {
    const exists = checkDirectoryExists(dir);
    checks.push({
      name: `Build artifact exists: ${dir}`,
      passed: exists,
      details: exists ? 'Found' : 'Not found',
    });
  }

  return {
    category: 'Build Artifacts',
    checks,
  };
}

function main() {
  console.log('\n' + '='.repeat(60));
  console.log('Phase K Validator - Final Acceptance Framework');
  console.log('='.repeat(60) + '\n');

  const results: ValidationResult[] = [
    validateMainBranch(),
    validatePhaseB(),
    validateDirectories(),
    validateBuildArtifacts(),
    validateTypeScript(),
  ];

  let totalChecks = 0;
  let passedChecks = 0;

  for (const result of results) {
    console.log(`\n${result.category}`);
    console.log('-'.repeat(40));

    for (const check of result.checks) {
      totalChecks++;
      const status = check.passed ? '✓' : '✗';
      const statusColor = check.passed ? '\x1b[32m' : '\x1b[31m';
      const resetColor = '\x1b[0m';

      if (check.passed) {
        passedChecks++;
      }

      console.log(
        `${statusColor}${status}${resetColor} ${check.name}` +
          (check.details ? ` (${check.details})` : '')
      );
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log(`Validation Results: ${passedChecks}/${totalChecks} checks passed`);
  console.log('='.repeat(60));

  const independentReview = process.env.MAUSEAI_PHASE_K_INDEPENDENT_REVIEW === 'true';
  const liveGatesVerified = process.env.MAUSEAI_PHASE_K_LIVE_GATES_VERIFIED === 'true';
  const stakeholderApproval = process.env.MAUSEAI_PHASE_K_STAKEHOLDER_APPROVAL === 'true';
  const closureReady =
    passedChecks === totalChecks &&
    independentReview &&
    liveGatesVerified &&
    stakeholderApproval;

  if (closureReady) {
    console.log(
      '\n✓ All validation checks passed. Phase K closure-ready status: YES'
    );
    console.log(
      '\nNext Steps:'
    );
    console.log('  1. Credentials for Phase C-E testing');
    console.log('  2. Pilot definition for Phase F execution');
    console.log('  3. 5 stakeholder sign-offs for Phase K closure\n');
    process.exit(0);
  } else {
    console.log(`\n✗ ${totalChecks - passedChecks} local validation checks failed or required live/human gates are missing`);
    console.log('  Phase K closure-ready status: NO\n');
    process.exit(1);
  }
}

main();
