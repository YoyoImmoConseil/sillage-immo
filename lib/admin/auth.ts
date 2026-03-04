import "server-only";
import { serverEnv } from "@/lib/env/server";

export const isAdminRequest = (request: Request) => {
  const key = request.headers.get("x-admin-key");
  return Boolean(key && key === serverEnv.ADMIN_API_KEY);
};
