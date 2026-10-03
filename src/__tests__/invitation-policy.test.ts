import { describe, expect, it } from 'vitest';
import {
  canAcceptInvitation,
  canApprovePrivilege,
  canCreateMemberInvitation,
  createInvitationToken,
  hashInvitationToken,
  normalizeInvitationEmail,
} from '@/src/lib/invitations/invitation-policy';

describe('central invitation policy', () => {
  it('allows one owner/admin to create only a member invitation', () => {
    expect(canCreateMemberInvitation('owner')).toBe(true);
    expect(canCreateMemberInvitation('admin')).toBe(true);
    expect(canCreateMemberInvitation('member')).toBe(false);
  });

  it('requires a distinct privileged approver', () => {
    expect(canApprovePrivilege('requester', 'requester', 'owner')).toBe(false);
    expect(canApprovePrivilege('requester', 'approver', 'owner')).toBe(true);
    expect(canApprovePrivilege('requester', 'approver', 'member')).toBe(false);
  });

  it('normalizes email and hashes a single-use token without exposing the hash', () => {
    const { token, tokenHash } = createInvitationToken();
    expect(normalizeInvitationEmail('  User@Example.COM ')).toBe('user@example.com');
    expect(token.length).toBeGreaterThanOrEqual(32);
    expect(tokenHash).toBe(hashInvitationToken(token));
    expect(tokenHash).not.toBe(token);
  });

  it('rejects expired or non-sent invitations', () => {
    expect(canAcceptInvitation('sent', new Date(Date.now() - 1))).toBe(false);
    expect(canAcceptInvitation('revoked', new Date(Date.now() + 60_000))).toBe(false);
    expect(canAcceptInvitation('sent', new Date(Date.now() + 60_000))).toBe(true);
  });
});
