insert into storage.buckets (id, name, public)
values ('app-data', 'app-data', true)
on conflict (id) do nothing;

create policy "Public read access for app-data"
  on storage.objects for select
  using (bucket_id = 'app-data');

create policy "Public write access for app-data"
  on storage.objects for insert
  with check (bucket_id = 'app-data');

create policy "Public update access for app-data"
  on storage.objects for update
  using (bucket_id = 'app-data')
  with check (bucket_id = 'app-data');
