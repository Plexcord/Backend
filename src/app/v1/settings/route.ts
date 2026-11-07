import type { NextRequest } from "next/server";
import { checksum, readBody, V1_KEY } from "@/lib/cloud";
import { authenticate, prisma, unauthorized } from "@/lib/db";

const v1Entry = (userId: string) => ({ userId_key: { userId, key: V1_KEY } });

export async function GET(req: NextRequest) {
  const userId = await authenticate(req);
  if (!userId) return unauthorized();

  const entry = await prisma.cloudEntry.findUnique({
    where: v1Entry(userId),
    select: { value: true, updatedAt: true },
  });
  if (!entry) return new Response(null, { status: 404 });

  const written = String(entry.updatedAt.getTime());
  if (req.headers.get("if-none-match") === written) return new Response(null, { status: 304 });

  return new Response(entry.value, {
    headers: { "Content-Type": "application/octet-stream", ETag: written },
  });
}

export async function PUT(req: NextRequest) {
  if (req.headers.get("content-type") !== "application/octet-stream") {
    return Response.json({ error: "Content type must be application/octet-stream" }, { status: 415 });
  }

  const userId = await authenticate(req);
  if (!userId) return unauthorized();

  const value = await readBody(req);
  if (!value) return Response.json({ error: "Settings too large" }, { status: 413 });

  const sum = checksum(value);
  const { updatedAt } = await prisma.cloudEntry.upsert({
    where: v1Entry(userId),
    create: { userId, key: V1_KEY, value, version: 1, checksum: sum },
    update: { value, checksum: sum, version: { increment: 1 } },
    select: { updatedAt: true },
  });

  return Response.json({ written: updatedAt.getTime() });
}

export async function DELETE(req: NextRequest) {
  const userId = await authenticate(req);
  if (!userId) return unauthorized();

  const { count } = await prisma.cloudEntry.deleteMany({ where: { userId, key: V1_KEY } });
  if (!count) return Response.json({ error: "Settings not found for this user" }, { status: 404 });
  return new Response(null, { status: 204 });
}
