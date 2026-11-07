import type { NextRequest } from "next/server";
import { isValidKey } from "@/lib/cloud";
import { authenticate, prisma, unauthorized } from "@/lib/db";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ key: string }> }) {
  const userId = await authenticate(req);
  if (!userId) return unauthorized();

  const { key } = await params;
  const { count } = isValidKey(key) ? await prisma.cloudEntry.deleteMany({ where: { userId, key } }) : { count: 0 };
  if (!count) return Response.json({ error: "Key not found" }, { status: 404 });
  return new Response(null, { status: 204 });
}
