-- Enable pgvector extension for embeddings
create extension if not exists vector with schema extensions;

-- Profiles table
create table public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  title text not null default '',
  summary text not null default '',
  location text,
  skills jsonb not null default '[]'::jsonb,
  experience jsonb not null default '[]'::jsonb,
  education jsonb not null default '[]'::jsonb,
  linkedin_url text,
  portfolio_url text,
  resume_file_url text,
  embedding vector(1536),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Jobs table
create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  company text not null,
  location text not null default '',
  remote boolean not null default false,
  description text not null,
  requirements jsonb not null default '[]'::jsonb,
  nice_to_haves jsonb not null default '[]'::jsonb,
  salary_min integer,
  salary_max integer,
  salary_currency text not null default 'USD',
  experience_level text not null default 'mid',
  employment_type text not null default 'full-time',
  skills jsonb not null default '[]'::jsonb,
  posted_date timestamptz not null default now(),
  source_url text,
  source text not null default 'manual',
  embedding vector(1536),
  created_at timestamptz not null default now()
);

-- Match scores table
create table public.match_scores (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  overall_score numeric(5,2) not null,
  skill_match_score numeric(5,2) not null,
  experience_match_score numeric(5,2) not null,
  education_match_score numeric(5,2) not null,
  culture_fit_score numeric(5,2) not null,
  skill_gaps jsonb not null default '[]'::jsonb,
  strengths jsonb not null default '[]'::jsonb,
  reasoning text not null default '',
  created_at timestamptz not null default now(),
  unique(profile_id, job_id)
);

-- Conversations table
create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'New Conversation',
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'error')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Agent events (stream of events for a conversation)
create table public.agent_events (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  agent_name text not null,
  event_type text not null,
  content text not null,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- Human approval requests
create table public.human_approvals (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  agent_name text not null,
  question text not null,
  options jsonb not null default '[]'::jsonb,
  context jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  response text,
  created_at timestamptz not null default now()
);

-- Agent metrics for observability
create table public.agent_metrics (
  id uuid primary key default gen_random_uuid(),
  agent_name text not null,
  request_id text not null,
  latency_ms integer not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_tokens integer not null default 0,
  cache_write_tokens integer not null default 0,
  total_tokens integer not null default 0,
  estimated_cost numeric(10,6) not null default 0,
  cache_hit boolean not null default false,
  success boolean not null default true,
  error_type text,
  tool_call_count integer not null default 0,
  created_at timestamptz not null default now()
);

-- Indexes
create index idx_profiles_user_id on public.profiles(user_id);
create index idx_profiles_embedding on public.profiles using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_jobs_embedding on public.jobs using ivfflat (embedding vector_cosine_ops) with (lists = 100);
create index idx_jobs_posted_date on public.jobs(posted_date desc);
create index idx_match_scores_profile_id on public.match_scores(profile_id);
create index idx_match_scores_job_id on public.match_scores(job_id);
create index idx_match_scores_overall on public.match_scores(overall_score desc);
create index idx_conversations_user_id on public.conversations(user_id);
create index idx_agent_events_conversation_id on public.agent_events(conversation_id);
create index idx_agent_events_created_at on public.agent_events(created_at);
create index idx_human_approvals_conversation_id on public.human_approvals(conversation_id);
create index idx_agent_metrics_agent_name on public.agent_metrics(agent_name);
create index idx_agent_metrics_created_at on public.agent_metrics(created_at);

-- Row Level Security
alter table public.profiles enable row level security;
alter table public.jobs enable row level security;
alter table public.match_scores enable row level security;
alter table public.conversations enable row level security;
alter table public.agent_events enable row level security;
alter table public.human_approvals enable row level security;

-- RLS Policies
create policy "Users can view own profiles" on public.profiles for select using (auth.uid() = user_id);
create policy "Users can insert own profiles" on public.profiles for insert with check (auth.uid() = user_id);
create policy "Users can update own profiles" on public.profiles for update using (auth.uid() = user_id);

create policy "Anyone can view jobs" on public.jobs for select using (true);
create policy "Authenticated users can insert jobs" on public.jobs for insert with check (auth.role() = 'authenticated');

create policy "Users can view own matches" on public.match_scores for select using (
  profile_id in (select id from public.profiles where user_id = auth.uid())
);

create policy "Users can view own conversations" on public.conversations for select using (auth.uid() = user_id);
create policy "Users can insert own conversations" on public.conversations for insert with check (auth.uid() = user_id);

create policy "Users can view own events" on public.agent_events for select using (
  conversation_id in (select id from public.conversations where user_id = auth.uid())
);

create policy "Users can view own approvals" on public.human_approvals for select using (
  conversation_id in (select id from public.conversations where user_id = auth.uid())
);
create policy "Users can update own approvals" on public.human_approvals for update using (
  conversation_id in (select id from public.conversations where user_id = auth.uid())
);

-- Updated_at trigger
create or replace function public.update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.update_updated_at();

create trigger conversations_updated_at before update on public.conversations
  for each row execute function public.update_updated_at();
