-- Run this entire script in Supabase SQL Editor.
-- The backend uses the service-role key. Never place that key in frontend files.

create extension if not exists pgcrypto;

create table if not exists public.student_inquiries (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text not null,
  class_name text,
  preferred_batch text,
  message text,
  status text not null default 'New' check (status in ('New','Contacted','Registered','Closed')),
  created_at timestamptz not null default now()
);

create table if not exists public.yoga_classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  category text,
  description text not null,
  timing text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value text not null default ''
);

alter table public.student_inquiries enable row level security;
alter table public.yoga_classes enable row level security;
alter table public.site_settings enable row level security;

-- No anon/authenticated policies are created intentionally.
-- All reads/writes go through the authenticated Node backend using its service-role key.

insert into public.site_settings(key,value) values
('studio_name','Soulful Yoga Classes'),
('instructor_name',''),
('whatsapp_number','919024130300'),
('phone_display','9024130300'),
('location','Soulful Yoga Classes, Chetak Marg, near Gopinath Hospital, Sector 8, Pratap Nagar, Sanganer, Jaipur 302033'),
('about_text','Our classes bring together mindful movement, breathing and relaxation in a welcoming environment.'),
('instructor_bio','Contact Soulful Yoga Classes to learn more about the instructor and available batches.')
on conflict (key) do nothing;

insert into public.yoga_classes(name,category,description,timing) values
('Hatha Yoga','FOUNDATION','Build a steady foundation through postures, alignment and mindful breathing.','Morning batch — timing to be confirmed'),
('Pranayama','BREATHWORK','Explore breath awareness and calming techniques for everyday wellbeing.','Ask for current availability'),
('Meditation','MINDFULNESS','Make time for stillness, focus and a more mindful daily routine.','Ask for current availability')
on conflict do nothing;
