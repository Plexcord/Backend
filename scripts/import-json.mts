// One-time import of the old JSON storage (data/users.json, settings/*.json) into the database.
// Safe to run again: it upserts. Run from the project root:
//   npm run import-json -- /path/to/old/project
import fs from "node:fs";
import path from "node:path";
import { checksum, isValidKey, V1_KEY } from "../src/lib/cloud";
import { prisma } from "../src/lib/db";

const dir = process.argv[2] ?? ".";
const readJson = (file: string) => JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
const exists = (file: string) => fs.existsSync(path.join(dir, file));

const users: Record<string, { hash?: string }> = exists("data/users.json") ? readJson("data/users.json") : {};
const files = exists("settings") ? fs.readdirSync(path.join(dir, "settings")) : [];
const ids = new Set(
  [...Object.keys(users), ...files.map((f) => f.split(".")[0])].filter((id) => /^\d{17,20}$/.test(id))
);

let entries = 0;
for (const id of ids) {
  // Old plaintext secrets were guessable, so only hashed ones carry over; the rest link again
  // and find their data waiting.
  const secretHash = users[id]?.hash ?? null;
  await prisma.cloudUser.upsert({ where: { id }, create: { id, secretHash }, update: {} });

  const rows: { key: string; value: Buffer<ArrayBuffer>; version: number; checksum: string; updatedAt?: Date }[] = [];

  if (exists(`settings/${id}.json`)) {
    // { value: <JSON-serialized Buffer>, written: <ms> }
    const { value, written } = readJson(`settings/${id}.json`);
    const data = Buffer.from(value.data);
    rows.push({ key: V1_KEY, value: data, version: 1, checksum: checksum(data), updatedAt: new Date(written) });
  }

  if (exists(`settings/${id}.v2.json`)) {
    // { [key]: { value: <base64>, version, checksum } }
    for (const [key, e] of Object.entries<{ value: string; version: number }>(readJson(`settings/${id}.v2.json`))) {
      if (!isValidKey(key)) continue;
      const data = Buffer.from(e.value, "base64");
      rows.push({ key, value: data, version: e.version, checksum: checksum(data) });
    }
  }

  for (const row of rows) {
    await prisma.cloudEntry.upsert({
      where: { userId_key: { userId: id, key: row.key } },
      create: { userId: id, ...row },
      update: row,
    });
  }
  entries += rows.length;
}

console.log(`Imported ${ids.size} users and ${entries} entries.`);
await prisma.$disconnect();
