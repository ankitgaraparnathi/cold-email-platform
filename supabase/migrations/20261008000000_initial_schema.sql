create extension if not exists pgcrypto;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  full_name text not null default '',
  company_name text not null default '',
  timezone text not null default 'UTC',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.profiles (id, email, full_name)
select
  id,
  email,
  coalesce(raw_user_meta_data ->> 'full_name', '')
from auth.users
on conflict (id) do nothing;

create table public.mailboxes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  email text not null,
  provider text not null check (provider in ('gmail', 'microsoft365', 'yahoo')),
  app_password_encrypted text not null,
  status text not null default 'connected' check (status in ('connected', 'disconnected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, email),
  unique (id, user_id)
);

create table public.lead_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  description text not null default '',
  created_at timestamptz not null default now(),
  unique (id, user_id)
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lead_list_id uuid not null,
  name text not null default '',
  email text not null,
  company text not null default '',
  job_title text not null default '',
  website text not null default '',
  created_at timestamptz not null default now(),
  foreign key (lead_list_id, user_id)
    references public.lead_lists (id, user_id) on delete cascade,
  unique (user_id, lead_list_id, email),
  unique (id, user_id)
);

create table public.campaigns (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  lead_list_id uuid not null,
  mailbox_id uuid not null,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'paused', 'completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (lead_list_id, user_id)
    references public.lead_lists (id, user_id) on delete restrict,
  foreign key (mailbox_id, user_id)
    references public.mailboxes (id, user_id) on delete restrict,
  unique (id, user_id)
);

create table public.sequence_steps (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  campaign_id uuid not null,
  step_number integer not null check (step_number > 0),
  subject text not null check (length(trim(subject)) > 0),
  body text not null check (length(trim(body)) > 0),
  delay_days integer not null default 0 check (delay_days >= 0),
  created_at timestamptz not null default now(),
  foreign key (campaign_id, user_id)
    references public.campaigns (id, user_id) on delete cascade,
  unique (campaign_id, step_number),
  unique (id, user_id)
);

create table public.campaign_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  campaign_id uuid not null,
  lead_id uuid,
  event_type text not null
    check (event_type in ('sent', 'opened', 'replied', 'bounced', 'failed')),
  occurred_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb,
  foreign key (campaign_id, user_id)
    references public.campaigns (id, user_id) on delete cascade,
  foreign key (lead_id, user_id)
    references public.leads (id, user_id) on delete set null (lead_id)
);

create index leads_by_owner_list on public.leads (user_id, lead_list_id);
create index campaigns_by_owner_status on public.campaigns (user_id, status);
create index events_by_owner_time on public.campaign_events (user_id, occurred_at desc);
create index events_by_campaign_type on public.campaign_events (campaign_id, event_type);
create index sequence_steps_by_campaign on public.sequence_steps (campaign_id, step_number);

create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger mailboxes_set_updated_at
before update on public.mailboxes
for each row execute function public.set_updated_at();

create trigger campaigns_set_updated_at
before update on public.campaigns
for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', '')
  )
  on conflict (id) do update
    set email = excluded.email;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.mailboxes enable row level security;
alter table public.lead_lists enable row level security;
alter table public.leads enable row level security;
alter table public.campaigns enable row level security;
alter table public.sequence_steps enable row level security;
alter table public.campaign_events enable row level security;

create policy "Users can access their own profile"
on public.profiles for all to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "Users can access their own mailboxes"
on public.mailboxes for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can access their own lead lists"
on public.lead_lists for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can access their own leads"
on public.leads for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can access their own campaigns"
on public.campaigns for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can access their own sequence steps"
on public.sequence_steps for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Users can access their own campaign events"
on public.campaign_events for all to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

grant usage on schema public to authenticated;
grant select, insert, update, delete on
  public.profiles,
  public.mailboxes,
  public.lead_lists,
  public.leads,
  public.campaigns,
  public.sequence_steps,
  public.campaign_events
to authenticated;

revoke select (app_password_encrypted) on public.mailboxes from authenticated;
