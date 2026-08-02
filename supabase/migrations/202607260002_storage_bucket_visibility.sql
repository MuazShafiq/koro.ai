-- Public buckets can serve objects without allowing their definitions to be
-- listed. Koro needs listBuckets() for deployment diagnostics, so expose only
-- the three public application bucket rows.
create policy storage_public_list_koro_buckets
  on storage.buckets for select
  to public
  using (id in ('resources', 'lessons', 'audio'));
