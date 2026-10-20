<div align="center">
  <h1>Plexcord Cloud API</h1>

  <p>The server behind <a href="https://api.plexcord.club">api.plexcord.club</a>.<br />
  Link your Discord account once, and Plexcord keeps your settings the same on every device.</p>

  <p>
    <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000?logo=nextdotjs" />
    <img alt="Prisma 7" src="https://img.shields.io/badge/Prisma-7-2d3748?logo=prisma" />
    <img alt="MySQL / MariaDB" src="https://img.shields.io/badge/MySQL%20%2F%20MariaDB-4479a1?logo=mysql&logoColor=white" />
  </p>
</div>

---

## What it does

| | |
| --- | --- |
| **Account link** | Plexcord opens Discord's authorize window; the server confirms who you are and hands the client a secret. Only a hash of it is stored. |
| **Sync (v2)** | Settings, QuickCSS and plugin data (DataStore) are synced key by key. Each key has a version, so a device downloads only what changed elsewhere. |
| **Sync (v1)** | Older Plexcord builds sync one compressed blob. Still served so they keep working. |
| **Erase** | One request deletes the account link and every synced key. |

**The rules the server enforces**

- Every request except the account link must carry a valid secret for that Discord ID.
- Uploaded data must match its checksum, and only Plexcord's own keys are accepted (`settings`, `quickCss`, `dataStore`, `dataStore/<name>`). Keys are case-sensitive.
- At most 10 MB per request and 50 MB per user.
- When two devices change the same key, the last write wins.

## Quick start

You need **Node.js 22.18+** and **MySQL 8+ or MariaDB 10.4+**.

```bash
git clone <repo-url> api.plexcord.club && cd api.plexcord.club
npm install                  # also generates the Prisma client
cp .env.example .env         # fill it in, see below
npx prisma migrate deploy    # create the tables
npm run dev                  # http://localhost:3000
```

### Environment

| Variable | What it is |
| --- | --- |
| `DATABASE_URL` | `mysql://user:password@host:3306/database` |
| `CLIENT_ID`, `CLIENT_SECRET` | From your application in the [Discord Developer Portal](https://discord.com/developers/applications). |
| `REDIRECT_URI` | `https://<your domain>/v1/oauth/callback`. Add the same URL under **OAuth2 → Redirects**. |

## Deploying

The app runs as a plain Node.js process behind a reverse proxy. Ready-made files for a **systemd + HestiaCP (nginx)** server are in [`deploy/`](deploy).

```bash
npm ci
npx prisma migrate deploy
npm run build
npm start -- -H 127.0.0.1 -p 9876
```

1. **Keep the project out of the web root.** Put it next to `public_html`, not inside it, so `.env` is never served as a file.
2. **systemd:** edit the user and paths in [`deploy/api-plexcord-club.service`](deploy/api-plexcord-club.service), copy it to `/etc/systemd/system/`, then `systemctl enable --now api-plexcord-club`. The unit runs `node` directly (no package manager in between) and makes the filesystem read-only except `.next/`. All data lives in the database.
3. **nginx:** copy [`deploy/hestia/plexcord-api.tpl`](deploy/hestia/plexcord-api.tpl) and [`plexcord-api.stpl`](deploy/hestia/plexcord-api.stpl) to `/usr/local/hestia/data/templates/web/nginx/` and choose `plexcord-api` as the domain's proxy template. They forward every path to the app and allow 11 MB requests (nginx's default of 1 MB would block large syncs). nginx handles HTTPS; the app only listens on `127.0.0.1`.

**Updating:** `git pull && npm ci && npx prisma migrate deploy && npm run build`, then restart the service.

### Moving from the old JSON storage

Earlier versions kept data in `data/users.json` and `settings/*.json`. Import them once:

```bash
npm run import-json -- /path/to/old/project
```

It is safe to run again. Users whose old secret was stored in plaintext keep their data but have to link their account again. Delete the old folders once the import is checked.

## API

Every endpoint except the two OAuth ones needs:

```http
Authorization: base64("<secret>:<discord user id>")
```

| | |
| --- | --- |
| `GET /v1/oauth/settings` | `{ clientId, redirectUri }` for the client's authorize window |
| `GET /v1/oauth/callback?code=…` | `{ secret }` for the linked Discord account |
| `POST /v2/sync` | Body `{ client_manifest, uploads }`; returns `{ server_manifest, downloads, uploaded, errors }` |
| `GET /v2/manifest` | `{ entries: [{ key, version, checksum }] }` |
| `DELETE /v2/data/:key` | Deletes one key |
| `GET` / `PUT` / `DELETE /v1/settings` | Legacy blob; `GET` uses `ETag` / `If-None-Match` |
| `DELETE /v1/` | Erases the user and all their data |

CORS is allowed for Discord's origins only (stable, PTB, Canary).

## Security

- **Secrets** are 32 random bytes. The database stores only their SHA-256, compared in constant time.
- **Discord IDs** in the `Authorization` header must be snowflakes; anything else is rejected before the database is touched.
- **Uploads** are checked against their checksum and size, and each user has a storage limit.
- **OAuth errors** are logged with Discord's reply only, never with the client secret.

Found a vulnerability? Please report it privately to the maintainers instead of opening a public issue.

## Development

| Command | |
| --- | --- |
| `npm run dev` | Development server |
| `npm run build`, `npm start` | Production build and server |
| `npm test` | Unit tests for auth parsing, secret checks, checksums, upload validation and sync |
| `npm run import-json -- <dir>` | One-time import from the old JSON storage |

```
src/
├── app/            route handlers
│   ├── v1/            account link, legacy sync, erase
│   ├── v2/            sync, manifest, delete key
│   └── quoter/        quote list
├── lib/            database, auth and sync logic
└── proxy.ts        CORS
prisma/             schema and migrations
scripts/            JSON import
deploy/             systemd unit and nginx templates
public/             privacy and GDPR pages
```

## License

GNU Affero General Public License v3.0, see [LICENSE](LICENSE).
