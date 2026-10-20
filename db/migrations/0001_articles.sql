-- The articles table. The thread graph is computed from these fields and never stored.
create table if not exists articles (
  slug        text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$' and length(slug) <= 80),
  title       text not null check (length(title) between 1 and 140),
  excerpt     text not null default '' check (length(excerpt) <= 300),
  date        date not null,
  read_mins   int  not null check (read_mins between 1 and 120),
  topic       text not null check (topic in ('tailoring','fashion','unified','linux')),
  tags        text[] not null default '{}',
  connects_to jsonb not null default '[]',
  featured    boolean not null default false,
  status      text not null check (status in ('draft','published')),
  body        text not null check (length(body) <= 100000),
  updated_at  timestamptz not null default now()
);
create index if not exists articles_status_date_idx on articles (status, date);
