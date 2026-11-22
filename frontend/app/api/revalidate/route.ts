import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

/** Called by the backend after the AI Manager publishes or rolls back a change.
 *  Uses the shared server-side secret (same value as NEXTAUTH_SECRET / backend SECRET_KEY). */
export async function POST(req: NextRequest) {
  const secret = process.env.REVALIDATE_SECRET || process.env.NEXTAUTH_SECRET;
  const provided = req.headers.get("x-revalidate-secret") || "";
  if (!secret || provided !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  let body: { paths?: string[]; path?: string } = {};
  try { body = await req.json(); } catch { /* no body */ }
  const paths = (Array.isArray(body.paths) ? body.paths : [body.path]).filter(
    (p): p is string => typeof p === "string" && p.startsWith("/")
  );
  for (const p of paths) revalidatePath(p);
  return NextResponse.json({ revalidated: paths });
}
