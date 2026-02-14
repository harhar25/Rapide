# Rapide Worker API (Cloudflare)

This Worker is the only backend for the Electron/React app.

## D1 vs R2 (important)

- **D1** is a SQL database (SQLite). Your app tables live here.
- **R2** is object storage (files/blobs). It is *not* a SQL database.

If you want to store uploads (PDFs/images/signatures), use **R2 for files** and store the file key/metadata in **D1**.

## Using your existing Cloud D1 database

This repo is already configured to bind the Worker to a **cloud D1** database via `wrangler.toml`:

- `[[d1_databases]]`
- `binding = "DB"`
- `database_name = "aftersalesdesktop"`
- `database_id = "..."`

### Option A: Develop locally but use the **cloud** D1

Run Wrangler in **remote** mode:

```bash
npm run dev
```

Notes:
- `npm run dev` uses `wrangler dev --remote`.
- Your Worker still runs at `http://127.0.0.1:8787` locally, but **DB queries hit the cloud D1**.

If you want the frontend to call your local `wrangler dev` port, set:

- `REACT_APP_API_BASE=http://127.0.0.1:8787`

### Option B: Deploy to Cloudflare (cloud Worker + cloud D1)

```bash
npx wrangler deploy
```

Wrangler will print a `*.workers.dev` URL.

To make the frontend call the deployed Worker, set:

- `REACT_APP_API_BASE=https://<your-worker>.<your-subdomain>.workers.dev`

(Recommended in `frontend/.env.production` for packaged builds.)

## If your D1 already has tables

You do **not** need to run migrations.

If you *do* want to apply the schema file (safe because it uses `CREATE TABLE IF NOT EXISTS`):

```bash
npx wrangler d1 execute aftersalesdesktop --remote --file ./migrations/0001_init.sql
```
