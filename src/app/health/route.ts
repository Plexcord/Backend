import type { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(req: NextRequest) {
  const dbOk = await prisma.$queryRaw`SELECT 1`;
  return Response.json({ status: "ok", database: Array.isArray(dbOk) && dbOk.length > 0 });
}
