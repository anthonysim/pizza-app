create type public.order_status as enum ('pending', 'paid', 'ready', 'picked_up', 'expired');

create table public.staff (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.orders (
  id uuid primary key,
  number bigint generated always as identity unique,
  user_id uuid not null references auth.users(id),
  email text not null,
  items jsonb not null check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) > 0),
  total_cents integer not null check (total_cents > 0),
  currency text not null default 'usd' check (currency = 'usd'),
  status public.order_status not null default 'pending',
  stripe_session_id text unique,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index orders_customer on public.orders (user_id, created_at desc);
create index orders_staff_queue on public.orders (paid_at) where status in ('paid', 'ready');

alter table public.orders enable row level security;
alter table public.staff enable row level security;

revoke all on public.staff, public.orders from anon, authenticated;
grant select on public.staff, public.orders to authenticated;
grant select, insert, update on public.staff, public.orders to service_role;
grant usage on sequence public.orders_number_seq to service_role;

create policy "Read own staff membership" on public.staff
  for select to authenticated using (user_id = (select auth.uid()));

create policy "Read own order or staff queue" on public.orders
  for select to authenticated using (
    user_id = (select auth.uid())
    or (status in ('paid', 'ready', 'picked_up') and exists (
      select 1 from public.staff where user_id = (select auth.uid())
    ))
  );

create function public.advance_order(order_id uuid, current_status public.order_status)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (select 1 from public.staff where user_id = auth.uid()) then
    raise insufficient_privilege using message = 'Staff access required';
  end if;
  if current_status is null or current_status not in ('paid', 'ready') then
    return false;
  end if;
  update public.orders
  set status = case current_status
    when 'paid' then 'ready'::public.order_status
    when 'ready' then 'picked_up'::public.order_status
  end
  where id = order_id and status = current_status;
  return found;
end;
$$;

revoke all on function public.advance_order(uuid, public.order_status) from public, anon;
grant execute on function public.advance_order(uuid, public.order_status) to authenticated;
