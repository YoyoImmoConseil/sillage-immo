import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { isAdminRequest } from "@/lib/admin/auth";

type ToolVersionInput = {
  toolName: string;
  toolVersion: string;
  lifecycleStatus?: "draft" | "active" | "deprecated";
  description?: string | null;
  changelog?: Record<string, unknown> | null;
};

type ToolVersionUpdateInput = {
  toolName: string;
  toolVersion: string;
  lifecycleStatus?: "draft" | "active" | "deprecated";
  description?: string | null;
  changelog?: Record<string, unknown> | null;
};

type ToolVersionDeleteInput = {
  toolName: string;
  toolVersion: string;
};

const jsonError = (status: number, message: string) => {
  return NextResponse.json({ ok: false, message }, { status });
};

const parseBody = async (request: Request) => {
  try {
    return (await request.json()) as ToolVersionInput;
  } catch {
    return null;
  }
};

const isNonEmptyString = (value: unknown): value is string => {
  return typeof value === "string" && value.trim().length > 0;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

const isLifecycleStatus = (
  value: unknown
): value is "draft" | "active" | "deprecated" => {
  return value === "draft" || value === "active" || value === "deprecated";
};

export const GET = async (request: Request) => {
  if (!isAdminRequest(request)) {
    return jsonError(401, "Unauthorized.");
  }

  const { data, error } = await supabaseAdmin
    .from("tool_versions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return jsonError(500, error.message);
  }

  return NextResponse.json({ ok: true, data });
};

export const POST = async (request: Request) => {
  if (!isAdminRequest(request)) {
    return jsonError(401, "Unauthorized.");
  }

  const body = await parseBody(request);
  if (!body) {
    return jsonError(400, "Invalid JSON body.");
  }

  if (!isNonEmptyString(body.toolName) || !isNonEmptyString(body.toolVersion)) {
    return jsonError(422, "toolName and toolVersion are required.");
  }

  if (
    body.lifecycleStatus !== undefined &&
    !isLifecycleStatus(body.lifecycleStatus)
  ) {
    return jsonError(422, "lifecycleStatus must be draft, active, or deprecated.");
  }

  const { data, error } = await supabaseAdmin
    .from("tool_versions")
    .insert({
      tool_name: body.toolName.trim(),
      tool_version: body.toolVersion.trim(),
      lifecycle_status: body.lifecycleStatus ?? "active",
      activated_at:
        body.lifecycleStatus === "draft" ? null : new Date().toISOString(),
      deprecated_at:
        body.lifecycleStatus === "deprecated"
          ? new Date().toISOString()
          : null,
      description: body.description?.trim() || null,
      changelog: body.changelog ?? {},
    })
    .select("*")
    .single();

  if (error) {
    return jsonError(500, error.message);
  }

  return NextResponse.json({ ok: true, data }, { status: 201 });
};

export const PUT = async (request: Request) => {
  if (!isAdminRequest(request)) {
    return jsonError(401, "Unauthorized.");
  }

  let body: ToolVersionUpdateInput | null = null;
  try {
    body = (await request.json()) as ToolVersionUpdateInput;
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  if (!body) {
    return jsonError(400, "Invalid JSON body.");
  }

  if (!isNonEmptyString(body.toolName) || !isNonEmptyString(body.toolVersion)) {
    return jsonError(422, "toolName and toolVersion are required.");
  }

  if (
    body.lifecycleStatus !== undefined &&
    !isLifecycleStatus(body.lifecycleStatus)
  ) {
    return jsonError(422, "lifecycleStatus must be draft, active, or deprecated.");
  }

  const hasDescription = "description" in body;
  const hasChangelog = "changelog" in body;
  const hasLifecycleStatus = "lifecycleStatus" in body;
  if (!hasDescription && !hasChangelog && !hasLifecycleStatus) {
    return jsonError(422, "Provide at least description, changelog, or lifecycleStatus.");
  }

  if (hasChangelog && body.changelog !== null && !isRecord(body.changelog)) {
    return jsonError(422, "changelog must be an object or null.");
  }

  const updatePayload: {
    lifecycle_status?: "draft" | "active" | "deprecated";
    activated_at?: string | null;
    deprecated_at?: string | null;
    description?: string | null;
    changelog?: Record<string, unknown>;
  } = {};

  if (hasDescription) {
    updatePayload.description = body.description?.trim() || null;
  }

  if (hasChangelog) {
    updatePayload.changelog = body.changelog ?? {};
  }

  if (hasLifecycleStatus && body.lifecycleStatus) {
    updatePayload.lifecycle_status = body.lifecycleStatus;
    if (body.lifecycleStatus === "active") {
      updatePayload.activated_at = new Date().toISOString();
      updatePayload.deprecated_at = null;
    } else if (body.lifecycleStatus === "deprecated") {
      updatePayload.deprecated_at = new Date().toISOString();
    } else {
      updatePayload.deprecated_at = null;
    }
  }

  const { data, error } = await supabaseAdmin
    .from("tool_versions")
    .update(updatePayload)
    .eq("tool_name", body.toolName.trim())
    .eq("tool_version", body.toolVersion.trim())
    .select("*")
    .maybeSingle();

  if (error) {
    return jsonError(500, error.message);
  }

  if (!data) {
    return jsonError(404, "Tool version not found.");
  }

  return NextResponse.json({ ok: true, data });
};

export const DELETE = async (request: Request) => {
  if (!isAdminRequest(request)) {
    return jsonError(401, "Unauthorized.");
  }

  let body: ToolVersionDeleteInput | null = null;
  try {
    body = (await request.json()) as ToolVersionDeleteInput;
  } catch {
    return jsonError(400, "Invalid JSON body.");
  }

  if (!body) {
    return jsonError(400, "Invalid JSON body.");
  }

  if (!isNonEmptyString(body.toolName) || !isNonEmptyString(body.toolVersion)) {
    return jsonError(422, "toolName and toolVersion are required.");
  }

  const { data, error } = await supabaseAdmin
    .from("tool_versions")
    .delete()
    .eq("tool_name", body.toolName.trim())
    .eq("tool_version", body.toolVersion.trim())
    .select("*")
    .maybeSingle();

  if (error) {
    return jsonError(500, error.message);
  }

  if (!data) {
    return jsonError(404, "Tool version not found.");
  }

  return NextResponse.json({ ok: true, data });
};
