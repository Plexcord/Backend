import type { NextRequest } from "next/server";
import { authenticate, prisma, unauthorized } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = await authenticate(req);
  if (!userId) return unauthorized();

  const user = await prisma.cloudUser.findUnique({
    where: { id: userId },
    select: { id: true, createdAt: true, entries: { select: { key: true, version: true, checksum: true, updatedAt: true } } },
  });
  if (!user) return Response.json({ error: "User not found" }, { status: 404 });

  return Response.json(user);
}
