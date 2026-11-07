import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { hashSecret } from "@/lib/cloud";
import { prisma } from "@/lib/db";
import { rateLimit } from "@/lib/rateLimit";

// The client opens Discord's authorize modal, then fetches this URL itself and keeps the secret.
export async function GET(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for") ?? req.headers.get("x-real-ip") ?? "unknown";
  const limit = rateLimit(`oauth:${ip}`, 10, 60000);
  if (!limit.allowed) return Response.json({ error: "Too many requests" }, { status: 429 });

  const code = req.nextUrl.searchParams.get("code");
  if (!code) return Response.json({ error: "Code not found!" }, { status: 400 });

  const fail = async (): Promise<Response> => {
    return Response.json({ error: "Authentication failed!" }, { status: 500 });
  };

  const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.CLIENT_ID!,
      client_secret: process.env.CLIENT_SECRET!,
      grant_type: "authorization_code",
      code,
      redirect_uri: process.env.REDIRECT_URI!,
    }),
  });
  if (!tokenRes.ok) return fail();
  const { access_token } = await tokenRes.json();

  const meRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!meRes.ok) return fail();
  const { id } = await meRes.json();

  const secret = randomBytes(32).toString("hex");
  const secretHash = hashSecret(secret);
  await prisma.cloudUser.upsert({ where: { id }, create: { id, secretHash }, update: { secretHash } });

  return Response.json({ secret });
}
