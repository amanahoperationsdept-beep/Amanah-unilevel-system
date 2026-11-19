import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !supabaseAnonKey) return response;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const { data: { user } } = await supabase.auth.getUser();
  response.headers.set("Cache-Control", "private, no-store");

  if (!user) {
    const destination = request.nextUrl.clone();
    destination.pathname = "/";
    const prefix = request.nextUrl.pathname.split("/")[1];
    destination.searchParams.set("portal", prefix === "admin" ? "admin" : prefix);
    return NextResponse.redirect(destination);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/marketing-officer/:path*",
    "/branch-operator/:path*",
    "/mobile-stockist/:path*",
    "/distributor/:path*",
  ],
};
