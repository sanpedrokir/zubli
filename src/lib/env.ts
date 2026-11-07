// Public (browser-safe) configuration only. Never put DATABASE_URL or Clerk secret keys here.
export const env = {
  clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
  neonDataApiUrl: process.env.NEXT_PUBLIC_NEON_DATA_API_URL ?? "",
  // Name of the Clerk JWT template that adds `"role": "authenticated"` for Neon.
  clerkNeonTemplate: process.env.NEXT_PUBLIC_CLERK_NEON_JWT_TEMPLATE ?? "neon",
};
