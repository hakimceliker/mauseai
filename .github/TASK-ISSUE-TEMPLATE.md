# MOUSE Task Issue Template

Use this template for every GitHub issue that creates a MOUSE-NNN task.

---

## Template

```markdown
# MOUSE-NNN: [Task Title]

## Description
[1-2 sentence: What needs to be done and why?]

## Goal
[Specific, measurable outcome]

Example:
```
Implement GPT-Claude AI router that selects between models based on 
task type and cost budget. Reduce API costs by 30% while maintaining 
quality on complex reasoning tasks.
```

## Acceptance Criteria
- [ ] Criterion 1 — [How it will be verified]
- [ ] Criterion 2 — [How it will be verified]
- [ ] Criterion 3 — [How it will be verified]

Example:
```
- [ ] Router selects GPT for 80% of tasks (latency <100ms)
- [ ] Router selects Claude for complex reasoning tasks
- [ ] Circuit breaker prevents cascading failures if API down
- [ ] Cost tracking accurate to ±10%
- [ ] 85%+ test coverage with critical paths tested
```

## Phase and Timeline
- **Phase**: [Aşama N, Faz M]
- **Estimated Effort**: [1-3 days|1 week|2 weeks|> 1 month]
- **Deadline**: [YYYY-MM-DD or "No specific deadline"]
- **Blocked By**: [List MOUSE-NNN dependencies or "None"]

## Resources and Context
- **Related Issues**: [Link to #123, #124]
- **Related Documentation**: [Link to RFC, design doc]
- **Key Reference**: [Link to D01, D12, etc.]

Example:
```
- RFC: /docs/rfc/RFC-001-ai-router.md
- Role Matrix: /docs/D14-ai-tool-role-matrix.md
- Related tasks: #120 (Task API), #119 (Cost tracking)
```

## Risk Level
- **Level**: [L0|L1|L2|L3]
- **Brief Explanation**: [If L2 or L3, explain why]

Example:
```
Level L2 (Moderate) — User-facing feature, requires Claude review.
```

## Budget and Cost
- **Estimated Cost**: [$X.XX or "TBD"]
- **Threshold**: [$Y.YY max budget]
- **Cost Breakdown**:
  - GPT tokens: [estimate or "TBD"]
  - Compute (CI): [estimate or "TBD"]
  - Other services: [if any]

Example:
```
Estimated: $0.50 (50K GPT input tokens + 25K output + CI)
Threshold: $1.00 (abort if exceeded)
```

## Technical Notes
[Optional technical details for developer]

Example:
```
- Must use existing domain contracts (TaskModel, ConversationModel)
- Circuit breaker should support configurable thresholds
- Need to handle both streaming and non-streaming responses
- Consider performance: target <100ms p99 latency
```

## Success Metrics
[How will we measure success after deployment?]

Example:
```
- [ ] API latency (p99): <100ms (measure with CloudFlare)
- [ ] Error rate: <0.1% (check Sentry)
- [ ] Cost: -30% vs previous quarter (check billing)
- [ ] User satisfaction: >4/5 in feedback (check Support tickets)
```

## Relevant Standards
- [TASK-ID-STANDARD](/docs/standards/TASK-ID-STANDARD.md)
- [PHASE-NAMING-STANDARD](/docs/standards/PHASE-NAMING-STANDARD.md)
- [FILE-OWNERSHIP](/docs/standards/FILE-OWNERSHIP.md)
- [PR-CI-RULES](/docs/standards/PR-CI-RULES.md)
- [SECRET-LAW](/docs/standards/SECRET-LAW.md)

## Notes for Reviewer/Approver
[Any special considerations for Claude or Owner reviewing this task]

Example:
```
- Security: Ensure no hardcoded keys or credentials
- Performance: Run load tests before production deployment
- Data: No customer data exposed in logs
```

## Checklist for Author
- [ ] Acceptance criteria are clear and testable
- [ ] Resources and docs are linked
- [ ] Risk level assigned
- [ ] Budget estimated or marked as TBD
- [ ] Dependencies documented
- [ ] Success metrics defined

## Checklist for Coordinator (Assigning Task)
- [ ] Assigned MOUSE-NNN ID
- [ ] Labeled: phase/N, stage/M
- [ ] Assigned to developer
- [ ] All resources gathered
- [ ] Previous task (if any) is merged
- [ ] Milestone set

## Checklist for Owner (Approval Before Start)
- [ ] Task aligns with roadmap
- [ ] Cost is within budget
- [ ] Risk level accepted
- [ ] Timeline feasible
- [ ] All dependencies unblocked
- [ ] Approval recorded

---

## Related Issue / PR / Commit
- Relates to: #[issue_number]
- Blocks: #[issue_number]
- Blocked by: #[issue_number]
- Implementation: [Branch name will be: feat/MOUSE-NNN-short-name]

---

/cc @hakimceliker (owner) @claude (reviewer)
```

---

