import type { NextRequest } from "next/server";
import { MAX_USER_BYTES, pickDownloads, readBody, V1_KEY, validateUploads, type ManifestEntry } from "@/lib/cloud";
import { authenticate, prisma, unauthorized } from "@/lib/db";

class QuotaExceeded extends Error {}

export async function POST(req: NextRequest) {
  const userId = await authenticate(req);
  if (!userId) return unauthorized();

  const raw = await readBody(req);
  if (!raw) return Response.json({ error: "Request too large" }, { status: 413 });

  let body;
  try {
    body = JSON.parse(raw.toString("utf-8"));
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { client_manifest: clientManifest, uploads } = body ?? {};
  if (!Array.isArray(clientManifest) || !Array.isArray(uploads)) {
    return Response.json({ error: "client_manifest and uploads must be arrays" }, { status: 400 });
  }

  const { rows, errors } = validateUploads(uploads);
  let uploaded: ManifestEntry[] = [];

  if (rows.length) {
    try {
      uploaded = await prisma.$transaction(async (tx) => {
        const results = [];
        // last write wins
        for (const { key, value, checksum } of rows) {
          results.push(
            await tx.cloudEntry.upsert({
              where: { userId_key: { userId, key } },
              create: { userId, key, value, checksum, version: 1 },
              update: { value, checksum, version: { increment: 1 } },
              select: { key: true, version: true, checksum: true },
            })
          );
        }

        const [{ total }] = await tx.$queryRaw<{ total: number | bigint }[]>`
          SELECT COALESCE(SUM(LENGTH(value)), 0) AS total FROM CloudEntry WHERE userId = ${userId}`;
        if (Number(total) > MAX_USER_BYTES) throw new QuotaExceeded();
        return results;
      });
    } catch (e) {
      if (e instanceof QuotaExceeded) {
        return Response.json({ error: "Cloud storage limit exceeded" }, { status: 413 });
      }
      throw e;
    }
  }

  const serverManifest = await prisma.cloudEntry.findMany({
    where: { userId, key: { not: V1_KEY } },
    select: { key: true, version: true, checksum: true },
  });

  const wanted = pickDownloads(serverManifest, clientManifest, new Set(uploaded.map((u) => u.key)));
  const downloads = wanted.length
    ? await prisma.cloudEntry.findMany({
        where: { userId, key: { in: wanted } },
        select: { key: true, value: true, version: true, checksum: true },
      })
    : [];

  return Response.json({
    server_manifest: serverManifest,
    downloads: downloads.map((d) => ({ ...d, value: Buffer.from(d.value).toString("base64") })),
    uploaded,
    errors,
  });
}
