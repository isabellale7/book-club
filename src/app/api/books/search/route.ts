import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { searchBooks } from "@/lib/googleBooks";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q") ?? "";
  const results = await searchBooks(q);
  return NextResponse.json({ results });
}
