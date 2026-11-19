import { NextRequest, NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const authType = request.nextUrl.searchParams.get("type");
  const requestedNext = request.nextUrl.searchParams.get("next");
  const nextPath =
    requestedNext && requestedNext.startsWith("/") && !requestedNext.startsWith("//")
      ? requestedNext
      : "/reset-password";
  const isRecovery = authType === "recovery" || nextPath === "/reset-password";

  if (!code) {
    const failurePath = isRecovery
      ? "/forgot-password?error=expired"
      : "/?auth=confirmation-failed";
    return NextResponse.redirect(new URL(failurePath, request.url));
  }

  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    const failurePath = isRecovery
      ? "/forgot-password?error=expired"
      : "/?auth=confirmation-failed";
    return NextResponse.redirect(new URL(failurePath, request.url));
  }

  if (isRecovery) {
    return NextResponse.redirect(new URL(nextPath, request.url));
  }

  // Email confirmation proves mailbox control, not distributor approval.
  await supabase.auth.signOut();
  return NextResponse.redirect(new URL("/?auth=pending", request.url));
}
