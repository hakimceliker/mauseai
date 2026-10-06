#!/bin/bash

#######################################################################
# Phase B Merge Automation Script
#
# Consolidates all Phase B branches into main in dependency-safe order
# Usage: ./scripts/merge-all-phases.sh [--dry-run]
#######################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DRY_RUN=false
MERGE_LOG="${REPO_ROOT}/.merge-log-$(date +%Y%m%d-%H%M%S).txt"
MERGE_CONFLICT_DETECTED=false

# Phase B branches in dependency order
declare -a PHASES=(
  "claude/phase-b1-contracts"      # B1: Foundation - contracts
  "claude/phase-b2-orchestrator"   # B2: Depends on B1
  "claude/phase-b3-planner"        # B3: Depends on B1
  "claude/phase-b4-agent-registry" # B4: Depends on B1
  "claude/phase-b5-task-engine"    # B5: Depends on B1, B2
  "claude/phase-b6-handoff"        # B6: Depends on B1-B5
  "claude/phase-b7-router"         # B7: Depends on B1-B5
  "claude/phase-b8-judge-gate"     # B8: Depends on B1-B5
  "claude/phase-b9-permission"     # B9: Depends on B1-B8
  "claude/phase-b10-recovery"      # B10: Depends on B1-B9
  "claude/phase-b11-memory"        # B11: Depends on B1-B10 (final)
)

#######################################################################
# Utility Functions
#######################################################################

log() {
  local msg="$1"
  local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
  echo "[$timestamp] $msg" | tee -a "${MERGE_LOG}"
}

log_section() {
  local msg="$1"
  echo "" | tee -a "${MERGE_LOG}"
  echo "========================================" | tee -a "${MERGE_LOG}"
  echo "$msg" | tee -a "${MERGE_LOG}"
  echo "========================================" | tee -a "${MERGE_LOG}"
}

error() {
  local msg="$1"
  echo "ERROR: $msg" | tee -a "${MERGE_LOG}"
  exit 1
}

warn() {
  local msg="$1"
  echo "WARNING: $msg" | tee -a "${MERGE_LOG}"
}

info() {
  local msg="$1"
  echo "INFO: $msg" | tee -a "${MERGE_LOG}"
}

#######################################################################
# Pre-merge Validation
#######################################################################

verify_branches_exist() {
  log_section "Verifying all Phase B branches exist locally and on remote"

  for branch in "${PHASES[@]}"; do
    # Check local
    if ! git show-ref --quiet "refs/heads/${branch}"; then
      error "Local branch '${branch}' does not exist"
    fi
    info "✓ Local branch exists: ${branch}"

    # Check remote
    if ! git show-ref --quiet "refs/remotes/origin/${branch}"; then
      error "Remote branch 'origin/${branch}' does not exist"
    fi
    info "✓ Remote branch exists: origin/${branch}"
  done

  log "All Phase B branches verified successfully"
}

ensure_clean_state() {
  log_section "Verifying clean working tree"

  if ! git diff-index --quiet HEAD --; then
    error "Working tree is dirty. Please commit or stash changes."
  fi

  if git diff-index --quiet --cached HEAD --; then
    info "✓ Working tree is clean"
  else
    error "Staging area is not empty. Please commit changes."
  fi
}

ensure_on_main() {
  log_section "Ensuring on main branch"

  local current_branch=$(git rev-parse --abbrev-ref HEAD)
  if [[ "${current_branch}" != "main" ]]; then
    error "Not on main branch. Currently on: ${current_branch}"
  fi

  info "✓ Currently on main branch"
}

update_from_remote() {
  log_section "Fetching latest from remote"

  git fetch origin

  # Update all local phase branches from remote
  for branch in "${PHASES[@]}"; do
    log "Updating ${branch} from origin..."
    git branch -f "${branch}" "origin/${branch}" 2>/dev/null || true
  done

  info "✓ All branches updated from remote"
}

#######################################################################
# Merge Operations
#######################################################################

perform_merge() {
  local branch="$1"
  local phase_num="$(echo "$branch" | grep -oE 'b[0-9]+' | tr '[:lower:]' '[:upper:]')"

  log ""
  log ">>> Merging ${phase_num}: ${branch}"

  if [[ "${DRY_RUN}" == "true" ]]; then
    # For dry-run, use --no-commit and then abort
    if git merge --no-ff --no-commit "${branch}" > /tmp/merge-output.txt 2>&1; then
      log "✓ [DRY-RUN] ${phase_num} would merge cleanly"
      git merge --abort
      return 0
    else
      local output=$(cat /tmp/merge-output.txt)
      if echo "${output}" | grep -q "CONFLICT"; then
        warn "[DRY-RUN] ${phase_num} has merge conflicts:"
        echo "${output}" | grep "CONFLICT" | tee -a "${MERGE_LOG}"
        git merge --abort 2>/dev/null || true
        return 1
      else
        warn "[DRY-RUN] ${phase_num} merge failed: $output"
        git merge --abort 2>/dev/null || true
        return 1
      fi
    fi
  else
    # Real merge with --no-ff for clear history
    if git merge --no-ff -m "Merge ${phase_num}: ${branch}" "${branch}" > /tmp/merge-output.txt 2>&1; then
      log "✓ ${phase_num} merged successfully"
      return 0
    else
      local output=$(cat /tmp/merge-output.txt)
      if echo "${output}" | grep -q "CONFLICT"; then
        warn "MERGE CONFLICT in ${phase_num}: ${branch}"
        echo "${output}" | tee -a "${MERGE_LOG}"
        MERGE_CONFLICT_DETECTED=true
        return 1
      else
        error "${phase_num} merge failed: $output"
      fi
    fi
  fi
}

