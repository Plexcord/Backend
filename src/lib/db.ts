import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "@/generated/prisma/client";
import { parseAuthorization, secretMatches } from "./cloud";
import "dotenv/config";

// Reuse one client across dev hot reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient() {
  const url = process.env.DATABASE_URL;
  // Without this the driver fails later with an unreadable "prepareCacheLength" error.
  if (!url) throw new Error("DATABASE_URL is not set. Copy .env.example to .env and fill it in.");
  return new PrismaClient({ adapter: new PrismaMariaDb(url) });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// The Discord user ID behind a valid Authorization header, or null.
export async function authenticate(req: Request) {
  const auth = parseAuthorization(req.headers.get("authorization"));
  if (!auth) return null;

  const user = await prisma.cloudUser.findUnique({ where: { id: auth.userId }, select: { secretHash: true } });
  return secretMatches(auth.secret, user?.secretHash) ? auth.userId : null;
}

export const unauthorized = () => Response.json({ error: "Invalid authorization" }, { status: 401 });
