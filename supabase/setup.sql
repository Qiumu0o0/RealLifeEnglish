-- Run in your Supabase project's SQL Editor. No passwords or secret keys needed.
begin;
create table if not exists public.learning_progress (
  user_id uuid not null references auth.users(id) on delete cascade,
  word_key text not null check (length(word_key) between 1 and 500),
  state text not null check (state in ('known','again','unlearned')),
  changed_at bigint not null check (changed_at >= 0),
  primary key (user_id, word_key)
);
alter table public.learning_progress enable row level security;
revoke all on public.learning_progress from anon;
grant select, insert, update on public.learning_progress to authenticated;
drop policy if exists "Own progress only" on public.learning_progress;
create policy "Own progress only" on public.learning_progress
  for all to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- Invoker rights: RLS applies even when accessed through this RPC.
create or replace function public.sync_progress(changes jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Login required'; end if;
  if jsonb_typeof(changes) <> 'array' or jsonb_array_length(changes) > 10000 then
    raise exception 'Invalid changes';
  end if;
  insert into public.learning_progress as old (user_id, word_key, state, changed_at)
    select auth.uid(), x.word_key, x.state, x.changed_at
    from jsonb_to_recordset(changes) as x(word_key text, state text, changed_at bigint)
    on conflict (user_id, word_key) do update
    set state=excluded.state, changed_at=excluded.changed_at
    where excluded.changed_at > old.changed_at;
  return coalesce((select jsonb_agg(jsonb_build_object('word_key',p.word_key,'state',p.state,'changed_at',p.changed_at))
    from public.learning_progress p where p.user_id=auth.uid()),'[]'::jsonb);
end;
$$;
revoke all on function public.sync_progress(jsonb) from public, anon;
grant execute on function public.sync_progress(jsonb) to authenticated;
commit;
