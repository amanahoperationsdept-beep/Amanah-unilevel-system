-- Expand account roles for the five AMANAH dashboards.
-- JMO and SMO remain qualification levels, not separate login roles.
-- This migration only extends the enum; it does not assign roles to existing users.

alter type public.member_role add value if not exists 'marketing_officer';
alter type public.member_role add value if not exists 'branch_operator';
alter type public.member_role add value if not exists 'mobile_stockist';
