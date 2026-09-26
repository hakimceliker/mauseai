create extension if not exists pgcrypto;

create table if not exists public.tenants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  role text not null default 'member' check (role in ('owner','admin','member')),
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  goal text not null check (char_length(goal) between 5 and 2000),
  status text not null check (status in ('pending','planning','running','waiting_approval','paused','completed','failed','cancelled')),
  risk_level text not null check (risk_level in ('L1','L2','L3','L4')),
  workflow_id uuid,
  current_step_id uuid,
  budget_limit_cents integer check (budget_limit_cents is null or budget_limit_cents > 0),
  spent_cents integer not null default 0 check (spent_cents >= 0),
  metadata jsonb not null default '{}'::jsonb,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflows (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  name text not null,
  version integer not null default 1 check (version > 0),
  graph jsonb not null default '{"nodes":[],"edges":[]}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.steps (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  workflow_id uuid not null references public.workflows(id) on delete cascade,
  node_id text not null,
  name text not null,
  status text not null check (status in ('pending','running','completed','failed','skipped','waiting')),
  attempt integer not null default 1 check (attempt > 0),
  input jsonb,
  output jsonb,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checkpoints (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  step_id uuid not null references public.steps(id) on delete cascade,
  state jsonb not null,
  version integer not null check (version > 0),
  created_at timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  step_id uuid references public.steps(id) on delete set null,
  actor_type text not null check (actor_type in ('user','system','gpt','claude','worker','policy')),
  actor_id text not null,
  action text not null,
  resource_type text not null,
  resource_id uuid,
  payload jsonb,
  cost_cents integer check (cost_cents is null or cost_cents >= 0),
  risk_level text check (risk_level is null or risk_level in ('L1','L2','L3','L4')),
  created_at timestamptz not null default now()
);

create table if not exists public.idempotency_keys (
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  key text not null,
  request_hash text not null,
  status_code integer not null,
  response jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  primary key (tenant_id, key)
);

create table if not exists public.cost_events (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  step_id uuid references public.steps(id) on delete set null,
  provider text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cost_cents integer not null check (cost_cents >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  external_thread_id text,
  channel text not null check (channel in ('email','whatsapp','system')),
  state text not null default 'open' check (state in ('open','waiting_customer','waiting_approval','resolved','blocked')),
  subject text,
  customer_email text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  direction text not null check (direction in ('inbound','outbound','internal')),
  sender_type text not null check (sender_type in ('customer','user','gpt','claude','system')),
  body text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  conversation_id uuid references public.conversations(id) on delete set null,
  task_id uuid references public.tasks(id) on delete set null,
  list_price_cents integer not null check (list_price_cents >= 0),
  offered_price_cents integer not null check (offered_price_cents >= 0),
  discount_limit_percent numeric(5,2) not null default 0,
  status text not null default 'draft' check (status in ('draft','waiting_approval','approved','sent','accepted','rejected','expired')),
  policy_result jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_tenant_created_idx on public.tasks(tenant_id, created_at desc);
create index if not exists idx_tasks_tenant_id on public.tasks(tenant_id);
create index if not exists idx_tasks_tenant_status on public.tasks(tenant_id, status);
create index if not exists idx_tasks_created_by on public.tasks(created_by);
create index if not exists idx_tasks_active on public.tasks(tenant_id, created_at desc) where status not in ('completed', 'cancelled', 'failed');
create index if not exists steps_task_idx on public.steps(task_id, created_at);
create index if not exists idx_steps_tenant_task on public.steps(tenant_id, task_id);
create unique index if not exists idx_steps_idempotent on public.steps(task_id, node_id, attempt);
create index if not exists idx_checkpoints_tenant_task on public.checkpoints(tenant_id, task_id);
create index if not exists audit_tenant_created_idx on public.audit_logs(tenant_id, created_at desc);
create index if not exists profiles_tenant_idx on public.profiles(tenant_id);
create index if not exists idx_conversations_tenant on public.conversations(tenant_id);
create index if not exists conversations_tenant_updated_idx on public.conversations(tenant_id, updated_at desc);
create index if not exists idx_messages_tenant_conversation on public.messages(tenant_id, conversation_id);
create index if not exists messages_conversation_created_idx on public.messages(conversation_id, created_at);
create index if not exists idx_offers_tenant on public.offers(tenant_id);
create index if not exists offers_tenant_created_idx on public.offers(tenant_id, created_at desc);
create index if not exists idx_idempotency_expires on public.idempotency_keys(expires_at);
create index if not exists idx_cost_events_tenant_created on public.cost_events(tenant_id, created_at desc);
create unique index if not exists idx_checkpoints_unique on public.checkpoints(task_id, step_id, version);

alter table public.tenants enable row level security;
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.workflows enable row level security;
alter table public.steps enable row level security;
alter table public.checkpoints enable row level security;
alter table public.audit_logs enable row level security;
alter table public.idempotency_keys enable row level security;
alter table public.cost_events enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;
alter table public.offers enable row level security;

create or replace function public.current_tenant_id() returns uuid
language sql stable security definer set search_path = public
as $$ select tenant_id from public.profiles where user_id = auth.uid() limit 1 $$;

create or replace function public.current_user_role() returns text
language sql stable security definer set search_path = public
as $$ select role from public.profiles where user_id = auth.uid() limit 1 $$;

create or replace function public.is_tenant_member(check_tenant_id uuid) returns boolean
language sql stable security definer set search_path = public
as $$ select exists (select 1 from public.profiles where user_id = auth.uid() and tenant_id = check_tenant_id) $$;

create or replace function public.protect_profile_security_fields() returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if auth.uid() = old.user_id and public.current_user_role() not in ('owner','admin') then
    new.user_id := old.user_id;
    new.tenant_id := old.tenant_id;
    new.role := old.role;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_security_fields on public.profiles;
create trigger protect_profile_security_fields
before update on public.profiles
for each row execute function public.protect_profile_security_fields();

drop policy if exists tenants_member_select on public.tenants;
drop policy if exists tenants_select_own on public.tenants;
drop policy if exists tenants_update_owner on public.tenants;
create policy tenants_select_own on public.tenants for select using (id = public.current_tenant_id());
create policy tenants_update_owner on public.tenants for update using (id = public.current_tenant_id() and public.current_user_role() = 'owner') with check (id = public.current_tenant_id());

drop policy if exists profiles_self_or_tenant_select on public.profiles;
drop policy if exists profiles_select_own on public.profiles;
drop policy if exists profiles_select_tenant on public.profiles;
drop policy if exists profiles_owner_admin_update on public.profiles;
drop policy if exists profiles_update_own on public.profiles;
create policy profiles_select_own on public.profiles for select using (user_id = auth.uid());
create policy profiles_select_tenant on public.profiles for select using (tenant_id = public.current_tenant_id());
create policy profiles_update_own on public.profiles for update using (user_id = auth.uid()) with check (user_id = auth.uid() and tenant_id = public.current_tenant_id());
create policy profiles_owner_admin_update on public.profiles for update using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('owner','admin')) with check (tenant_id = public.current_tenant_id());

drop policy if exists tasks_tenant_select on public.tasks;
drop policy if exists tasks_select_tenant on public.tasks;
drop policy if exists tasks_tenant_insert on public.tasks;
drop policy if exists tasks_insert_member on public.tasks;
drop policy if exists tasks_tenant_update on public.tasks;
drop policy if exists tasks_update_owner_or_admin on public.tasks;
drop policy if exists tasks_delete_admin on public.tasks;
create policy tasks_select_tenant on public.tasks for select using (tenant_id = public.current_tenant_id());
create policy tasks_insert_member on public.tasks for insert with check (tenant_id = public.current_tenant_id() and created_by = auth.uid());
create policy tasks_update_owner_or_admin on public.tasks for update using (tenant_id = public.current_tenant_id() and (created_by = auth.uid() or public.current_user_role() in ('owner','admin'))) with check (tenant_id = public.current_tenant_id());
create policy tasks_delete_admin on public.tasks for delete using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('owner','admin'));

drop policy if exists workflows_tenant_all on public.workflows;
create policy workflows_tenant_all on public.workflows for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

drop policy if exists steps_tenant_all on public.steps;
drop policy if exists steps_select_tenant on public.steps;
drop policy if exists steps_insert_tenant on public.steps;
drop policy if exists steps_update_tenant on public.steps;
create policy steps_select_tenant on public.steps for select using (tenant_id = public.current_tenant_id());
create policy steps_insert_tenant on public.steps for insert with check (tenant_id = public.current_tenant_id());
create policy steps_update_tenant on public.steps for update using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

drop policy if exists checkpoints_tenant_all on public.checkpoints;
drop policy if exists checkpoints_select_tenant on public.checkpoints;
drop policy if exists checkpoints_insert_tenant on public.checkpoints;
create policy checkpoints_select_tenant on public.checkpoints for select using (tenant_id = public.current_tenant_id());
create policy checkpoints_insert_tenant on public.checkpoints for insert with check (tenant_id = public.current_tenant_id());

drop policy if exists audit_tenant_select on public.audit_logs;
drop policy if exists audit_select_tenant on public.audit_logs;
drop policy if exists audit_tenant_insert on public.audit_logs;
create policy audit_select_tenant on public.audit_logs for select using (tenant_id = public.current_tenant_id());

drop policy if exists idempotency_tenant_select on public.idempotency_keys;
drop policy if exists idempotency_tenant_insert on public.idempotency_keys;
create policy idempotency_tenant_select on public.idempotency_keys for select using (tenant_id = public.current_tenant_id());
create policy idempotency_tenant_insert on public.idempotency_keys for insert with check (tenant_id = public.current_tenant_id());
drop policy if exists cost_events_tenant_select on public.cost_events;
create policy cost_events_tenant_select on public.cost_events for select using (tenant_id = public.current_tenant_id());

drop policy if exists conversations_tenant_all on public.conversations;
drop policy if exists conversations_all_tenant on public.conversations;
create policy conversations_all_tenant on public.conversations for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

drop policy if exists messages_tenant_all on public.messages;
drop policy if exists messages_all_tenant on public.messages;
create policy messages_all_tenant on public.messages for all using (tenant_id = public.current_tenant_id()) with check (tenant_id = public.current_tenant_id());

drop policy if exists offers_tenant_all on public.offers;
drop policy if exists offers_select_tenant on public.offers;
drop policy if exists offers_insert_member on public.offers;
drop policy if exists offers_update_admin on public.offers;
create policy offers_select_tenant on public.offers for select using (tenant_id = public.current_tenant_id());
create policy offers_insert_member on public.offers for insert with check (tenant_id = public.current_tenant_id());
create policy offers_update_admin on public.offers for update using (tenant_id = public.current_tenant_id() and public.current_user_role() in ('owner','admin')) with check (tenant_id = public.current_tenant_id());
