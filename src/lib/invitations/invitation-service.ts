import { getSupabaseAdmin } from '@/src/lib/db/supabase';
import { ForbiddenError, NotFoundError, ConflictError } from '@/src/lib/errors/api-error-handler';
import {
  canAcceptInvitation,
  canApprovePrivilege,
  canCreateMemberInvitation,
  createInvitationToken,
  hashInvitationToken,
  normalizeInvitationEmail,
  type CentralRole,
} from './invitation-policy';

type UserRow = { id: string; tenant_id: string; role: CentralRole; email: string };
type InvitationRow = {
  id: string; tenant_id: string; email: string; role: 'member'; token_hash: string;
  status: 'sent' | 'accepted' | 'revoked' | 'expired' | 'blocked'; invited_by: string;
  expires_at: string; accepted_at: string | null; revoked_at: string | null;
};

async function actor(tenantId: string, actorId: string): Promise<UserRow> {
  const { data, error } = await getSupabaseAdmin()
    .from('users').select('id,tenant_id,role,email').eq('id', actorId).eq('tenant_id', tenantId).single();
  if (error || !data) throw new ForbiddenError();
  return data as UserRow;
}

export async function createMemberInvitation(tenantId: string, actorId: string, email: string) {
  const user = await actor(tenantId, actorId);
  if (!canCreateMemberInvitation(user.role)) throw new ForbiddenError();
  const normalizedEmail = normalizeInvitationEmail(email);
  const { token, tokenHash } = createInvitationToken();
  const db = getSupabaseAdmin();
  const { data, error } = await db.from('invitations').insert({
    tenant_id: tenantId, email: normalizedEmail, role: 'member', token_hash: tokenHash, invited_by: user.id,
  }).select('id,tenant_id,email,role,status,expires_at').single();
  if (error || !data) throw new ConflictError();
  await db.from('audit_logs').insert({
    tenant_id: tenantId, action: 'invitation.created', entity_type: 'invitation', entity_id: data.id,
    actor: user.id, details: { email: normalizedEmail, role: 'member' },
  });
  return { invitation: data, token };
}

export async function acceptInvitation(token: string, acceptingAuthUserId: string, email: string) {
  const db = getSupabaseAdmin();
  const { data: invitation, error } = await db.from('invitations').select('*')
    .eq('token_hash', hashInvitationToken(token)).single();
  if (error || !invitation) throw new NotFoundError();
  const row = invitation as InvitationRow;
  if (!canAcceptInvitation(row.status, new Date(row.expires_at))) throw new ConflictError();
  if (normalizeInvitationEmail(email) !== row.email) throw new ForbiddenError();
  const { data: existing } = await db.from('users').select('id').eq('tenant_id', row.tenant_id).eq('auth_user_id', acceptingAuthUserId).maybeSingle();
  if (existing) throw new ConflictError();
  const { data: member, error: memberError } = await db.from('users').insert({
    tenant_id: row.tenant_id, email: row.email, auth_user_id: acceptingAuthUserId, role: 'member',
  }).select('id,tenant_id,email,role').single();
  if (memberError || !member) throw new ConflictError();
  const acceptedAt = new Date().toISOString();
  await db.from('invitations').update({ status: 'accepted', accepted_user_id: member.id, accepted_at: acceptedAt, updated_at: acceptedAt }).eq('id', row.id).eq('status', 'sent');
  await db.from('audit_logs').insert({
    tenant_id: row.tenant_id, action: 'invitation.accepted', entity_type: 'invitation', entity_id: row.id,
    actor: acceptingAuthUserId, details: { role: 'member' },
  });
  return member;
}

export async function requestPrivilege(tenantId: string, actorId: string, invitationId: string, requestedRole: 'admin' | 'owner') {
  const user = await actor(tenantId, actorId);
  if (!canCreateMemberInvitation(user.role)) throw new ForbiddenError();
  const db = getSupabaseAdmin();
  const { data: invitation } = await db.from('invitations').select('id,status,tenant_id').eq('id', invitationId).eq('tenant_id', tenantId).single();
  if (!invitation || invitation.status !== 'accepted') throw new ConflictError();
  const { data, error } = await db.from('privilege_approvals').insert({ tenant_id: tenantId, invitation_id: invitationId, requested_role: requestedRole, requested_by: actorId }).select('id,status,requested_role').single();
  if (error || !data) throw new ConflictError();
  return data;
}

export async function approvePrivilege(tenantId: string, actorId: string, approvalId: string) {
  const user = await actor(tenantId, actorId);
  const db = getSupabaseAdmin();
  const { data: approval } = await db.from('privilege_approvals').select('*').eq('id', approvalId).eq('tenant_id', tenantId).single();
  if (!approval || approval.status !== 'second_approval_required') throw new NotFoundError();
  if (!canApprovePrivilege(approval.requested_by, actorId, user.role)) throw new ForbiddenError();
  const approvedAt = new Date().toISOString();
  const { data, error } = await db.from('privilege_approvals').update({ status: 'approved', approved_by: actorId, approved_at: approvedAt }).eq('id', approvalId).eq('status', 'second_approval_required').select('id,status,requested_role').single();
  if (error || !data) throw new ConflictError();
  const { data: approvalInvitation } = await db.from('privilege_approvals').select('invitation_id').eq('id', approvalId).single();
  if (approvalInvitation) {
    const { data: invitation } = await db.from('invitations').select('accepted_user_id').eq('id', approvalInvitation.invitation_id).single();
    if (!invitation?.accepted_user_id) throw new ConflictError();
    const { error: roleError } = await db.from('users').update({ role: data.requested_role }).eq('id', invitation.accepted_user_id).eq('tenant_id', tenantId);
    if (roleError) throw new ConflictError();
  }
  await db.from('audit_logs').insert({
    tenant_id: tenantId, action: 'privilege.approved', entity_type: 'privilege_approval', entity_id: approvalId,
    actor: actorId, details: { role: data.requested_role },
  });
  return data;
}