## Labels to Apply

Always apply these labels when creating a MOUSE task:

- `task/mouse` — This is a MOUSE-NNN task
- `stage/0`, `stage/1`, `stage/2`, or `stage/3` — Which stage
- `phase/1`, `phase/2`, ... `phase/14` — Which phase (if applicable)
- `priority/p0`, `priority/p1`, or `priority/p2` — Priority level
- `status/ready` — Ready to start work

Optional labels:
- `type/feature` — New feature
- `type/bugfix` — Bug fix
- `type/docs` — Documentation
- `type/test` — Testing
- `type/refactor` — Refactoring

---

## Creating the Issue in GitHub UI

1. Click "New Issue"
2. Select this template: "MOUSE Task Issue Template"
3. Fill in all sections
4. Apply labels from list above
5. Assign to developer once Coordinator approves
6. Click "Create Issue"
7. Coordinator adds MOUSE-NNN ID in title

---

## Example: Complete Issue

```markdown
# MOUSE-020: Repository Skeleton Setup

## Description
Set up the core repository structure including linting, testing, 
formatting, and CI/CD foundations. This is a prerequisite for all 
subsequent feature work.

## Goal
Create a production-ready repository with:
- TypeScript configuration and strict mode
- ESLint and Prettier setup
- Jest testing framework with %80+ coverage target
- GitHub Actions CI/CD pipeline
- Environment configuration for dev/staging/prod
- Pre-commit hooks to prevent common mistakes

## Acceptance Criteria
- [ ] repo structure with src/, test/, docs/ — verified via ls
- [ ] TypeScript tsconfig.json with strict: true — verified via npm run typecheck
- [ ] ESLint configuration with 0 errors — verified via npm run lint
- [ ] Prettier configuration matching team style — verified via npm run format
- [ ] Jest setup with example test passing — verified via npm run test
- [ ] GitHub Actions workflows for lint/test/build — verified via Actions tab
- [ ] Pre-commit hooks preventing unformatted code — verified via git commit
- [ ] README.md with dev setup instructions — verified by new developer

## Phase and Timeline
- **Phase**: Aşama 1, Faz 1
- **Estimated Effort**: 2-3 days
- **Deadline**: 2026-10-05
- **Blocked By**: None

## Resources and Context
- **Related Issues**: N/A (initial task)
- **Related Documentation**: /docs/standards/PR-CI-RULES.md
- **Key Reference**: /docs/D01-final-constitution.md

## Risk Level
- **Level**: L1
- **Explanation**: Foundation task, internal only, low user impact

## Budget and Cost
- **Estimated Cost**: $0.10
- **Threshold**: $0.50
- **Cost Breakdown**:
  - GPT tokens: ~$0.05
  - CI minutes: ~$0.05

## Technical Notes
- Use Node 18 LTS for all environments
- TypeScript strict mode required (no `any` without comment)
- Test coverage threshold: 80% (will fail in CI if lower)
- Pre-commit hooks should run linting only (tests run in CI)
- .gitignore must include node_modules, .env.local, dist/

## Success Metrics
- [ ] CI pipeline runs on every PR (GitHub Actions green)
- [ ] All team members can run `npm install && npm test` locally
- [ ] No merge without all checks passing
- [ ] Developer setup time: <15 minutes

## Relevant Standards
- [TASK-ID-STANDARD](/docs/standards/TASK-ID-STANDARD.md)
- [PHASE-NAMING-STANDARD](/docs/standards/PHASE-NAMING-STANDARD.md)
- [PR-CI-RULES](/docs/standards/PR-CI-RULES.md)

## Notes for Reviewer/Approver
- Security: Ensure no secrets in .env.example
- Performance: CI should complete in <10 minutes
- Ensure backwards compatibility if updating node version

## Checklist for Author
- [x] Acceptance criteria clear
- [x] Resources linked
- [x] Risk level assigned
- [x] Budget estimated
- [x] Success metrics defined

## Checklist for Coordinator
- [x] Assigned MOUSE-020
- [x] Labeled: stage/1, phase/1, priority/p0
- [x] Assigned to GPT
- [x] No blocking dependencies

## Checklist for Owner
- [x] Aligned with roadmap
- [x] Cost within budget
- [x] Risk accepted
- [x] Timeline feasible

---

/cc @hakimceliker (owner)
```

---

## Tips for Better Issues

✓ **DO**:
- Be specific: "Add X feature that does Y in order to Z"
- Include acceptance criteria that are testable
- Provide context and links to related docs
- Estimate effort realistically
- Define success metrics upfront

✗ **DON'T**:
- Leave acceptance criteria vague
- Forget to link related issues
- Omit budget or risk level
- Create issues without timeline
- Assign MOUSE-NNN yourself (Coordinator does it)

---

**Template Version**: 1.0  
**Effective**: 2026-09-28  
**Related**: [TASK-ID-STANDARD](/docs/standards/TASK-ID-STANDARD.md)
