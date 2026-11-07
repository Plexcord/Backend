import type { NextRequest } from "next/server";
import { authenticate, prisma, unauthorized } from "@/lib/db";

// Erase all data: the user, their secret and (by cascade) every synced entry.
export async function DELETE(req: NextRequest) {
  const userId = await authenticate(req);
  if (!userId) return unauthorized();

  await prisma.cloudUser.delete({ where: { id: userId } });
  return new Response(null, { status: 204 });
}
