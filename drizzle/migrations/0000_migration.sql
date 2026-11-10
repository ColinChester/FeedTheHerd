
create type public.app_role as enum ('student','org','alumni');

create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "read own roles" on public.user_roles for select to authenticated using (user_id = auth.uid());

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
create or replace function public.is_student(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role in ('student','org'))
$$;
create or replace function public.is_verified(_user_id uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id)
$$;

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text,
  org text not null default '',
  grad_year int,
  howard_id text,
  notify_deals boolean not null default true,
  notify_events boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "read own profile" on public.profiles for select to authenticated using (user_id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Identity fields are fixed at signup; users may only change notification prefs
create or replace function public.profiles_lock_identity()
returns trigger language plpgsql set search_path = public as $$
begin
  new.email := old.email; new.org := old.org; new.grad_year := old.grad_year; new.howard_id := old.howard_id; new.user_id := old.user_id;
  return new;
end $$;
create trigger profiles_lock_identity before update on public.profiles for each row execute function public.profiles_lock_identity();

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare g int;
begin
  begin g := nullif(new.raw_user_meta_data->>'grad_year','')::int; exception when others then g := null; end;
  insert into public.profiles (user_id, email, org, grad_year, howard_id)
  values (new.id, new.email, coalesce(left(trim(new.raw_user_meta_data->>'org'),80),''), g, nullif(new.raw_user_meta_data->>'howard_id',''))
  on conflict (user_id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created_profile after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.grant_howard_roles()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if new.email_confirmed_at is null then return new; end if;
  select * into p from public.profiles where user_id = new.id;
  if lower(split_part(new.email,'@',2)) = 'bison.howard.edu' then
    insert into public.user_roles(user_id, role) values (new.id,'student') on conflict do nothing;
    if coalesce(p.org,'') <> '' then
      insert into public.user_roles(user_id, role) values (new.id,'org') on conflict do nothing;
    end if;
  elsif p.howard_id ~ '^@?[0-9]{8}$' and p.grad_year is not null then
    insert into public.user_roles(user_id, role) values (new.id,'alumni') on conflict do nothing;
  end if;
  return new;
end $$;
create trigger on_auth_user_created_roles after insert on auth.users for each row execute function public.grant_howard_roles();
create trigger on_auth_user_confirmed_roles after update of email_confirmed_at on auth.users for each row
  when (old.email_confirmed_at is null and new.email_confirmed_at is not null) execute function public.grant_howard_roles();

-- Venues
create table public.venues (
  id text primary key,
  name text not null, type text not null, addr text not null,
  lat double precision not null, lng double precision not null,
  cost numeric not null default 0, unit text not null default 'meal',
  ebt boolean not null default false, bison boolean not null default false,
  halal boolean not null default false, veg boolean not null default false,
  campus_only boolean not null default false, sample boolean not null default false,
  hours jsonb not null
);
grant select on public.venues to anon, authenticated;
grant all on public.venues to service_role;
alter table public.venues enable row level security;
create policy "venues visible" on public.venues for select to anon, authenticated
  using (not campus_only or auth.uid() is null or not public.has_role(auth.uid(),'alumni'));

-- Feed items
create table public.items (
  id text primary key default gen_random_uuid()::text,
  kind text not null check (kind in ('deal','event','market')),
  title text not null, venue_id text references public.venues(id),
  location text not null, lat double precision not null, lng double precision not null,
  start_at timestamptz not null, end_at timestamptz not null,
  daily_start numeric, daily_end numeric, dow int[],
  recurring text, season_start int, season_end int, season_txt text,
  description text not null default '', food text not null default '',
  free boolean not null default false, student_only boolean not null default false,
  id_req text not null default 'none' check (id_req in ('none','required','only')),
  snap boolean not null default false, bison boolean not null default false,
  match_txt text, by_label text not null default '', by_role text not null default 'student',
  author_id uuid, verified_at timestamptz default now(),
  vcount int not null default 0, flags int not null default 0,
  created_at timestamptz not null default now()
);
grant select on public.items to anon, authenticated;
grant insert on public.items to authenticated;
grant all on public.items to service_role;
alter table public.items enable row level security;
create policy "items visible" on public.items for select to anon, authenticated using (
  (not student_only and id_req <> 'only')
  or (auth.uid() is not null and public.is_student(auth.uid()))
  or author_id = auth.uid()
);
create policy "verified users post" on public.items for insert to authenticated with check (
  author_id = auth.uid() and kind in ('deal','event') and public.is_verified(auth.uid())
  and (public.is_student(auth.uid()) or (not student_only and id_req <> 'only'))
);

create or replace function public.items_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare p public.profiles;
begin
  if new.author_id is null then return new; end if; -- seed rows
  select * into p from public.profiles where user_id = new.author_id;
  new.vcount := 0; new.flags := 0; new.verified_at := now(); new.created_at := now();
  if new.end_at <= new.start_at then raise exception 'End time must be after the start time.'; end if;
  if new.end_at <= now() then raise exception 'That end time has already passed.'; end if;
  if public.has_role(new.author_id,'org') and coalesce(p.org,'') <> '' then new.by_role := 'org'; new.by_label := p.org;
  elsif public.is_student(new.author_id) then new.by_role := 'student'; new.by_label := 'Howard student';
  else new.by_role := 'alumni'; new.by_label := 'Howard alum' || coalesce(', class of ' || p.grad_year, ''); end if;
  if new.venue_id is not null then select lat, lng into new.lat, new.lng from public.venues where id = new.venue_id; end if;
  return new;
end $$;
create trigger items_before_insert before insert on public.items for each row execute function public.items_before_insert();

-- Teasers: visitors see that a student-only item exists, without details
create or replace function public.item_teasers()
returns table(id text, kind text, start_at timestamptz, end_at timestamptz, daily_start numeric, daily_end numeric, dow int[], lat double precision, lng double precision, flags int, free boolean, student_only boolean, id_req text)
language sql stable security definer set search_path = public as $$
  select i.id, i.kind, i.start_at, i.end_at, i.daily_start, i.daily_end, i.dow, i.lat, i.lng, i.flags, i.free, i.student_only, i.id_req
  from public.items i
  where (i.student_only or i.id_req = 'only')
    and (auth.uid() is null or not public.is_verified(auth.uid()))
$$;
grant execute on function public.item_teasers() to anon, authenticated;

-- Votes
create table public.votes (
  item_id text not null references public.items(id) on delete cascade,
  user_id uuid not null,
  vote text not null check (vote in ('ok','no')),
  updated_at timestamptz not null default now(),
  primary key (item_id, user_id)
);
grant select, insert, update, delete on public.votes to authenticated;
grant all on public.votes to service_role;
alter table public.votes enable row level security;
create policy "own votes read" on public.votes for select to authenticated using (user_id = auth.uid());
create policy "own votes write" on public.votes for insert to authenticated with check (user_id = auth.uid() and public.is_verified(auth.uid()));
create policy "own votes update" on public.votes for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own votes delete" on public.votes for delete to authenticated using (user_id = auth.uid());

create or replace function public.votes_recount()
returns trigger language plpgsql security definer set search_path = public as $$
declare iid text := coalesce(new.item_id, old.item_id);
begin
  update public.items set
    vcount = (select count(*) from public.votes where item_id = iid and vote='ok') + case when author_id is null then (select coalesce(vcount_seed,0) from (select 0 as vcount_seed) s) else 0 end,
    flags = (select count(*) from public.votes where item_id = iid and vote='no'),
    verified_at = case when tg_op <> 'DELETE' and new.vote='ok' then now() else verified_at end
  where id = iid;
  return null;
end $$;
create trigger votes_recount after insert or update or delete on public.votes for each row execute function public.votes_recount();

-- Reviews
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  venue_id text not null references public.venues(id) on delete cascade,
  user_id uuid,
  price int not null check (price between 1 and 5),
  value int not null check (value between 1 and 5),
  body text not null default '' check (length(body) <= 280),
  who text not null default '',
  created_at timestamptz not null default now()
);
grant select on public.reviews to anon, authenticated;
grant insert on public.reviews to authenticated;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews public" on public.reviews for select to anon, authenticated using (true);
create policy "verified review" on public.reviews for insert to authenticated with check (user_id = auth.uid() and public.is_verified(auth.uid()));
create or replace function public.reviews_label()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.user_id is null then return new; end if;
  new.who := case when public.has_role(new.user_id,'org') then 'Student org'
                  when public.is_student(new.user_id) then 'Student'
                  else 'Alumni' end;
  return new;
end $$;
create trigger reviews_label before insert on public.reviews for each row execute function public.reviews_label();

-- Favorites
create table public.favorites (
  user_id uuid not null, venue_id text not null references public.venues(id) on delete cascade,
  created_at timestamptz not null default now(), primary key (user_id, venue_id)
);
grant select, insert, delete on public.favorites to authenticated;
grant all on public.favorites to service_role;
alter table public.favorites enable row level security;
create policy "own favs read" on public.favorites for select to authenticated using (user_id = auth.uid());
create policy "own favs add" on public.favorites for insert to authenticated with check (user_id = auth.uid());
create policy "own favs del" on public.favorites for delete to authenticated using (user_id = auth.uid());

-- Notifications
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null, item_id text references public.items(id) on delete cascade,
  title text not null, body text not null default '', read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "own notifs" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "own notifs update" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

create or replace function public.items_notify()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications(user_id, item_id, title, body)
  select p.user_id, new.id, 'New ' || new.kind || ': ' || new.title, new.location
  from public.profiles p
  where p.user_id is distinct from new.author_id
    and ((new.kind='deal' and p.notify_deals) or (new.kind='event' and p.notify_events))
    and public.is_verified(p.user_id)
    and (not (new.student_only or new.id_req='only') or public.is_student(p.user_id));
  return new;
end $$;
create trigger items_notify after insert on public.items for each row execute function public.items_notify();

-- Seed data (sample data from the prototype)
insert into public.venues (id,name,type,addr,lat,lng,cost,unit,ebt,bison,halal,veg,campus_only,sample,hours) values
('corner','Georgia Ave Corner Market','market','Georgia Ave & Howard Pl NW',38.9188,-77.0213,31,'basket',true,true,true,true,false,true,'[[7,25],[7,25],[7,25],[7,25],[7,25],[7,25],[7,25]]'),
('cart','Sixth St Halal Cart','restaurant','6th St NW by the Yard',38.9218,-77.0188,9,'meal',false,true,true,true,false,true,'[[11,25],[11,25],[11,25],[11,25],[11,25],[11,25],[11,25]]'),
('grabgo','Bison Grab & Go','restaurant','Blackburn Center, main campus',38.9229,-77.0196,8,'meal',false,true,false,true,false,true,'[null,[7,20],[7,20],[7,20],[7,20],[7,18],null]'),
('deli','Howard Plaza Deli','restaurant','Near Howard Plaza Towers',38.9180,-77.0200,11,'meal',false,true,true,false,false,true,'[[10,26],[10,26],[10,26],[10,26],[10,26],[10,26],[10,26]]'),
('giant','Giant Food (O Street Market)','grocery','1400 7th St NW',38.9087,-77.0216,46,'basket',true,false,true,true,false,false,'[[6,24],[6,24],[6,24],[6,24],[6,24],[6,24],[6,24]]'),
('safeway','Safeway (CityVista)','grocery','490 L St NW',38.9036,-77.0180,44,'basket',true,false,false,true,false,false,'[[6,24],[6,24],[6,24],[6,24],[6,24],[6,24],[6,24]]'),
('target','Target (Columbia Heights)','grocery','3100 14th St NW',38.9289,-77.0329,49,'basket',true,false,false,true,false,false,'[[7,22],[7,22],[7,22],[7,22],[7,22],[7,22],[7,22]]'),
('tj','Trader Joe''s (14th St)','grocery','1914 14th St NW',38.9155,-77.0320,52,'basket',true,false,false,true,false,false,'[[8,21],[8,21],[8,21],[8,21],[8,21],[8,21],[8,21]]'),
('wf','Whole Foods (P St)','grocery','1440 P St NW',38.9095,-77.0336,71,'basket',true,false,false,true,false,false,'[[7,22],[7,22],[7,22],[7,22],[7,22],[7,22],[7,22]]'),
('bens','Ben''s Chili Bowl','restaurant','1213 U St NW',38.9170,-77.0289,13,'meal',false,false,false,true,false,false,'[[11,23],[11,24],[11,24],[11,24],[11,24],[11,26],[11,26]]'),
('grill','Florida Avenue Grill','restaurant','1100 Florida Ave NW',38.9203,-77.0270,15,'meal',false,false,false,false,false,false,'[[8,16],null,[8,21],[8,21],[8,21],[8,21],[8,21]]'),
('dukem','Dukem Ethiopian','restaurant','1114 U St NW',38.9168,-77.0275,16,'meal',false,false,true,true,false,false,'[[11,24],[11,24],[11,24],[11,24],[11,24],[11,24],[11,24]]'),
('mango','Sweet Mango Café','restaurant','3701 Georgia Ave NW',38.9366,-77.0240,13,'meal',false,false,false,true,false,false,'[[11,22],[11,22],[11,22],[11,22],[11,22],[11,22],[11,22]]'),
('busboys','Busboys and Poets (14th & V)','restaurant','2021 14th St NW',38.9178,-77.0318,19,'meal',false,false,false,true,false,false,'[[8,23],[8,23],[8,23],[8,23],[8,23],[8,23],[8,23]]'),
('pantry','Campus Food Pantry','pantry','Blackburn Center, lower level',38.9232,-77.0192,0,'free',false,false,true,true,true,true,'[null,[11,16],null,[11,16],null,[11,16],null]'),
('pantry2','Social Work Building Pantry','pantry','School of Social Work, 2nd floor',38.9208,-77.0196,0,'free',false,false,false,true,true,true,'[null,null,[12,17],null,[12,17],null,null]'),
('fridge','Shaw Community Fridge','fridge','7th & S St NW (sample)',38.9135,-77.0205,0,'free',false,false,false,true,false,true,'[[0,24],[0,24],[0,24],[0,24],[0,24],[0,24],[0,24]]'),
('fridge2','Park View Community Fridge','fridge','Georgia Ave & Park Rd (sample)',38.9302,-77.0230,0,'free',false,false,false,true,false,true,'[[0,24],[0,24],[0,24],[0,24],[0,24],[0,24],[0,24]]');

insert into public.reviews (venue_id, who, price, value, body) values
('corner','Sophomore · Biology',5,4,'Rice, beans and eggs for the week came to about $12. Prices on the shelf match the register.'),
('corner','Junior · CS',4,4,'Takes Bison Bucks, which saves me when my card is low.'),
('cart','Senior · Political Science',5,5,'$9 platter feeds me twice. Ask for extra rice.'),
('giant','Grad student · Social Work',4,4,'Store brand is the move. Basket estimate is close to what I pay.'),
('wf','Junior · Nursing',3,2,'Prepared food bar adds up fast. Fine for one or two staples.'),
('bens','Sophomore · Business',4,5,'Half-smoke plate is big. Late hours help after shifts.'),
('pantry','Senior · Psychology',5,5,'No questions asked, just bring your ID. Restocked Mondays.');

create function pg_temp.at(d int, h numeric) returns timestamptz language sql as $$
  select (((now() at time zone 'America/New_York')::date + d)::timestamp + h * interval '1 hour') at time zone 'America/New_York'
$$;

insert into public.items (id,kind,title,venue_id,location,lat,lng,start_at,end_at,daily_start,daily_end,dow,recurring,description,food,bison,snap,id_req,by_label,by_role,verified_at,vcount,flags,free,student_only,season_start,season_end,season_txt,match_txt)
select x.id,x.kind,x.title,x.venue_id,x.location,coalesce(v.lat,x.lat),coalesce(v.lng,x.lng),x.s,x.e,x.ds,x.de,x.dow,x.rec,x.descr,x.food,x.bison,x.snap,x.idreq,x.by,x.byrole,x.ver,x.vc,x.fl,x.free,x.so,x.ss,x.se,x.st,x.mt
from (values
 ('d1','deal','$7 combo platter with student ID','cart','Sixth St Halal Cart',null::float8,null::float8,pg_temp.at(0,0),pg_temp.at(90,24),11::numeric,15::numeric,'{1,2,3,4,5}'::int[],'Weekdays, 11 AM–3 PM','Chicken or falafel over rice with a drink.','Halal chicken, falafel (vegetarian), rice, salad',true,false,'required','Junior · CS','student',pg_temp.at(0,9.5),6,0,false,false,null::int,null::int,null,null),
 ('d2','deal','Student staples basket for $12','corner','Georgia Ave Corner Market',null,null,pg_temp.at(0,0),pg_temp.at(5,22),7,22,null,'Through Sunday','Rice (2 lb), dry black beans, a dozen eggs and a loaf of bread, bundled.','Groceries',true,true,'none','Store owner (verified by students)','student',pg_temp.at(-1,18),3,0,false,false,null,null,null,null),
 ('d3','deal','$4 slice + soda after 10 PM','deli','Howard Plaza Deli',null,null,pg_temp.at(0,0),pg_temp.at(90,26),22,26,null,'Nightly, 10 PM–2 AM','Late-night special for anyone coming off a shift or out of the library.','Cheese or pepperoni pizza',true,false,'none','Senior · Economics','student',pg_temp.at(-2,23),2,1,false,false,null,null,null,null),
 ('d4','deal','$3.50 coffee + egg sandwich (Bison Bucks)','grabgo','Bison Grab & Go, Blackburn Center',null,null,pg_temp.at(0,0),pg_temp.at(90,24),7,10,'{1,2,3,4,5}','Weekday mornings, 7–10 AM','Breakfast special for current students.','Egg and cheese on a roll, drip coffee',true,false,'only','Freshman · Engineering','student',pg_temp.at(0,8),9,0,false,false,null,null,null,null),
 ('d5','deal','Giant store-brand 10 for $10','giant','Giant Food (O Street Market)',null,null,pg_temp.at(0,0),pg_temp.at(3,23),6,24,null,'Ends Friday','Mix and match canned beans, pasta and sauce.','Pantry staples',false,true,'none','Howard alum, class of 2024','alumni',pg_temp.at(-1,12),4,0,false,false,null,null,null,null),
 ('e1','event','Free pizza at CS study night',null,'Douglass Hall, room 116',38.9222,-77.0205,pg_temp.at(0,18),pg_temp.at(0,20.5),null,null,null,null,'Bring your laptop; tutors on hand for intro courses.','Cheese and pepperoni pizza, veggie option',false,false,'required','Howard ACM (student org)','org',null,0,0,true,true,null,null,null,null),
 ('e2','event','Grab-and-go breakfast on the Yard',null,'The Yard, near Founders Library',38.9223,-77.0199,pg_temp.at(1,8),pg_temp.at(1,10),null,null,null,null,'First come, first served until it runs out.','Bagels, fruit cups, juice',false,false,'required','Student Government (org)','org',null,0,0,true,false,null,null,null,null),
 ('e3','event','Shaw community dinner',null,'Community center, 7th & R St NW',38.9126,-77.0218,pg_temp.at(2,17.5),pg_temp.at(2,19.5),null,null,null,null,'Open to all neighbors. Takeaway containers available.','Baked chicken, greens, mac and cheese; vegetarian plate',false,false,'none','Howard alum, class of 2023','alumni',null,0,0,true,false,null,null,null,null),
 ('e4','event','Late-night finals fuel',null,'Founders Library, 1st floor',38.9226,-77.0196,pg_temp.at(3,21),pg_temp.at(3,23.5),null,null,null,null,'Snacks and coffee for anyone studying late.','Granola bars, popcorn, coffee, tea',false,false,'required','Residence Life (org)','org',null,0,0,true,true,null,null,null,null),
 ('e5','event','Produce box giveaway',null,'Park View Rec Center',38.9307,-77.0222,pg_temp.at(4,10),pg_temp.at(4,13),null,null,null,null,'Boxes of seasonal produce, one per person while supplies last.','Apples, sweet potatoes, greens, onions',false,false,'none','Howard alumna, class of 2022','alumni',null,0,0,true,false,null,null,null,null),
 ('e0','event','Free bagels at the Yard',null,'The Yard',38.9223,-77.0199,pg_temp.at(-1,9),pg_temp.at(-1,11),null,null,null,null,'Ended yesterday. Shown only with archived items on.','Bagels and cream cheese',false,false,'none','Student Government (org)','org',null,0,0,true,false,null,null,null,null),
 ('m1','market','Georgia Ave Saturday Market',null,'Georgia Ave & Kenyon St NW',38.9300,-77.0232,pg_temp.at(0,0),pg_temp.at(365,24),9,13,'{6}','Saturdays, 9 AM–1 PM','Local farms and bakers.','Produce, eggs, bread',false,true,'none','Market listing','admin',null,0,0,false,false,4,11,'May through December','Produce Plus match accepted'),
 ('m2','market','Columbia Heights Wednesday Market',null,'14th St & Park Rd NW',38.9300,-77.0326,pg_temp.at(0,0),pg_temp.at(365,24),16,19,'{3}','Wednesdays, 4–7 PM','After-work market near the Metro.','Produce, prepared food',false,true,'none','Market listing','admin',null,0,0,false,false,3,10,'April through November','SNAP dollar match up to $20'),
 ('m3','market','Howard Summer Market',null,'Howard Pl NW',38.9215,-77.0200,pg_temp.at(0,0),pg_temp.at(365,24),12,16,'{5}','Fridays, 12–4 PM','Out of season now, so it is hidden from This Week.','Produce',false,true,'none','Market listing','admin',null,0,0,false,false,5,8,'June through September','SNAP accepted')
) as x(id,kind,title,venue_id,location,lat,lng,s,e,ds,de,dow,rec,descr,food,bison,snap,idreq,by,byrole,ver,vc,fl,free,so,ss,se,st,mt)
left join public.venues v on v.id = x.venue_id;

-- Seed peer-verification counts are kept as a base so real votes add to them
alter table public.items add column vcount_base int not null default 0;
alter table public.items add column flags_base int not null default 0;
update public.items set vcount_base = vcount, flags_base = flags;

create or replace function public.votes_recount()
returns trigger language plpgsql security definer set search_path = public as $$
declare iid text := coalesce(new.item_id, old.item_id);
begin
  update public.items set
    vcount = vcount_base + (select count(*) from public.votes where item_id = iid and vote='ok'),
    flags = flags_base + (select count(*) from public.votes where item_id = iid and vote='no'),
    verified_at = case when tg_op <> 'DELETE' and new.vote='ok' then now() else verified_at end
  where id = iid;
  return null;
end $$;
