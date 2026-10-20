-- The contact form now replies by email, WhatsApp or a social profile link.
-- 'linkedin' stays allowed for rows saved before this.
alter table messages drop constraint if exists messages_via_check;
alter table messages add constraint messages_via_check check (via in ('email','whatsapp','social','linkedin'));
