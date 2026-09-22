-- ============================================================
--  Banco de dados do site de ingressos — Flecha de Fogo
--  Rode este script no Supabase: menu "SQL Editor" > New query
--  > cole tudo > Run.
-- ============================================================

-- Pedidos de compra
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  reference text unique not null,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text not null,
  quantity int not null check (quantity > 0),
  unit_price_cents int not null,
  total_cents int not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'cancelled')),
  comprovante_path text,
  created_at timestamptz not null default now(),
  confirmed_at timestamptz
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_idx on public.orders (created_at desc);

-- Ingressos individuais (um por lugar), gerados ao confirmar o pedido
create table if not exists public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  code text unique not null,
  holder_name text,
  checked_in boolean not null default false,
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists tickets_order_idx on public.tickets (order_id);

-- Segurança: RLS ligado e SEM políticas públicas.
-- Todo acesso é feito pelo servidor com a Service Role Key, que ignora o RLS.
-- Assim, nada é acessível direto do navegador.
alter table public.orders enable row level security;
alter table public.tickets enable row level security;

-- ============================================================
--  Storage: bucket privado para os comprovantes de pagamento
-- ============================================================
insert into storage.buckets (id, name, public)
values ('comprovantes', 'comprovantes', false)
on conflict (id) do nothing;
