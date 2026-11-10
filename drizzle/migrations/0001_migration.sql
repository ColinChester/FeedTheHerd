create or replace function public.items_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if new.author_id is null then return new; end if;
  select * into p from public.profiles where user_id = new.author_id;
  new.vcount := 0; new.flags := 0; new.vcount_base := 0; new.flags_base := 0; new.verified_at := now(); new.created_at := now();
  new.season_start := null; new.season_end := null; new.match_txt := null;
  if new.end_at <= new.start_at then raise exception 'End time must be after the start time.'; end if;
  if new.end_at <= now() then raise exception 'That end time has already passed.'; end if;
  if public.has_role(new.author_id,'org') and coalesce(p.org,'') <> '' then new.by_role := 'org'; new.by_label := p.org;
  elsif public.is_student(new.author_id) then new.by_role := 'student'; new.by_label := 'Howard student';
  else new.by_role := 'alumni'; new.by_label := 'Howard alum' || coalesce(', class of ' || p.grad_year, ''); end if;
  if new.venue_id is not null then select lat, lng into new.lat, new.lng from public.venues where id = new.venue_id; end if;
  return new;
end $$;