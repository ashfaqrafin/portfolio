-- Messages from the public contact form. Read and deleted only in the owner's studio.
create table if not exists messages (
  id          uuid primary key,
  created_at  timestamptz not null default now(),
  name        text not null default '' check (length(name) <= 60),
  via         text not null check (via in ('email','linkedin')),
  reply       text not null check (length(reply) between 1 and 254),
  message     text not null check (length(message) between 10 and 600)
);
create index if not exists messages_created_idx on messages (created_at desc);
