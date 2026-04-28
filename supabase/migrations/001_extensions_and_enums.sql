-- 001_extensions_and_enums.sql
-- Harjo Emergency Response Platform

-- =========================================================
-- EXTENSIONS
-- =========================================================
create extension if not exists pgcrypto;
create extension if not exists "uuid-ossp";
create extension if not exists postgis;
create extension if not exists cube;
create extension if not exists earthdistance;

-- =========================================================
-- ENUMS
-- =========================================================
do $$
begin
  if not exists (select 1 from pg_type where typname = 'app_role') then
    create type public.app_role as enum (
      'reporter',
      'ambulance_driver',
      'paramedic',
      'doctor',
      'dispatcher',
      'admin',
      'super_admin'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'emergency_type') then
    create type public.emergency_type as enum (
      'trauma',
      'cardiac',
      'stroke',
      'burn',
      'accident',
      'respiratory',
      'general',
      'other'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'severity_level') then
    create type public.severity_level as enum (
      'ringan',
      'sedang',
      'berat',
      'kritis'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'emergency_status') then
    create type public.emergency_status as enum (
      'pending',
      'dispatched',
      'accepted',
      'en_route',
      'on_scene',
      'transporting',
      'arrived_hospital',
      'completed',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'ambulance_status') then
    create type public.ambulance_status as enum (
      'available',
      'dispatched',
      'en_route',
      'on_scene',
      'transporting',
      'maintenance',
      'offline'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'dispatch_status') then
    create type public.dispatch_status as enum (
      'pending',
      'dispatched',
      'accepted',
      'rejected',
      'en_route',
      'arrived',
      'completed',
      'cancelled'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'equipment_status') then
    create type public.equipment_status as enum (
      'operational',
      'low',
      'empty',
      'maintenance',
      'broken'
    );
  end if;

  if not exists (select 1 from pg_type where typname = 'notification_status') then
    create type public.notification_status as enum (
      'queued',
      'sent',
      'failed',
      'read'
    );
  end if;
end
$$;
