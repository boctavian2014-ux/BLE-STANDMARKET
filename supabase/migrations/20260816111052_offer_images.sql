-- Offer product images: nullable URL on offers + public-read storage bucket.
-- Path: {expo_id}/{stand_id}/{offer_id}.jpg
-- Writes require the same active membership used by public.offers.

alter table public.offers
  add column image_url text;

insert into storage.buckets (id, name, public)
values ('offer-images', 'offer-images', true);

create policy offer_images_select_public
  on storage.objects
  for select
  to public
  using (bucket_id = 'offer-images');

create policy offer_images_insert_member
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'offer-images'
    and private.has_active_membership(((storage.foldername(name))[2])::uuid)
  );

create policy offer_images_update_member
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'offer-images'
    and private.has_active_membership(((storage.foldername(name))[2])::uuid)
  )
  with check (
    bucket_id = 'offer-images'
    and private.has_active_membership(((storage.foldername(name))[2])::uuid)
  );

create policy offer_images_delete_member
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'offer-images'
    and private.has_active_membership(((storage.foldername(name))[2])::uuid)
  );
