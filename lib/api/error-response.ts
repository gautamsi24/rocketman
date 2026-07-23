import { NextResponse } from "next/server";

export function serverErrorResponse(error: unknown) {
  console.error(error);
  return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
}
