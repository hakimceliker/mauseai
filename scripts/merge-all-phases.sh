#!/bin/bash
# MauseAI Master Merge Script
# Merges all Phase B1-B11 branches to main in dependency-safe order
# Prerequisites: All branches must have independent review approval

set -e  # Exit on error

echo "========================================"
echo "MauseAI Phase B1-B11 Master Merge Script"
echo "========================================"
echo ""

# Configuration
MAIN_BRANCH="main"
MERGE_COUNT=0
FAILED_MERGES=()

# Function to merge a branch
merge_branch() {
    local BRANCH=$1
    local DESCRIPTION=$2

    echo "[${MERGE_COUNT}] Merging $BRANCH: $DESCRIPTION..."

    if git merge --no-ff "$BRANCH" -m "Merge Phase $DESCRIPTION ($BRANCH)"; then
        MERGE_COUNT=$((MERGE_COUNT + 1))
        echo "  ✓ Merged successfully"
    else
        echo "  ✗ Merge failed - conflicts detected"
        FAILED_MERGES+=("$BRANCH")
        echo "  Action: Fix conflicts manually, then run: git merge --continue"
        return 1
    fi
    echo ""
}

# Ensure we're on main branch
echo "Checking out $MAIN_BRANCH..."
git checkout $MAIN_BRANCH || { echo "Failed to checkout $MAIN_BRANCH"; exit 1; }

echo "Pulling latest from remote..."
git pull origin $MAIN_BRANCH || { echo "Failed to pull from remote"; exit 1; }

echo ""
echo "Starting merges in dependency order..."
echo ""

# Phase B1: Contracts (no dependencies)
merge_branch "origin/claude/phase-b1-contracts" "B1 Contracts (dc1b2ff)" || true

# Phase B2: Orchestrator (depends on B1, now in main)
merge_branch "origin/claude/phase-b2-orchestrator" "B2 Orchestrator (e39911a)" || true

# Phase B3: Planner (depends on B1)
merge_branch "origin/claude/phase-b3-planner" "B3 Planner (b39a0eb)" || true

# Phase B4: Agent Registry (depends on B1)
merge_branch "origin/claude/phase-b4-agent-registry" "B4 Agent Registry (7ae3a82)" || true

# Phase B5: Task Engine (depends on B1-B4)
merge_branch "origin/claude/phase-b5-task-engine" "B5 Task Engine (9731194)" || true

# Phase B7: Router (depends on B1, B4)
merge_branch "origin/claude/phase-b7-router" "B7 Router (86d5e70)" || true

# Phase B8: Judge & Evidence Gate (depends on B1, B5)
merge_branch "origin/claude/phase-b8-judge-gate" "B8 Judge & Gate (379bcb0)" || true

# Phase B6: Handoff Engine (depends on B1-B5)
merge_branch "origin/claude/phase-b6-handoff" "B6 Handoff (e5cb510)" || true

# Phase B9: Permission Engine (depends on B1, B5, B7)
merge_branch "origin/claude/phase-b9-permission" "B9 Permission (TBD)" || true

# Phase B10: Recovery & Watchdog (depends on B1-B5, B7)
merge_branch "origin/claude/phase-b10-recovery" "B10 Recovery (TBD)" || true

# Phase B11: Memory/Audit/Cost (depends on all)
merge_branch "origin/claude/phase-b11-memory" "B11 Memory (662a0e4c)" || true

# Support branches
merge_branch "origin/claude/ci-cd-pipeline-and-status" "CI/CD Pipeline" || true
merge_branch "origin/claude/phase-c-e-test-frameworks" "C-E Test Frameworks" || true
merge_branch "origin/claude/phase-f-h-templates" "F-H Templates" || true
merge_branch "origin/claude/phase-i-j-test-structures" "I-J Test Structures" || true
merge_branch "origin/claude/phase-k-final-acceptance" "K Final Acceptance" || true

echo "========================================"
echo "Merge Summary"
echo "========================================"
echo "Successful merges: $MERGE_COUNT"

if [ ${#FAILED_MERGES[@]} -eq 0 ]; then
    echo "Failed merges: 0"
    echo ""
    echo "✓ All phases merged successfully!"
    echo ""
    echo "Next steps:"
    echo "  1. Run tests: npm run test:all-phases"
    echo "  2. Push to remote: git push origin main"
    echo "  3. Verify CI/CD pipeline on GitHub"
    echo ""
    exit 0
else
    echo "Failed merges: ${#FAILED_MERGES[@]}"
    echo "Branches with conflicts:"
    for branch in "${FAILED_MERGES[@]}"; do
        echo "  - $branch"
    done
    echo ""
    echo "Action: Resolve conflicts manually, then run: git merge --continue"
    exit 1
fi
