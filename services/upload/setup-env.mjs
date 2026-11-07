// One-time helper: sets the two public (non-secret) env vars on the linked Vercel project.
// Run from services/upload:  node setup-env.mjs
// Add your production app origin to ORIGINS later (comma-separated) and re-run with --force.
import { spawnSync } from "node:child_process";

const VARS = {
  CLERK_ISSUER: "https://tender-moose-9438.clerk.accounts.dev",
  ALLOWED_ORIGINS: "http://localhost:3000",
};

const force = process.argv.includes("--force");
for (const [name, value] of Object.entries(VARS)) {
  const args = ["env", "add", name, "production", "--value", value, "--yes", ...(force ? ["--force"] : [])];
  console.log(`> vercel env add ${name} production`);
  // shell: true so Windows finds vercel.cmd; the values contain no shell metacharacters.
  const result = spawnSync("vercel", args, { stdio: "inherit", shell: true });
  if (result.status !== 0) {
    console.error(`Failed to set ${name}.`);
    process.exit(result.status ?? 1);
  }
}
console.log("Done. Next: vercel blob create-store zubli-media --access public, then vercel deploy --prod");
