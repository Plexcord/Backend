import { createHash, timingSafeEqual } from "node:crypto";

export const MAX_BODY_BYTES = 10 * 1024 * 1024;
export const MAX_USER_BYTES = 50 * 1024 * 1024;
// v1 clients store one deflated export under this key; it is never a valid v2 key.
export const V1_KEY = "v1";

export type ManifestEntry = { key: string; version: number; checksum: string };

// Authorization: base64("<secret>:<discord user id>")
export function parseAuthorization(header: string | null) {
  const [secret, userId] = Buffer.from(header ?? "", "base64").toString("utf-8").split(":");
  if (!secret || !/^\d{17,20}$/.test(userId ?? "")) return null;
  return { secret, userId };
}

export const hashSecret = (secret: string) => createHash("sha256").update(secret).digest("hex");

export function secretMatches(secret: string, storedHash: string | null | undefined) {
  if (storedHash?.length !== 64) return false;
  return timingSafeEqual(Buffer.from(hashSecret(secret)), Buffer.from(storedHash));
}

// Same as the client's computeChecksum: first 8 bytes of SHA-256, hex.
export const checksum = (data: Uint8Array) => createHash("sha256").update(data).digest("hex").slice(0, 16);

export const isValidKey = (key: unknown): key is string =>
  typeof key === "string" &&
  key.length <= 256 &&
  (["settings", "quickCss", "dataStore"].includes(key) || key.startsWith("dataStore/"));

// Splits a v2 upload list into rows to store and per-key errors.
export function validateUploads(uploads: unknown[]) {
  const rows: { key: string; value: Buffer<ArrayBuffer>; checksum: string }[] = [];
  const errors: { key: string; error: string }[] = [];

  for (const upload of uploads) {
    const { key, value, checksum: clientChecksum } = (upload ?? {}) as Record<string, unknown>;
    if (!isValidKey(key) || typeof value !== "string") {
      errors.push({ key: String(key), error: "Invalid key or value" });
      continue;
    }

    const data = Buffer.from(value, "base64");
    const sum = checksum(data);
    if (clientChecksum !== undefined && clientChecksum !== sum) {
      errors.push({ key, error: "Checksum mismatch" });
      continue;
    }
    rows.push({ key, value: data, checksum: sum });
  }

  return { rows, errors };
}

// Keys the client should download: newer on the server and not just uploaded by this client.
export function pickDownloads(server: ManifestEntry[], client: unknown[], uploadedKeys: Set<string>) {
  const known = new Map(
    client.map((e) => {
      const { key, version } = (e ?? {}) as Record<string, unknown>;
      return [key, Number(version) || 0];
    })
  );
  return server
    .filter((e) => !uploadedKeys.has(e.key) && (known.get(e.key) ?? 0) < e.version)
    .map((e) => e.key);
}

// shortcut: a chunked body without Content-Length is read fully before the size check;
// nginx's client_max_body_size caps it in production.
export async function readBody(req: Request) {
  if (Number(req.headers.get("content-length")) > MAX_BODY_BYTES) return null;
  const body = Buffer.from(await req.arrayBuffer());
  return body.byteLength > MAX_BODY_BYTES ? null : body;
}
