import { issueSignedToken } from "@vercel/blob";
import { handleUploadPresigned, type HandleUploadPresignedBody } from "@vercel/blob/client";
import { createRemoteJWKSet, jwtVerify } from "jose";

/**
 * Issues Vercel Blob client-upload tokens to signed-in Zubli users.
 * Lives outside the static-export app because it needs a server (Blob token + token minting).
 *
 * Env (set in the Vercel project):
 *   BLOB_STORE_ID, BLOB_WEBHOOK_PUBLIC_KEY  added automatically when a Blob store is connected to the project
 *     (auth to Blob uses Vercel OIDC, so no long-lived read-write token is stored)
 *   CLERK_ISSUER           Clerk Frontend API URL, e.g. https://tender-moose-9438.clerk.accounts.dev
 *   ALLOWED_ORIGINS        comma-separated app origins, e.g. http://localhost:3000,https://zubli.app
 */

const MAX_BYTES = 5 * 1024 * 1024; // the app compresses before upload; this is a hard server-side cap
const CONTENT_TYPES = ["image/webp", "image/jpeg", "image/png"];
const FILE_NAME = /^[A-Za-z0-9._-]{1,100}\.(webp|jpe?g|png)$/i;

const issuer = process.env.CLERK_ISSUER?.replace(/\/$/, "");
const jwks = issuer ? createRemoteJWKSet(new URL(`${issuer}/.well-known/jwks.json`)) : null;
const allowedOrigins = (process.env.ALLOWED_ORIGINS ?? "http://localhost:3000")
  .split(",")
  .map((o) => o.trim())
  .filter(Boolean);

function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
    "Access-Control-Max-Age": "600",
    Vary: "Origin",
  };
  if (origin && allowedOrigins.includes(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

function json(request: Request, body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders(request) });
}

/** Returns the Clerk user id (`sub`) of a valid session token, or null. */
async function authenticate(request: Request): Promise<string | null> {
  if (!jwks || !issuer) return null;
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, jwks, { issuer });
    return typeof payload.sub === "string" ? payload.sub : null;
  } catch {
    return null;
  }
}

export function OPTIONS(request: Request) {
  return new Response(null, { status: 204, headers: corsHeaders(request) });
}

export async function POST(request: Request) {
  const origin = request.headers.get("origin");
  if (origin && !allowedOrigins.includes(origin)) return json(request, { error: "Origin not allowed" }, 403);

  const userId = await authenticate(request);
  if (!userId) return json(request, { error: "Unauthorized" }, 401);

  let body: HandleUploadPresignedBody;
  try {
    body = (await request.json()) as HandleUploadPresignedBody;
  } catch {
    return json(request, { error: "Invalid body" }, 400);
  }

  try {
    const result = await handleUploadPresigned({
      request,
      body,
      getSignedToken: async (pathname) => {
        // Users may only write inside their own folder: post-media/<userId>/<file>
        const prefix = `post-media/${userId}/`;
        if (!pathname.startsWith(prefix) || !FILE_NAME.test(pathname.slice(prefix.length))) {
          throw new Error("Invalid upload path");
        }
        const token = await issueSignedToken({
          pathname,
          operations: ["put"],
          allowedContentTypes: CONTENT_TYPES,
          maximumSizeInBytes: MAX_BYTES,
          validUntil: Date.now() + 5 * 60 * 1000,
        });
        return { token };
      },
    });
    return json(request, result);
  } catch (error) {
    return json(request, { error: error instanceof Error ? error.message : "Upload failed" }, 400);
  }
}
