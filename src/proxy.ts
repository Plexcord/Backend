import { NextResponse, type NextRequest } from "next/server";

const allowedOrigins = [
  "https://discord.com",
  "https://ptb.discord.com",
  "https://canary.discord.com",
  "https://discordapp.com",
  "https://ptb.discordapp.com",
  "https://canary.discordapp.com",
];

const corsHeaders = {
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, If-None-Match",
  // v1 pull reads the ETag; cross-origin JS can't see it without this.
  "Access-Control-Expose-Headers": "ETag",
  "Access-Control-Max-Age": "86400",
};

export function proxy(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  const headers = new Headers(corsHeaders);
  if (allowedOrigins.includes(origin)) headers.set("Access-Control-Allow-Origin", origin);
  headers.set("Vary", "Origin");

  if (req.method === "OPTIONS") return new NextResponse(null, { status: 204, headers });

  // The client erases data with DELETE /v1/; serve it from /v1 without a redirect,
  // which browsers refuse after a CORS preflight.
  const res =
    req.nextUrl.pathname === "/v1/"
      ? NextResponse.rewrite(new URL("/v1", req.url))
      : NextResponse.next();
  headers.forEach((value, key) => res.headers.set(key, value));
  return res;
}

export const config = {
  matcher: ["/v1/:path*", "/v2/:path*"],
};
