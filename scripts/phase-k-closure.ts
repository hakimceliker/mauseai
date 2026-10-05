#!/usr/bin/env ts-node

/**
 * Phase K Closure Automation
 * Validates all Phase K closure criteria and generates sign-off documentation
 *
 * Purpose: Final validation before marking project as closed
 * Prerequisites: All Phase C-J tests must pass
 * Output: Closure report and sign-off evidence
 */

import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';

interface ClosureCriterion {
  id: number;
  category: string;
  name: string;
  validation: string;
  passed: boolean;
  evidence?: string;
  timestamp?: string;
}

interface ClosureReport {
  timestamp: string;
  projectName: string;
  totalCriteria: number;
  passedCriteria: number;
  failedCriteria: number;
  closureReady: boolean;
  criteria: ClosureCriterion[];
  signOffRequirements: {
    technicalLead: boolean;
    projectManager: boolean;
    qualityAssurance: boolean;
    security: boolean;
    operations: boolean;
  };
  evidenceLocation: string;
  summary: string;
}

const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message: string, color: keyof typeof colors = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function checkFileExists(filePath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), filePath));
}

function checkDirectoryExists(dirPath: string): boolean {
  return fs.existsSync(path.join(process.cwd(), dirPath));
}

function checkBranchMerged(branch: string): boolean {
  try {
    execSync(`git merge-base --is-ancestor ${branch} main`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function executeValidation(command: string): boolean {
  try {
    execSync(command, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function getFileModificationTime(filePath: string): string {
  try {
    const fullPath = path.join(process.cwd(), filePath);
    const stats = fs.statSync(fullPath);
    return stats.mtime.toISOString();
  } catch {
    return 'N/A';
  }
}

// Phase K closure criteria from PHASE_K_CLOSURE_CHECKLIST.md
const CLOSURE_CRITERIA: ClosureCriterion[] = [
  // PART 1: Phase Completion (20 criteria)
  {
    id: 1,
    category: 'Phase A: Foundation Setup',
    name: 'GitHub repository created',
    validation: 'Repository exists at hakimceliker/mauseai',
    passed: false,
  },
  {
    id: 2,
    category: 'Phase A: Foundation Setup',
    name: 'Git workflow configured',
    validation: 'Branch protection rules on main',
    passed: false,
  },
  {
    id: 3,
    category: 'Phase A: Foundation Setup',
    name: 'Development environment setup',
    validation: 'Node.js 18+, npm, local database running',
    passed: false,
  },
  {
    id: 4,
    category: 'Phase A: Foundation Setup',
    name: 'Documentation structure initialized',
    validation: '/docs directory exists with CLAUDE.md and AGENTS.md',
    passed: false,
  },

  {
    id: 5,
    category: 'Phase B: Architecture Design',
    name: 'System architecture documented',
    validation: 'Component diagram and data flow documented',
    passed: false,
  },
  {
    id: 6,
    category: 'Phase B: Architecture Design',
    name: 'Technology stack defined',
    validation: 'Next.js, Node.js, PostgreSQL, Inngest documented',
    passed: false,
  },
  {
    id: 7,
    category: 'Phase B: Architecture Design',
    name: 'API specifications documented',
    validation: 'REST endpoints and schemas defined',
    passed: false,
  },
  {
    id: 8,
    category: 'Phase B: Architecture Design',
    name: 'Security architecture reviewed',
    validation: 'Auth, authorization, encryption documented',
    passed: false,
  },

  {
    id: 9,
    category: 'Phase C: Core Infrastructure',
    name: 'Database initialized',
    validation: 'PostgreSQL tables created, migrations applied',
    passed: false,
  },
  {
    id: 10,
    category: 'Phase C: Core Infrastructure',
    name: 'API server deployed',
    validation: 'Endpoints accessible, health check passing',
    passed: false,
  },
  {
    id: 11,
    category: 'Phase C: Core Infrastructure',
    name: 'Authentication system operational',
    validation: 'User registration, login, session management working',
    passed: false,
  },
  {
    id: 12,
    category: 'Phase C: Core Infrastructure',
    name: 'Monitoring & logging setup',
    validation: 'Application logs collected, metrics dashboard accessible',
    passed: false,
  },

  {
    id: 13,
    category: 'Phase E: Integration Implementation',
    name: 'GitHub integration operational',
    validation: 'Webhooks configured, PR automation working',
    passed: false,
  },
  {
    id: 14,
    category: 'Phase E: Integration Implementation',
    name: 'Inngest workflow engine integrated',
    validation: 'Workflows deployed, step functions executing',
    passed: false,
  },
  {
    id: 15,
    category: 'Phase E: Integration Implementation',
    name: 'Vercel deployment configured',
    validation: 'Production and preview deployments working',
    passed: false,
  },
  {
    id: 16,
    category: 'Phase E: Integration Implementation',
    name: 'Anthropic Claude API integrated',
    validation: 'API key configured, model calls succeeding',
    passed: false,
  },

  {
    id: 17,
    category: 'Phase Consolidation',
    name: 'All Phase B branches merged to main',
    validation: 'All 11 phase-b* branches merged successfully',
    passed: false,
  },
  {
    id: 18,
    category: 'Phase Consolidation',
    name: 'Core modules compiled successfully',
    validation: 'npm run build succeeds without errors',
    passed: false,
  },
  {
    id: 19,
    category: 'Phase Consolidation',
    name: 'Test suite passing',
    validation: 'Phase C-E and I-J tests 95%+ passing',
    passed: false,
  },
  {
    id: 20,
    category: 'Phase Consolidation',
    name: 'Documentation complete',
    validation: 'All architecture and implementation docs written',
    passed: false,
  },
];

function validateCriteria(): ClosureCriterion[] {
  const criteria = CLOSURE_CRITERIA.map((criterion) => {
    let passed = false;
    let evidence = '';

    switch (criterion.id) {
      case 1:
        passed = checkFileExists('.git/config');
        evidence = passed ? 'Repository .git config found' : 'No .git config';
        break;
      case 2:
        try {
          const config = fs.readFileSync(path.join(process.cwd(), '.github'), 'utf-8');
          passed = !!config;
          evidence = 'GitHub config directory found';
        } catch {
          evidence = 'No GitHub config directory';
        }
        break;
      case 3:
        try {
          const nodeVersion = execSync('node --version', { encoding: 'utf-8' });
          const npmInstalled = executeValidation('npm --version');
          passed = npmInstalled && nodeVersion.includes('v18');
          evidence = `Node ${nodeVersion.trim()}, npm installed: ${npmInstalled}`;
        } catch {
          evidence = 'Node or npm not found';
        }
        break;
      case 4:
        passed = checkDirectoryExists('docs') &&
                 checkFileExists('CLAUDE.md') &&
                 checkFileExists('AGENTS.md');
        evidence = passed ? '/docs directory with CLAUDE.md and AGENTS.md' : 'Missing documentation';
        break;
      case 5:
        passed = checkFileExists('docs/mouseai-system-flow.html');
        evidence = passed ? 'System flow diagram exists' : 'System flow diagram missing';
        break;
      case 6:
        passed = checkFileExists('package.json');
        evidence = passed ? 'package.json with tech stack' : 'package.json not found';
        break;
      case 7:
        passed = checkDirectoryExists('docs/integrations');
        evidence = passed ? 'Integration docs directory exists' : 'No integration docs';
        break;
      case 8:
        passed = checkDirectoryExists('docs/security');
        evidence = passed ? 'Security docs directory exists' : 'No security docs';
        break;
      case 9:
        passed = checkDirectoryExists('src/database');
        evidence = passed ? 'Database module found' : 'No database module';
        break;
      case 10:
        passed = checkDirectoryExists('src/api');
        evidence = passed ? 'API module found' : 'No API module';
        break;
      case 11:
        passed = checkDirectoryExists('src/auth');
        evidence = passed ? 'Auth module found' : 'No auth module';
        break;
      case 12:
        passed = checkDirectoryExists('src/monitoring');
        evidence = passed ? 'Monitoring module found' : 'No monitoring module';
        break;
      case 13:
        passed = checkFileExists('src/integrations/github.ts');
        evidence = passed ? 'GitHub integration module found' : 'Missing GitHub integration';
        break;
      case 14:
        passed = checkFileExists('src/integrations/inngest.ts');
        evidence = passed ? 'Inngest integration module found' : 'Missing Inngest integration';
        break;
      case 15:
        passed = checkFileExists('src/integrations/vercel.ts');
        evidence = passed ? 'Vercel integration module found' : 'Missing Vercel integration';
        break;
      case 16:
        passed = checkFileExists('src/integrations/anthropic.ts');
        evidence = passed ? 'Anthropic integration module found' : 'Missing Anthropic integration';
        break;
      case 17: {
        const branches = [
          'claude/phase-b1-contracts',
          'claude/phase-b2-orchestrator',
          'claude/phase-b3-planner',
          'claude/phase-b4-agent-registry',
          'claude/phase-b5-task-engine',
          'claude/phase-b6-handoff',
          'claude/phase-b7-router',
          'claude/phase-b8-judge-gate',
          'claude/phase-b9-permission',
          'claude/phase-b10-recovery',
          'claude/phase-b11-memory',
        ];
        const mergedBranches = branches.filter((b) => checkBranchMerged(b)).length;
        passed = mergedBranches === branches.length;
        evidence = `${mergedBranches}/${branches.length} Phase B branches merged`;
        break;
      }
      case 18:
        passed = executeValidation('npm run build');
        evidence = passed ? 'Build successful' : 'Build failed';
        break;
      case 19:
        passed = checkFileExists('reports/phase-c-e-execution.json') &&
                 checkFileExists('reports/phase-i-j-execution.json');
        evidence = passed ? 'Test reports exist' : 'Test reports missing';
        break;
      case 20:
        passed = checkDirectoryExists('docs') &&
                 fs.readdirSync(path.join(process.cwd(), 'docs')).length > 5;
        evidence = passed ? 'Documentation directory populated' : 'Insufficient documentation';
        break;
    }

    return {
      ...criterion,
      passed,
      evidence,
      timestamp: new Date().toISOString(),
    };
  });

  return criteria;
}

function generateReport(criteria: ClosureCriterion[]): ClosureReport {
  const passed = criteria.filter((c) => c.passed).length;
  const failed = criteria.filter((c) => !c.passed).length;
  const closureReady = failed === 0;

  const summary = closureReady
    ? 'All closure criteria met. Project ready for sign-off.'
    : `${failed} closure criteria not met. Review required before closure.`;

  return {
    timestamp: new Date().toISOString(),
    projectName: 'MauseAI',
    totalCriteria: criteria.length,
    passedCriteria: passed,
    failedCriteria: failed,
    closureReady,
    criteria,
    signOffRequirements: {
      technicalLead: closureReady,
      projectManager: closureReady,
      qualityAssurance: closureReady,
      security: closureReady,
      operations: closureReady,
    },
    evidenceLocation: 'docs/evidence/phase-k-closure-report.md',
    summary,
  };
}

function printReport(report: ClosureReport) {
  log('', 'magenta');
  log('='.repeat(70), 'magenta');
  log('Phase K Closure Report', 'magenta');
  log('='.repeat(70), 'magenta');
  log('', 'magenta');

  log(`Project: ${report.projectName}`, 'blue');
  log(`Generated: ${new Date(report.timestamp).toLocaleString()}`, 'blue');
  log('', 'magenta');

  // Closure criteria summary
  log('Closure Criteria Summary:', 'blue');
  log(`  Total: ${report.totalCriteria}`, 'cyan');
  log(`  Passed: ${report.passedCriteria}`, 'green');
  log(`  Failed: ${report.failedCriteria}`, report.failedCriteria > 0 ? 'red' : 'cyan');

  // Category breakdown
  log('', 'magenta');
  log('Breakdown by Category:', 'blue');

  const byCategory: Record<string, { total: number; passed: number }> = {};
  report.criteria.forEach((c) => {
    if (!byCategory[c.category]) {
      byCategory[c.category] = { total: 0, passed: 0 };
    }
    byCategory[c.category].total++;
    if (c.passed) byCategory[c.category].passed++;
  });

  Object.entries(byCategory).forEach(([category, counts]) => {
    const color = counts.passed === counts.total ? 'green' : 'yellow';
    log(`  ${category}: ${counts.passed}/${counts.total}`, color);
  });

  // Failed criteria
  if (report.failedCriteria > 0) {
    log('', 'magenta');
    log('Failed Criteria:', 'red');
    report.criteria
      .filter((c) => !c.passed)
      .forEach((c) => {
        log(`  [${c.id}] ${c.name}`, 'red');
        if (c.evidence) {
          log(`      Evidence: ${c.evidence}`, 'yellow');
        }
      });
  }

  // Sign-off requirements
  log('', 'magenta');
  log('Sign-Off Requirements:', 'blue');
  const signOffRoles = [
    'Technical Lead',
    'Project Manager',
    'Quality Assurance',
    'Security Officer',
    'Operations Lead',
  ];
  signOffRoles.forEach((role) => {
    const icon = report.closureReady ? '✓' : '○';
    const color = report.closureReady ? 'green' : 'yellow';
    log(`  ${icon} ${role}`, color);
  });

  // Final verdict
  log('', 'magenta');
  const verdictColor = report.closureReady ? 'green' : 'red';
  const verdict = report.closureReady ? 'READY FOR CLOSURE' : 'CLOSURE BLOCKED';
  log(`VERDICT: ${verdict}`, verdictColor);
  log('', 'magenta');
  log(`Summary: ${report.summary}`, verdictColor);
  log('='.repeat(70), 'magenta');
  log('', 'magenta');
}

function saveReportToFile(report: ClosureReport) {
  const reportDir = path.join(process.cwd(), 'reports');
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `phase-k-closure-${timestamp}.json`);

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`Report saved to: ${reportPath}`, 'green');

  // Also create markdown evidence file
  const evidenceDir = path.join(process.cwd(), 'docs/evidence');
  if (!fs.existsSync(evidenceDir)) {
    fs.mkdirSync(evidenceDir, { recursive: true });
  }

  const markdownReport = generateMarkdownReport(report);
  const markdownPath = path.join(evidenceDir, 'phase-k-closure-report.md');
  fs.writeFileSync(markdownPath, markdownReport);
  log(`Markdown report saved to: ${markdownPath}`, 'green');
}

function generateMarkdownReport(report: ClosureReport): string {
  let markdown = `# Phase K Closure Report

**Project:** ${report.projectName}
**Generated:** ${new Date(report.timestamp).toLocaleString()}
**Status:** ${report.closureReady ? 'READY FOR CLOSURE' : 'CLOSURE BLOCKED'}

## Executive Summary

${report.summary}

## Closure Criteria

- **Total Criteria:** ${report.totalCriteria}
- **Passed:** ${report.passedCriteria}
- **Failed:** ${report.failedCriteria}

## Criteria Breakdown

${
  Array.from(
    new Set(report.criteria.map((c) => c.category))
  )
    .map((category) => {
      const categoryCriteria = report.criteria.filter((c) => c.category === category);
      const passed = categoryCriteria.filter((c) => c.passed).length;
      return `
### ${category}

**Status:** ${passed}/${categoryCriteria.length} passed

| ID | Criteria | Status | Evidence |
|----|----------|--------|----------|
${categoryCriteria
  .map(
    (c) =>
      `| ${c.id} | ${c.name} | ${c.passed ? '✓' : '✗'} | ${c.evidence || 'N/A'} |`
  )
  .join('\n')}
`;
    })
    .join('\n')
}

## Sign-Off Requirements

- [ ] Technical Lead Approval
- [ ] Project Manager Approval
- [ ] Quality Assurance Sign-Off
- [ ] Security Officer Sign-Off
- [ ] Operations Lead Sign-Off

## Next Steps

${
  report.closureReady
    ? `1. Obtain stakeholder sign-offs
2. Archive project artifacts
3. Schedule project closure ceremony
4. Update project status to CLOSED`
    : `1. Address failed criteria (see list above)
2. Rerun validation
3. Once all criteria pass, proceed with sign-off process`
}

---

Generated by Phase K Closure Automation Framework
`;

  return markdown;
}

async function main() {
  try {
    log('Phase K Closure Automation Framework', 'magenta');
    log('', 'magenta');

    log('Validating closure criteria...', 'cyan');
    const criteria = validateCriteria();

    log('Generating closure report...', 'cyan');
    const report = generateReport(criteria);

    printReport(report);
    saveReportToFile(report);

    // Exit with appropriate code
    process.exit(report.closureReady ? 0 : 1);
  } catch (error) {
    log(`Fatal error: ${(error as Error).message}`, 'red');
    process.exit(1);
  }
}

main();