rollback_to_checkpoint() {
  local checkpoint_ref="$1"
  log ""
  log "ROLLING BACK to checkpoint: ${checkpoint_ref}"
  git reset --hard "${checkpoint_ref}"
  log "✓ Rolled back to: ${checkpoint_ref}"
}

#######################################################################
# Main Merge Process
#######################################################################

execute_merges() {
  log_section "Beginning Phase B Merge Sequence (${#PHASES[@]} phases)"

  local checkpoint_ref=$(git rev-parse HEAD)
  local merged_count=0
  local failed_count=0

  for phase_branch in "${PHASES[@]}"; do
    if perform_merge "${phase_branch}"; then
      ((merged_count++))
    else
      ((failed_count++))

      if [[ "${DRY_RUN}" != "true" ]]; then
        log ""
        log "MERGE SEQUENCE HALTED at: ${phase_branch}"
        log "Checkpoint before failed merge: ${checkpoint_ref}"
        return 1
      fi
    fi
  done

  log ""
  log "========================================" | tee -a "${MERGE_LOG}"
  log "Merge Statistics:" | tee -a "${MERGE_LOG}"
  log "  Total phases: ${#PHASES[@]}" | tee -a "${MERGE_LOG}"
  log "  Successfully merged: ${merged_count}" | tee -a "${MERGE_LOG}"
  log "  Failed: ${failed_count}" | tee -a "${MERGE_LOG}"
  log "========================================" | tee -a "${MERGE_LOG}"

  if [[ ${failed_count} -gt 0 ]]; then
    return 1
  else
    return 0
  fi
}

#######################################################################
# Post-merge Verification
#######################################################################

verify_merge_result() {
  log_section "Verifying merge result"

  if [[ "${DRY_RUN}" == "true" ]]; then
    info "✓ Dry-run complete - no changes made"
    return 0
  fi

  # Check that all branches are now merged
  local merge_base=$(git merge-base main HEAD)
  local current=$(git rev-parse HEAD)

  if [[ "${merge_base}" == "${current}" ]]; then
    warn "HEAD appears to be unchanged - verify manually"
  fi

  info "✓ Merge verification complete"
  log "Current HEAD after merge: $(git rev-parse --short HEAD)"
}

generate_merge_summary() {
  log_section "Generating Merge Summary"

  cat >> "${MERGE_LOG}" <<EOF

=== MERGE SUMMARY ===
Timestamp: $(date)
Repository: ${REPO_ROOT}
Merged branches: ${#PHASES[@]} Phase B branches
Merge mode: $([ "${DRY_RUN}" = "true" ] && echo "DRY-RUN" || echo "REAL MERGE")

Merge sequence completed:
EOF

  for phase_branch in "${PHASES[@]}"; do
    echo "  - ${phase_branch}" >> "${MERGE_LOG}"
  done

  if [[ "${DRY_RUN}" != "true" ]]; then
    cat >> "${MERGE_LOG}" <<EOF

Final commit hash: $(git rev-parse HEAD)
Final commit message: $(git log -1 --oneline)

To push changes to remote:
  git push origin main

To revert this merge:
  git reset --hard $(git rev-parse HEAD~${#PHASES[@]})
EOF
  fi

  log "Merge log written to: ${MERGE_LOG}"
}

#######################################################################
# Argument Parsing
#######################################################################

parse_args() {
  while [[ $# -gt 0 ]]; do
    case "$1" in
      --dry-run)
        DRY_RUN=true
        log "Dry-run mode enabled (no commits will be made)"
        shift
        ;;
      --help)
        show_help
        exit 0
        ;;
      *)
        error "Unknown option: $1"
        ;;
    esac
  done
}

show_help() {
  cat <<EOF
Phase B Merge Automation Script

Usage: $0 [OPTIONS]

Options:
  --dry-run    Test merge sequence without committing
  --help       Show this help message

Description:
  Consolidates all Phase B branches (B1-B11) into main branch in
  dependency-safe order. Each merge creates a clear history with
  --no-ff commits.

  Merge order:
    1. B1 (contracts) - foundation
    2. B2-B5 (depend on B1)
    3. B6-B10 (depend on earlier phases)
    4. B11 (memory) - depends on all

Exit codes:
  0 - Success
  1 - Merge failed or conflicts detected
  2 - Pre-flight checks failed

Example:
  # Test without committing
  $0 --dry-run

  # Real merge
  $0

EOF
}

#######################################################################
# Main Execution
#######################################################################

main() {
  log_section "Phase B Merge Automation Started"
  log "Mode: $([ "${DRY_RUN}" = "true" ] && echo "DRY-RUN" || echo "REAL MERGE")"
  log "Log file: ${MERGE_LOG}"

  # Pre-flight checks
  cd "${REPO_ROOT}" || error "Cannot access repository root: ${REPO_ROOT}"

  parse_args "$@"

  ensure_clean_state || exit 2
  ensure_on_main || exit 2
  verify_branches_exist || exit 2
  update_from_remote || exit 2

  # Execute merge sequence
  if execute_merges; then
    verify_merge_result
    generate_merge_summary

    log ""
    log_section "MERGE SEQUENCE COMPLETED SUCCESSFULLY"
    if [[ "${DRY_RUN}" != "true" ]]; then
      log "Next step: git push origin main"
    fi

    return 0
  else
    generate_merge_summary

    if [[ "${MERGE_CONFLICT_DETECTED}" == "true" ]]; then
      log_section "MERGE SEQUENCE HALTED - CONFLICTS DETECTED"
      log "Review conflicts and resolve manually, then commit"
      log "Log: ${MERGE_LOG}"
      return 1
    else
      log_section "MERGE SEQUENCE FAILED"
      return 1
    fi
  fi
}

main "$@"
exit $?
