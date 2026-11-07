import type { NextRequest } from "next/server";
import { V1_KEY } from "@/lib/cloud";
import { authenticate, prisma, unauthorized } from "@/lib/db";

export async function GET(req: NextRequest) {
  const userId = await authenticate(req);
  if (!userId) return unauthorized();

  const entries = await prisma.cloudEntry.findMany({
    where: { userId, key: { not: V1_KEY } },
    select: { key: true, version: true, checksum: true },
  });
  return Response.json({ entries });
}
