# Phase B8 - Judge & Evidence Gate Implementation

## Overview

Phase B8 implements a comprehensive task completion validation system with a 10-criteria judge and evidence-based validation gate. This system ensures that all task completions meet strict quality and security standards before closure.

## Architecture

### Core Components

#### 1. Judge Engine (`judge-engine.ts`)
The main validator that evaluates all 10 criteria for task completion:

**10 Criteria:**
1. **Branch correct?** - Validates that work is on the expected branch
2. **SHA updated?** - Confirms the commit SHA has been properly updated
3. **CI passed?** - Verifies continuous integration pipeline succeeded
4. **Tests passed?** - Confirms all tests executed successfully
5. **Evidence sufficient?** - Ensures adequate supporting documentation exists
6. **Independent review exists?** - Validates code review from different person
7. **Judge ≠ executor?** - Ensures separation of concerns
8. **Dependencies complete?** - Confirms all prerequisite tasks are done
9. **Human approval provided?** - Validates human sign-off if required
10. **Production proof real?** - Verifies production deployment success

**Key Methods:**
```typescript
judge(taskId, context, evidence, judgeId, expectedBranch, expectedSha)
  → Judgment (PASS/FAIL/ESCALATE + canClose boolean)
```

#### 2. Judgment Policy (`judge-policy.ts`)
Configurable policies for different task types:

**Pre-configured Policies:**
- **Standard** - Default policy for general tasks
- **Strict** - All 10 criteria required for critical infrastructure
- **Relaxed** - Fewer requirements for documentation updates
- **Security** - Enhanced review and evidence requirements
- **Hotfix** - Expedited approval for production emergencies

#### 3. Evidence Gate (`evidence-gate.ts`)
Controls the flow of evidence through the validation system:

**Configuration:**
- Minimum evidence required (default: 2)
- Allowed evidence types
- Trusted sources
- Secret detection behavior
- Validation logging

**Factory Methods:**
```typescript
EvidenceGate.createProductionGate()  // Strict, 3+ pieces, fail on secrets
EvidenceGate.createDevelopmentGate() // Lenient, 1+ pieces
EvidenceGate.createSecurityGate()    // Security-focused validation
```

#### 4. Evidence Validator (`evidence-validator.ts`)
Validates evidence and detects/redacts sensitive information.

**Secret Detection Patterns:**
- API keys (`api_key`, `secret`, etc.)
- AWS keys (`AKIA...`)
- JWT tokens
- GitHub tokens (`ghp_...`)
- MongoDB URIs
- Database credentials
- Email addresses
- IP addresses
- Credit card numbers
- Phone numbers

**Validation Features:**
```typescript
validate(evidence)           → EvidenceValidationResult
detectSecrets(text)          → string[]
redactSensitiveData(content) → string
validateForProduction(evidence[]) → { valid, errors, summary }
checkCompleteness(evidence[]) → { complete, missing, hasOptional }
```

## Usage Examples

### Basic Judgment

```typescript
import { JudgeEngine } from '@/core/judge';

const engine = new JudgeEngine();

const judgment = await engine.judge(
  taskId: "task-123",
  context: {
    taskId: "task-123",
    executorId: "alice",
    branch: "feature/auth",
    sha: "abc123def456...",
    ciStatus: "passed",
    testStatus: "passed",
    hasIndependentReview: true,
    approvals: ["bob"],
    dependencies: [],
    productionProof: {
      url: "https://app.example.com/status",
      timestamp: new Date(),
      verified: true
    }
  },
  evidence: [
    {
      id: "ev-1",
      type: "ci_log",
      content: "[CI] Build passed in 2m 45s",
      source: "github-actions",
      timestamp: new Date()
    },
    {
      id: "ev-2",
      type: "test_result",
      content: "✓ 450 tests passed, 0 failed",
      source: "github-actions",
      timestamp: new Date()
    }
  ],
  judgeId: "charlie",
  expectedBranch: "feature/auth"
);

// Result:
// {
//   status: "PASS",
//   canClose: true,
//   criteria: { ... },
//   failureReasons: [],
//   timestamp: Date,
//   judgedBy: "charlie"
// }
```

### Evidence Validation

```typescript
import { EvidenceGate } from '@/core/evidence';

const gate = EvidenceGate.createProductionGate();

const result = await gate.validate([
  {
    id: "ev-1",
    type: "ci_log",
    content: "Build output...",
    source: "github-actions",
    timestamp: new Date()
  },
  // ... more evidence
]);

if (result.passed) {
  console.log("All evidence validated for production");
} else {
  console.log("Issues found:", result.recommendations);
}
```

### Secret Detection

```typescript
import { EvidenceValidator } from '@/core/evidence';

const validator = new EvidenceValidator();

const secrets = validator.detectSecrets(
  'Password: sk_live_REDACTED'
);
// Returns: ["apiKey: sk_live_51HqL..."]

const redacted = validator.redactSensitiveData(content);
// Returns: 'Password: [REDACTED]'
```

### Policy-Based Judgment

