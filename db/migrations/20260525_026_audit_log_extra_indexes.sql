-- 20260525_026_audit_log_extra_indexes.sql
--
-- Goal:
--   Add jsonb expression indexes on `audit_log.data` for the most common
--   filters the admin console and MCP audit tool use:
--     - tool name (`data->>'tool'`)
--     - status (`data->>'status'`)
--     - tool version (`data->>'tool_version'`)
--     - error code (`data->>'error_code'`)
--
--   Without these indexes, `audit.search` MCP tool would degrade to a
--   table-scan once the table reaches a few millions rows. We pair them
--   with the existing `(created_at desc)` index so the planner can do
--   index-only access for the typical "last 24h of failed mcp calls"
--   query pattern.
--
-- Idempotent: safe to re-apply.

begin;

create index if not exists idx_audit_log_data_tool
  on public.audit_log ((data->>'tool'));

create index if not exists idx_audit_log_data_status
  on public.audit_log ((data->>'status'));

create index if not exists idx_audit_log_data_tool_version
  on public.audit_log ((data->>'tool_version'));

create index if not exists idx_audit_log_data_error_code
  on public.audit_log ((data->>'error_code'));

commit;
