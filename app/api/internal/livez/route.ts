import { NextResponse } from "next/server";
import { isInternalRequest } from "@/lib/admin/auth";

export const GET = async (request: Request) => {
  if (!(await isInternalRequest(request))) {
    return NextResponse.json({ ok: false, message: "Unauthorized." }, { status: 401 });
  }

  return NextResponse.json(
    {
      status: "alive",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
};
