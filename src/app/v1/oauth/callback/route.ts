import { randomBytes } from "node:crypto";
import type { NextRequest } from "next/server";
import { hashSecret } from "@/lib/cloud";
import { prisma } from "@/lib/db";

// The client opens Discord's authorize modal, then fetches this URL itself and keeps the secret.
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return Response.json({ error: "Code not found!" }, { status: 400 });

  const fail = async (res: Response) => {
    console.error("OAuth Error:", res.status, await res.text());
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
  if (!tokenRes.ok) return fail(tokenRes);
  const { access_token } = await tokenRes.json();

  const meRes = await fetch("https://discord.com/api/users/@me", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  if (!meRes.ok) return fail(meRes);
  const { id } = await meRes.json();

  const secret = randomBytes(32).toString("hex");
  const secretHash = hashSecret(secret);
  await prisma.cloudUser.upsert({ where: { id }, create: { id, secretHash }, update: { secretHash } });

  return Response.json({ secret });
}
