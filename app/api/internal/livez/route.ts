import { NextResponse } from "next/server";

export const GET = async () => {
  return NextResponse.json(
    {
      status: "alive",
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
};
