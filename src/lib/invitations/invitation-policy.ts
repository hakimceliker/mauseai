import { createHash, randomBytes } from 'crypto';

export type CentralRole = 'owner' | 'admin' | 'member';
export type InvitationStatus = 'sent' | 'accepted' | 'revoked' | 'expired' | 'blocked';

export function normalizeInvitationEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function createInvitationToken(): { token: string; tokenHash: string } {
  const token = randomBytes(32).toString('base64url');
  return { token, tokenHash: hashInvitationToken(token) };
}

export function hashInvitationToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function canCreateMemberInvitation(role: CentralRole): boolean {
  return role === 'owner' || role === 'admin';
}

export function canApprovePrivilege(requesterId: string, approverId: string, approverRole: CentralRole): boolean {
  return requesterId !== approverId && (approverRole === 'owner' || approverRole === 'admin');
}

export function invitationStatusAt(status: InvitationStatus, expiresAt: Date, now = new Date()): InvitationStatus {
  if (status === 'sent' && expiresAt.getTime() <= now.getTime()) return 'expired';
  return status;
}

export function canAcceptInvitation(status: InvitationStatus, expiresAt: Date, now = new Date()): boolean {
  return invitationStatusAt(status, expiresAt, now) === 'sent';
}
