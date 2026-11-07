# Zubli upload service

A single Vercel Function (`api/upload.ts`) that mints Vercel Blob client-upload tokens. The main app is a static
export and cannot host server code, so this is deployed as its **own Vercel project** (root directory
`services/upload`).

## Deploy
1. Vercel dashboard > Add New > Project > import this repo, set **Root Directory** to `services/upload`.
2. Create a **public Blob** store (`vercel blob create-store <name> --access public`) and connect it to the project (dashboard > project > Storage). This adds `BLOB_STORE_ID` and `BLOB_WEBHOOK_PUBLIC_KEY`; the function authenticates to Blob with Vercel OIDC, so no read-write token is stored.
3. Environment variables:
   - `CLERK_ISSUER` = your Clerk Frontend API URL (e.g. `https://tender-moose-9438.clerk.accounts.dev`)
   - `ALLOWED_ORIGINS` = comma-separated app origins (e.g. `http://localhost:3000,https://your-app-domain`)
4. Deploy, then put `https://<project>.vercel.app/api/upload` in the app's `.env.local` as
   `NEXT_PUBLIC_UPLOAD_API_URL`.

## Rules enforced
Valid Clerk session token required; uploads limited to `post-media/<your-user-id>/<file>`, image/webp|jpeg|png, 5 MB.