```typescript
const policyRegistry = new JudgmentPolicyRegistry();

// Get policy for task type
const policy = policyRegistry.getPolicyForTaskType("security");

// Register custom policy
policyRegistry.registerPolicy({
  name: "custom",
  description: "Custom validation policy",
  requiredCriteria: ["branchCorrect", "ciPassed"],
  requiresHumanApproval: true,
  autoEscalate: ["productionProofReal"]
});
```

## Evidence Types

Supported evidence types:
- `ci_log` - CI/CD pipeline logs
- `test_result` - Test execution results
- `deployment_log` - Deployment records
- `review` - Code review comments
- `approval` - Human approvals
- `commit` - Commit history
- `other` - Custom evidence types

## Trusted Sources

Evidence from these sources is considered trusted:
- GitHub
- GitLab
- Bitbucket
- Jenkins
- CircleCI
- Travis CI
- GitHub Actions
- CodeCov
- SonarQube
- Slack
- Email

## Judgment Outcomes

### PASS
All required criteria met, no issues detected. Task can be closed.

### FAIL
Critical criteria not met. Common reasons:
- Branch mismatch
- SHA not updated
- CI/tests failed
- Insufficient evidence
- Judge is executor
- Secrets detected in evidence

### ESCALATE
Some criteria not met but potentially recoverable. Requires:
- Additional review
- Manual inspection
- Alternative evidence
- Human judgment

## Security Features

### Secret Detection
Automatically detects over 10 types of sensitive information:
- Cryptographic keys and tokens
- Database credentials
- API keys and bearer tokens
- Personal information (email, phone)
- Financial data (credit cards)

### Data Redaction
Sensitive content is automatically redacted:
- Secrets → `[REDACTED]`
- Emails → `[EMAIL]`
- IPs → `[IP]`
- Card numbers → `[CARD]`
- Phone numbers → `[PHONE]`

### Evidence Validation
Ensures evidence integrity:
- No required fields missing
- Content non-empty
- Proper evidence type
- From trusted source
- No secrets in content

## Test Coverage

Comprehensive test suites included:

**Judge Engine Tests** (300+ lines)
- All 10 criteria validation
- Policy management
- Failure reason collection
- Edge cases

**Evidence Validator Tests** (250+ lines)
- Secret detection accuracy
- Redaction effectiveness
- Evidence validation
- Production requirements
- URL extraction
- Completeness checking

**Evidence Gate Tests** (200+ lines)
- Batch validation
- Configuration
- Factory methods
- Recommendations generation
- Edge case handling

## Integration Points

### With Task System
```typescript
import { TaskService } from '@/server/services';
import { JudgeEngine } from '@/core/judge';

// After task completion
const judgment = await engine.judge(
  taskId,
  context,
  evidence,
  judgeId
);

if (judgment.canClose) {
  await taskService.closeTask(taskId);
}
```

### With Evidence Collection
```typescript
import { EvidenceGate } from '@/core/evidence';

// Validate evidence from various sources
const gate = EvidenceGate.createProductionGate();
const validationResult = await gate.validate(collectedEvidence);
```

## Configuration

### Judge Engine
Configure via policy registry:
```typescript
const policy = {
  name: "custom",
  requiredCriteria: [...],
  requiresHumanApproval: true,
  autoEscalate: [...]
};
engine.registerPolicy(policy);
```

### Evidence Gate
Configure strictness level:
```typescript
gate.configure({
  requireMinimumEvidence: 3,
  failOnSecrets: true,
  redactSensitiveData: true
});
```

## Performance Considerations

- Judge operations are O(1) for each criterion
- Evidence validation parallelized where possible
- Secret detection uses optimized regex patterns
- Caching of policy lookups
- Batch validation for multiple evidence items

## Future Enhancements

1. **Machine Learning** - Learn from past judgments to improve criteria weighting
2. **Custom Criteria** - Allow plugins for domain-specific validation
3. **Audit Trail** - Full logging of all judgments and decisions
4. **Appeals Process** - Mechanism to dispute FAIL judgments
5. **Integration** - Pre-built connectors to popular CI/CD platforms
6. **Analytics** - Dashboard showing judgment trends and patterns

## Related Phases

- **B6 - Handoff** - Provides task context to judge
- **B7 - Evidence Collection** - Gathers evidence for validation
- **B9 - Completion** - Uses judge outcome to finalize task

## Files

```
src/core/
├── judge/
│   ├── judge-engine.ts (400+ lines)
│   ├── judge-policy.ts (150+ lines)
│   ├── types.ts
│   ├── index.ts
│   └── __tests__/
│       └── judge-engine.test.ts (300+ lines)
├── evidence/
│   ├── evidence-validator.ts (150+ lines)
│   ├── evidence-gate.ts (300+ lines)
│   ├── index.ts
│   └── __tests__/
│       ├── evidence-validator.test.ts (250+ lines)
│       └── evidence-gate.test.ts (200+ lines)
├── index.ts
└── B8_IMPLEMENTATION.md
```

Total: 1500+ lines of code + 700+ lines of tests
