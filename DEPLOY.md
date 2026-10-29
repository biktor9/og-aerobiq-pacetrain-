# Deploying PaceTrain to Cloudflare Workers

PaceTrain runs on Cloudflare as a Worker built by [OpenNext](https://opennext.js.org/cloudflare),
with **D1** as the database. Everything below is copy-pasteable.

> Why D1 and not the SQLite file: a Worker has no filesystem and cannot load
> native modules, so `better-sqlite3` can only run locally. The app picks its
> driver from `DATABASE_DRIVER` (set to `d1` in `wrangler.jsonc`), and every query
> is written the same way for both. `npm run dev` keeps using the file.

---

## 0. Once, on your machine

```powershell
cd C:\path\to\pacetrain
npm install
npx wrangler login          # opens the browser, authorises wrangler
```

`wrangler login` stores a token for your Cloudflare account; nothing else on the
machine changes.

## 1. Create the database

```powershell
npx wrangler d1 create pacetrain
```

It prints something like:

```
[[d1_databases]]
binding = "DB"
database_name = "pacetrain"
database_id = "1c4b1fd3-6c3d-4a6a-9f36-2a4c6b7a1e22"
```

Copy **`database_id`** into `wrangler.jsonc`, replacing the all-zeros placeholder:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "pacetrain",
    "database_id": "1c4b1fd3-6c3d-4a6a-9f36-2a4c6b7a1e22",
    "migrations_dir": "drizzle"
  }
]
```

## 2. Create the tables in that database

The Drizzle migrations in `./drizzle` are plain SQLite DDL, so wrangler applies
them directly:

```powershell
npm run db:migrate:d1
```

Expected: ten migrations (`0000` … `0009`) with a ✅ each. Run it again any time
you add a migration locally (`npm run db:generate`), **before** deploying code
that needs the new columns.

Check it worked:

```powershell
npx wrangler d1 execute pacetrain --remote --command "select name from sqlite_master where type = 'table' order by name"
```

You should see `user`, `session`, `activities`, `planned_sessions`, `wellness`,
`sick_notes`, `user_settings`, `icu_credentials`, `chat_messages`, … and
`d1_migrations` (wrangler's own bookkeeping).

## 3. Add the secrets

Three values never belong in `wrangler.jsonc`; wrangler stores them encrypted.

```powershell
# signs sessions — generate a fresh one:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
npx wrangler secret put BETTER_AUTH_SECRET

# encrypts stored intervals.icu and DeepSeek keys — 32 bytes, base64:
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
npx wrangler secret put ENCRYPTION_KEY

# optional: lets the coach answer. Skip it and the coach works from the plan only.
npx wrangler secret put DEEPSEEK_API_KEY
```

Each command asks you to paste the value. **Keep `ENCRYPTION_KEY` forever**: if it
changes, every stored intervals.icu key and DeepSeek key becomes unreadable and
you have to enter them again on `/settings`.

## 4. Point the app at its own URL

`BETTER_AUTH_URL` must be the address people open, with `https://` and no
trailing slash. In `wrangler.jsonc`:

```jsonc
"vars": {
  "DATABASE_DRIVER": "d1",
  "BETTER_AUTH_URL": "https://pacetrain.<your-subdomain>.workers.dev",
  ...
}
```

`npx wrangler whoami` prints your subdomain. If you later add a custom domain
(§7), change this line to that domain and deploy again — otherwise sign-in fails
with an origin mismatch.

## 5. Deploy

```powershell
npm run deploy
```

That runs `opennextjs-cloudflare build` (Next build + Worker bundle) and uploads
it. At the end wrangler prints the live URL. Expect **~1.8 MB gzipped**, inside
the 3 MB free-tier limit.

First visit:

1. Open the URL, sign up with your own address.
2. Because `ADMIN_EMAILS` in `wrangler.jsonc` contains your address, that account
   gets the `admin` role.
3. `/billing` → *Grant access* to switch your own period on, or set
   `"PAYWALL_ENABLED": "false"` while you are setting things up.
4. `/settings` → connect intervals.icu (athlete id + API key).

## 6. Local Worker preview (optional but useful)

`npm run dev` uses the SQLite file. To test the *Worker* locally, with a local D1:

```powershell
copy .dev.vars.example .dev.vars    # fill in BETTER_AUTH_SECRET + ENCRYPTION_KEY
npm run db:migrate:d1:local         # tables in the local D1 simulation
npm run preview                     # builds and runs on http://127.0.0.1:8787
```

`.dev.vars` is gitignored. Its `BETTER_AUTH_URL` must match the port wrangler
prints (`http://127.0.0.1:8787` by default) or better-auth rejects the request as
cross-origin.

## 7. Custom domain

Cloudflare dashboard → **Workers & Pages** → `pacetrain` → **Settings** →
**Domains & Routes** → *Add custom domain*. The DNS record is created for you
because the domain is already on Cloudflare.

Then set `BETTER_AUTH_URL` to `https://your.domain` and `npm run deploy` again.

## 8. Day-to-day

| Task | Command |
| --- | --- |
| Deploy a change | `npm run deploy` |
| New migration | `npm run db:generate`, then `npm run db:migrate:d1`, then deploy |
| Follow logs | `npx wrangler tail` |
| Read the database | `npx wrangler d1 execute pacetrain --remote --command "select count(*) from activities"` |
| Undo a bad write | D1 **Time travel** in the dashboard, or `npx wrangler d1 time-travel restore pacetrain --timestamp=...` |
| Email through Resend | `npx wrangler secret put RESEND_API_KEY`, then set `EMAIL_TRANSPORT` to `resend` and `EMAIL_FROM` in `wrangler.jsonc` |

## Known limitations on Workers

- **Time zone.** Workers run in UTC, so "today" and the Monday that starts the week
  are UTC days on the deployed app (locally it uses your machine's clock). Late in
  the evening a Swedish athlete may see the next day as "today"; import a date
  range instead of "today" if that matters. A per-athlete time zone setting would
  fix it properly.
- **`better-sqlite3` in the bundle.** Its JavaScript is carried inside the Worker
  (esbuild inlines it), but the D1 path never constructs it, so nothing calls into
  it. That is where most of the 1.8 MB comes from. If you ever need the last
  couple of hundred kilobytes, the fix is a second entry point that never imports
  the SQLite branch — more build plumbing than it is worth today.
- **D1 free tier:** 5 GB storage, 5 million rows read and 100 000 rows written per
  day. Plenty for one athlete; a full year of GPS traces is a few megabytes.
- **No filesystem.** Anything that writes files (exports, local caches) has to use
  D1, R2 or KV instead.
