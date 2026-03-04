create index if not exists idx_audit_log_mcp_request_id
on public.audit_log ((data->>'request_id'));

create index if not exists idx_audit_log_execution_request_id
on public.audit_log ((data->'execution'->>'request_id'));

create index if not exists idx_audit_log_action_created_at
on public.audit_log (action, created_at desc);
