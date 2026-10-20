// Run: npm test  (Node 22.18+ strips TS types natively)
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { test } from "node:test";
import { checksum, hashSecret, parseAuthorization, pickDownloads, secretMatches, validateUploads } from "./cloud.ts";

const id = "123456789012345678";
const auth = (s) => Buffer.from(s).toString("base64");

test("parseAuthorization accepts secret:snowflake only", () => {
  assert.deepEqual(parseAuthorization(auth(`abc:${id}`)), { secret: "abc", userId: id });
  assert.equal(parseAuthorization(null), null);
  assert.equal(parseAuthorization(auth(`:${id}`)), null);
  assert.equal(parseAuthorization(auth("abc:../data/users")), null);
  assert.equal(parseAuthorization(auth("abc:123")), null);
});

test("secretMatches checks the hash and rejects imported users without one", () => {
  const stored = hashSecret("s3cret");
  assert.equal(secretMatches("s3cret", stored), true);
  assert.equal(secretMatches("wrong", stored), false);
  assert.equal(secretMatches("s3cret", null), false);
  assert.equal(secretMatches("s3cret", "short"), false);
});

test("checksum matches the client's computeChecksum", () => {
  const data = new TextEncoder().encode('{"a":1}');
  const client = [...createHash("sha256").update(data).digest().subarray(0, 8)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  assert.equal(checksum(data), client);
});

test("validateUploads rejects unknown keys and checksum mismatches", () => {
  const up = (key, text, sum) => ({ key, value: Buffer.from(text).toString("base64"), checksum: sum ?? checksum(Buffer.from(text)) });
  const { rows, errors } = validateUploads([
    up("settings", "{}"),
    up("dataStore/x", "1"),
    up("v1", "x"),
    up("../evil", "x"),
    up("quickCss", "a", "bad"),
    null,
  ]);
  assert.deepEqual(rows.map((r) => r.key), ["settings", "dataStore/x"]);
  assert.deepEqual(errors.map((e) => e.key), ["v1", "../evil", "quickCss", "undefined"]);
});

test("pickDownloads returns only newer keys the client did not just upload", () => {
  const server = [
    { key: "settings", version: 3, checksum: "" },
    { key: "quickCss", version: 1, checksum: "" },
    { key: "dataStore", version: 2, checksum: "" },
  ];
  const client = [{ key: "settings", version: 2 }, { key: "quickCss", version: 1 }];
  assert.deepEqual(pickDownloads(server, client, new Set()), ["settings", "dataStore"]);
  assert.deepEqual(pickDownloads(server, client, new Set(["settings"])), ["dataStore"]);
  assert.deepEqual(pickDownloads(server, [], new Set()), ["settings", "quickCss", "dataStore"]);
});
